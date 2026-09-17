#!/usr/bin/env python3
"""Validate and run a compact golden-set evaluation for the VLearn Tutor CP3 feature."""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ai_service import configuration, explain_selection
DEFAULT_DATASET = ROOT / 'eval' / 'golden_set.json'
RESULTS_ROOT = ROOT / 'eval' / 'results'
REQUIRED_KEYS = {'course_context', 'original_question', 'original_answer', 'selected_text', 'expected_action'}
ACTIONS = {'explain', 'clarify', 'no_grounding', 'refuse'}


def load_dataset(path: Path):
    try:
        payload = json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError as exc:
        raise FileNotFoundError(f'Không tìm thấy file golden set: {path}') from exc
    if not isinstance(payload, list):
        raise ValueError('Golden set phải là một mảng JSON.')
    validated = []
    for index, item in enumerate(payload, start=1):
        if not isinstance(item, dict):
            raise ValueError(f'Case #{index} không phải object JSON.')
        missing = sorted(REQUIRED_KEYS - set(item))
        if missing:
            raise ValueError(f'Case #{index} thiếu trường: {missing}')
        if item['expected_action'] not in ACTIONS:
            raise ValueError(f'Case #{index} has invalid expected_action {item["expected_action"]!r}')
        for key in ('course_context', 'original_question', 'original_answer', 'selected_text'):
            if not isinstance(item[key], str):
                raise ValueError(f'Case #{index} field {key!r} must be a string.')
        if not item['selected_text'].strip():
            raise ValueError(f'Case #{index} selected_text không được rỗng.')
        if item['selected_text'].strip() not in item['original_answer']:
            raise ValueError(f'Case #{index} selected_text không nằm trong original_answer.')
        validated.append(item)
    return validated


def write_jsonl(path: Path, records):
    with path.open('a', encoding='utf-8') as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + '\n')


def markdown_cell(value):
    return str(value or '-').replace('|', '\\|').replace('\n', ' ')


def build_report(summary, records, run_label):
    lines = [
        '# CP3 Golden Eval Report',
        '',
        f'- Total cases: {summary["total"]}',
        f'- Matched: {summary["matched"]}',
        f'- Mismatched: {summary["mismatched"]}',
        f'- Errors: {summary["errors"]}',
        f'- Accuracy: {summary["accuracy"]:.2%}',
        f'- Run label: {run_label}',
        '',
        '## Per-action summary',
        '',
    ]
    if summary['by_action']:
        for key in sorted(summary['by_action']):
            value = summary['by_action'][key]
            lines.append(f'- {key}: {value["matched"]}/{value["total"]} matched')
    else:
        lines.append('- No runs executed.')
    lines.extend(['', '## Per-case record', '', '| Case | Expected | Actual | Status | Category | Reason |', '|---|---|---|---|---|---|'])
    for record in records:
        lines.append('| ' + ' | '.join(markdown_cell(record[key]) for key in ('case_id', 'expected_action', 'actual_action', 'status', 'category', 'reason')) + ' |')
    lines.extend(['', '## Failure groups', ''])
    groups = {}
    for record in records:
        if record['status'] != 'matched':
            groups[record['category']] = groups.get(record['category'], 0) + 1
    if groups:
        lines.extend(f'- {category}: {count}' for category, count in sorted(groups.items()))
    else:
        lines.append('- No failures.')
    return '\n'.join(lines) + '\n'


def run_dataset(path: Path, run_label='lượt 1'):
    dataset = load_dataset(path)
    run_id = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    result_dir = RESULTS_ROOT / run_id
    result_dir.mkdir(parents=True, exist_ok=True)
    raw_file = result_dir / 'raw_outputs.jsonl'
    report_file = result_dir / 'report.md'
    table_file = result_dir / 'case_results.md'
    metadata_file = result_dir / 'run_metadata.json'
    raw_file.write_text('', encoding='utf-8')
    key, model = configuration()
    metadata_file.write_text(json.dumps({
        'run_label': run_label,
        'run_id_utc': run_id,
        'dataset': str(path),
        'model': model,
        'api_key_configured': bool(key),
        'case_count': len(dataset),
        'baseline_policy': 'Same model and prompt for every case; expected actions are not sent to the model.',
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    summary = {
        'total': len(dataset),
        'matched': 0,
        'mismatched': 0,
        'errors': 0,
        'accuracy': 0.0,
        'by_action': {action: {'total': 0, 'matched': 0} for action in ACTIONS},
    }

    records = []
    for case in dataset:
        normalized = {
            'course_context': case['course_context'],
            'original_question': case['original_question'],
            'original_answer': case['original_answer'],
            'selected_text': case['selected_text'],
        }
        result_record = {
            'case_id': case['id'],
            'expected_action': case['expected_action'],
            'actual_action': None,
            'matched': False,
            'status': 'not_run',
            'category': 'not_run',
            'reason': 'Chưa chạy.',
            'error': None,
        }
        try:
            response = explain_selection(normalized)
            actual_action = response['result'].get('action')
            result_record['actual_action'] = actual_action
            result_record['raw_output'] = response['result']
            if actual_action == case['expected_action']:
                summary['matched'] += 1
                result_record['matched'] = True
                result_record['status'] = 'matched'
                result_record['category'] = 'pass'
                result_record['reason'] = 'Actual action trùng expected action.'
                summary['by_action'][case['expected_action']]['matched'] += 1
            else:
                summary['mismatched'] += 1
                result_record['status'] = 'mismatched'
                result_record['category'] = 'no_clarification' if case['expected_action'] == 'clarify' else 'wrong_action'
                result_record['reason'] = f'Expected {case["expected_action"]}, actual {actual_action}.'
            summary['by_action'][case['expected_action']]['total'] += 1
        except Exception as exc:  # pragma: no cover - surfaced in the per-case record
            result_record['error'] = type(exc).__name__
            result_record['status'] = 'error'
            result_record['category'] = 'technical_error'
            result_record['reason'] = 'Lỗi kỹ thuật khi chạy case; xem error type và log backend.'
            summary['errors'] += 1
            summary['mismatched'] += 1
            summary['by_action'][case['expected_action']]['total'] += 1
        records.append(result_record)
        write_jsonl(raw_file, [result_record])

    summary['accuracy'] = summary['matched'] / summary['total'] if summary['total'] else 0.0
    report_file.write_text(build_report(summary, records, run_label), encoding='utf-8')
    table_file.write_text('\n'.join([
        '# CP3 Case Results', '',
        '| Case | Output | Đạt/Không đạt | Lý do |', '|---|---|---|---|',
        *('| ' + ' | '.join(markdown_cell(record[key]) for key in ('case_id', 'actual_action', 'status', 'reason')) + ' |' for record in records),
        '', 'Technical errors and not-run cases are retained above; no case was omitted.',
    ]) + '\n', encoding='utf-8')
    print(f'Runs: {summary["total"]}')
    print(f'Matched: {summary["matched"]}')
    print(f'Mismatched: {summary["mismatched"]}')
    print(f'Errors: {summary["errors"]}')
    print(f'Accuracy: {summary["accuracy"]:.2%}')
    print(f'Report written to: {report_file}')
    print(f'Case table written to: {table_file}')
    return summary


def validate_only(path: Path):
    dataset = load_dataset(path)
    print(f'Validated dataset: {path}')
    print(f'Case count: {len(dataset)}')
    print('Schema OK')


def main():
    parser = argparse.ArgumentParser(description='Run CP3 golden-set validation for the VLearn Tutor selected-text AI feature.')
    parser.add_argument('--dataset', type=Path, default=DEFAULT_DATASET, help='Path to the golden set JSON file.')
    parser.add_argument('--run-label', default='lượt 1', help='Label stored with this immutable evaluation run.')
    parser.add_argument('--validate-only', action='store_true', help='Only validate the dataset schema and exit.')
    args = parser.parse_args()

    try:
        if args.validate_only:
            validate_only(args.dataset)
            return 0
        summary = run_dataset(args.dataset, args.run_label)
        return 0 if summary['mismatched'] == 0 and summary['errors'] == 0 else 1
    except Exception as exc:  # pragma: no cover - error surfaced to terminal
        print(f'ERROR: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
