"""Search the two real VLearn hackathon slide PDFs by page."""
from __future__ import annotations

import json
import math
import re
from pathlib import Path

from openai import OpenAI
from pypdf import PdfReader

from ai_service import configuration

ROOT = Path(__file__).resolve().parent
SLIDES_ROOT = ROOT / 'K4-3A-Day05-06-AI-Product-Hackathon' / 'data' / 'vlearn-pack' / 'slides'
CACHE = ROOT / 'logs' / 'slide_embeddings.json'
EMBEDDING_MODEL = 'text-embedding-3-small'
TOKEN_RE = re.compile(r"[\wÀ-ỹ]+", re.UNICODE)


def _tokens(value: str) -> set[str]:
    return {token.casefold() for token in TOKEN_RE.findall(value)}


def _load_pages() -> list[dict]:
    pages = []
    for pdf_path in sorted(SLIDES_ROOT.glob('*.pdf')):
        reader = PdfReader(str(pdf_path))
        lesson = 'Day 01 · AI & LLM Foundation' if pdf_path.name.startswith('d1-') else 'Day 02 · Xác định bài toán cho AI'
        for page_number, page in enumerate(reader.pages, start=1):
            text = ' '.join((page.extract_text() or '').split())
            if not text:
                continue
            pages.append({
                'id': f'{pdf_path.stem}-p{page_number}',
                'file': pdf_path.name,
                'lesson': lesson,
                'page': page_number,
                'text': text,
                'tokens': sorted(_tokens(text)),
            })
    return pages


PAGES = _load_pages()


def _lexical_search(query: str, limit: int) -> list[dict]:
    query_tokens = _tokens(query)
    scored = []
    for item in PAGES:
        overlap = len(query_tokens & set(item['tokens']))
        if overlap:
            scored.append((overlap / max(1, len(query_tokens)), item))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [_result(item, score, 'keyword') for score, item in scored[:limit]]


def _cosine(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    return dot / (left_norm * right_norm) if left_norm and right_norm else 0.0


def _load_embeddings(key: str, model: str) -> list[list[float]]:
    if CACHE.exists():
        try:
            cached = json.loads(CACHE.read_text(encoding='utf-8'))
            if cached.get('model') == model and [item['id'] for item in cached.get('pages', [])] == [item['id'] for item in PAGES]:
                return [item['embedding'] for item in cached['pages']]
        except (OSError, ValueError, KeyError, TypeError):
            pass
    client = OpenAI(api_key=key, base_url='https://api.openai.com/v1', timeout=45, max_retries=0)
    response = client.embeddings.create(model=model, input=[item['text'] for item in PAGES])
    embeddings = [entry.embedding for entry in sorted(response.data, key=lambda entry: entry.index)]
    try:
        CACHE.parent.mkdir(exist_ok=True)
        CACHE.write_text(json.dumps({'model': model, 'pages': [{'id': item['id'], 'embedding': vector} for item, vector in zip(PAGES, embeddings)]}), encoding='utf-8')
    except OSError:
        pass
    return embeddings


def _result(item: dict, score: float, mode: str) -> dict:
    snippet = item['text'][:360].strip()
    return {'id': item['id'], 'file': item['file'], 'lesson': item['lesson'], 'page': item['page'], 'snippet': snippet, 'text': item['text'], 'score': round(score, 4), 'mode': mode}


def search_slides(payload: dict) -> dict:
    if not isinstance(payload, dict) or set(payload) != {'query'} or not isinstance(payload['query'], str):
        raise ValueError('Cần gửi đúng trường query dạng chuỗi.')
    query = payload['query'].strip()
    if not query or len(query) > 300:
        raise ValueError('Từ khóa tìm kiếm không hợp lệ.')
    limit = 6
    key, _model = configuration()
    if not key:
        return {'results': _lexical_search(query, limit), 'mode': 'keyword', 'source': '2 PDF VLearn'}
    try:
        embeddings = _load_embeddings(key, EMBEDDING_MODEL)
        client = OpenAI(api_key=key, base_url='https://api.openai.com/v1', timeout=30, max_retries=0)
        response = client.embeddings.create(model=EMBEDDING_MODEL, input=query)
        query_vector = response.data[0].embedding
        ranked = sorted(((_cosine(query_vector, vector), item) for item, vector in zip(PAGES, embeddings)), reverse=True, key=lambda pair: pair[0])
        return {'results': [_result(item, score, 'semantic') for score, item in ranked[:limit]], 'mode': 'semantic', 'source': '2 PDF VLearn'}
    except Exception:
        return {'results': _lexical_search(query, limit), 'mode': 'keyword', 'source': '2 PDF VLearn'}
