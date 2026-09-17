# VLearn CP3 — selected-text explanation

The same screenshot-based CP2 lesson page and layout. **Only “✨ Giải thích đoạn này” calls a real LLM.** Slide search, slide content, initial Tutor answer, ordinary chat input, progress and other CP2 controls remain mocked. No authentication, database, semantic search or new product features.

## Install and configure (Python 3.11+)

From `C:\Users\My PC\OneDrive\Documents\ChatGPT\UI-VLearn-Tutor`:

```powershell
python -m pip install -r requirements.txt
```

Dependencies: `openai==3.13.0`, `python-dotenv==1.2.3`. The servers use Python's standard library; no frontend packages or framework.

Put the key in **`.env` in the project root, beside `server.py`**. If absent, copy `.env.example` to `.env`. Do not overwrite an existing configured file. Set:

```dotenv
OPENAI_API_KEY=your_actual_key_here
OPENAI_MODEL=gpt-4.1-mini
```

The model can be changed to an account-accessible model supporting Responses API structured outputs. Environment variables take precedence over `.env`; restart the backend after changing a previously loaded value. An initially missing key can be added without restarting. Never paste the key into frontend code, browser inputs or chat. `.env` is git-ignored.

## Start backend and frontend

Terminal 1:

```powershell
python server.py
```

Backend: `http://127.0.0.1:8000`. Health: `/api/health` (boolean configuration status only).

Terminal 2:

```powershell
python frontend.py
```

Frontend: **http://127.0.0.1:5173/**. It proxies `/api/explain` to port 8000. Both processes bind only to loopback. Stop with Ctrl+C. Alternatively the backend can serve the same UI directly at port 8000.

**Do not use the old `python -m http.server` command in this project:** a general file server could expose `.env`, logs and evaluation data. The new servers serve only `/`, `index.html`, `styles.css`, and `app.js`. Neither file:// nor a generic static server supports the API route.

## Demo

1. Open the frontend. The original question and answer are CP2 fixtures.
2. Search **embedding là gì** and click the first **Mở slide** result. This opens the sample embedding lesson with sufficient context.
3. Drag-select **vector trong không gian nhiều chiều**, or click the underlined phrase (keyboard Enter also works).
4. Click **✨ Giải thích đoạn này**. A pending message appears while the real API is called.
5. The generated response is appended in the existing Tutor. The original answer remains intact.

The initial title slide deliberately lacks embedding context: selecting the phrase there may produce `no_grounding`. Open the first search result for the grounded demonstration. The exact wording is generated and may vary.

## API behavior

`POST /api/explain`, JSON body with exactly four strings:

```json
{
  "course_context": "Lesson facts...",
  "original_question": "Embedding là gì vậy?",
  "original_answer": "Embedding là một vector trong không gian nhiều chiều.",
  "selected_text": "vector trong không gian nhiều chiều"
}
```

The frontend sends the active mock lesson context, the question associated with the selected answer, that answer's actual text, and the original selection. Request size/field limits and selection membership are checked before calling the model. The model chooses the action; there is no keyword-based action routing for this feature.

Successful response contains exactly `action`, `explanation`, `question`, `message`:

- `explain`: show `explanation` under “Giải thích đơn giản hơn”.
- `clarify`: show `question` asking which concept the user means.
- `no_grounding`: show `message` indicating insufficient course context.
- `refuse`: show `message` indicating an authority boundary.

All four input fields are untrusted data. The system instructions treat course context as factual authority but never as instructions; original answers cannot establish unsupported facts. Structured JSON is validated again in Python. Provider-level refusal is mapped to `refuse` and its raw refusal is preserved in the log. Incomplete/invalid model output and network/authentication failures become visible errors, never fake explanations or fake model decisions. No hidden automatic retries.

Generated text is rendered with `textContent`, never inserted as HTML. Duplicate clicks are suppressed during a call. Reset/new chat cancels the browser wait and prevents stale messages appearing in the new conversation; a provider request already sent may still complete, incur cost, and be logged.

The integration uses the [official OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs) and Responses API with `store=False`. The four fields are sent to OpenAI. This prototype is local-only and is not a production security or moderation boundary.

## Logging

`logs/model_calls.jsonl` contains a `started` and a `completed` record linked by `call_id` for each real attempt. Completed records contain UTC `timestamp`, `selected_text`, `model_action`, raw response output items (including raw generated JSON), `latency_ms`, model, provider response ID when available, and a safe error classification. Failures have null action; they are not counted as model refusals. A started record without completion indicates interruption.

No key, authorization header or raw SDK exception is logged. Secret-like strings and the configured key are redacted even if they occur in user/model text. `logs/` and evaluation outputs are git-ignored and cannot be served by either HTTP server. Logs may contain course/user text, so keep them private. There is no external logging service.

## Golden-set evaluation

Included files:

- `eval/golden_set.json`: **12 synthetic examples, none official**, covering normal, truth_grounding, ambiguity, scope, domain and edge.
- `eval/scoring_rubric.md`: manual qualitative scoring instructions.
- `eval/run_eval.py`: invokes **the exact same `ai_service.explain_selection` function** as the UI backend.
- `eval/run_results.md`: latest run status, not fabricated evidence.

Validate without API calls:

```powershell
python eval/run_eval.py --validate-only
```

Run all cases using real calls (API usage is billed to the configured account; servers need not be running):

```powershell
python eval/run_eval.py
```

Outputs are timestamped under `eval/results/<UTC-run>/raw_outputs.jsonl` and `report.md`. Each case records expected vs actual action, exact action match, raw model output, latency/call ID on success, and any error. The shared call log also records failed/malformed provider responses. The runner continues through all cases and exits nonzero for operational errors. No qualitative PASS/FAIL is invented; every qualitative review starts `NOT_REVIEWED`. The latest summary is written to `eval/run_results.md`; historical runs remain intact.

**Team task:** manually replace at least 10 cases with authorized official-private-dataset-derived cases. Document real provenance in `source`; do not relabel synthetic examples. Prefer an ignored private file:

```powershell
python eval/run_eval.py --dataset eval/private_golden_set.json
```

Only use private dataset material that the team is permitted to send to the configured API. The runner does not verify provenance or claim official evidence. Review response quality manually using the rubric before claiming quality results.

## Engineering checks

```powershell
node --check app.js
python -m unittest discover -s tests -v
python eval/run_eval.py --validate-only
```

Offline unit tests use explicit test doubles and isolated temporary logs. They verify request wiring, schema/action validation, logging/redaction and input boundaries. They are never mixed with real-model evaluation evidence.

## Files changed for CP3

- Updated: `app.js` (real selected-text action), `index.html` (CP3 notes only), `README.md`.
- Added: `ai_service.py`, `server.py`, `frontend.py`, `requirements.txt`, `.env.example`, `.gitignore`, the four `eval/` files, and offline tests in `tests/`.
- Local only: `.env`, `logs/`, generated `eval/results/`.
- `styles.css` and the existing lesson layout remain unchanged.

## Verification performed

The real browser flow returned a generated explanation using `gpt-4.1-mini`. Logging and API-key exclusion from public assets/logs were verified; attempts to fetch `.env`, Python files, logs and evaluation data returned 404. Ten offline engineering tests passed. The real synthetic evaluation run `20260917T025103924594Z` produced 12/12 expected-action matches with zero call errors. Qualitative criteria remain NOT_REVIEWED; these are synthetic examples, not official evidence. An earlier sandbox-restricted run had connection errors and is retained separately rather than presented as successful.
