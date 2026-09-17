"""Loopback-only backend; explicit public-file allowlist keeps .env/logs private."""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from ai_service import ROOT, ServiceError, configuration, explain_selection
from slide_search import search_slides

PUBLIC = {'/': ('index.html', 'text/html'), '/index.html': ('index.html', 'text/html'),
          '/app.js': ('app.js', 'text/javascript'), '/styles.css': ('styles.css', 'text/css')}
SLIDE_FILES = {
    'd1-slide-hackathon.pdf': ROOT / 'K4-3A-Day05-06-AI-Product-Hackathon' / 'data' / 'vlearn-pack' / 'slides' / 'd1-slide-hackathon.pdf',
    'd2-slide-hackathon.pdf': ROOT / 'K4-3A-Day05-06-AI-Product-Hackathon' / 'data' / 'vlearn-pack' / 'slides' / 'd2-slide-hackathon.pdf',
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Do not print request content or attacker-controlled paths.

    def reply(self, status, data, mime='application/json', allow_frame=False):
        body = data if isinstance(data, bytes) else json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', mime + '; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        frame_policy = "'self'" if allow_frame else "'none'"
        self.send_header('Content-Security-Policy', f"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors {frame_policy}")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def allowed(self):
        port = self.server.server_port
        hosts = {f'127.0.0.1:{port}', f'localhost:{port}'}
        origin = self.headers.get('Origin')
        return self.headers.get('Host') in hosts and (not origin or origin in {f'http://{h}' for h in hosts})

    def do_GET(self):
        if not self.allowed():
            return self.reply(403, {'error': 'forbidden'})
        path = urlsplit(self.path).path
        if path == '/api/health':
            return self.reply(200, {'status': 'ok', 'api_key_configured': bool(configuration()[0])})
        if path.startswith('/api/slides/'):
            filename = path.removeprefix('/api/slides/')
            slide_path = SLIDE_FILES.get(filename)
            if slide_path is None:
                return self.reply(404, {'error': 'not_found'})
            return self.reply(200, slide_path.read_bytes(), 'application/pdf', allow_frame=True)
        if path not in PUBLIC:
            return self.reply(404, {'error': 'not_found'})
        name, mime = PUBLIC[path]
        self.reply(200, (ROOT / name).read_bytes(), mime)

    def do_POST(self):
        if not self.allowed():
            return self.reply(403, {'error': 'forbidden'})
        if self.path not in {'/api/explain', '/api/search'}:
            return self.reply(404, {'error': 'not_found'})
        try:
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.reply(415, {'error': 'json_required'})
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 200000:
                return self.reply(413, {'error': 'invalid_size'})
            payload = json.loads(self.rfile.read(length))
            if self.path == '/api/search':
                self.reply(200, search_slides(payload))
            else:
                self.reply(200, explain_selection(payload)['result'])
        except ServiceError as exc:
            self.reply(exc.status, {'error': exc.code, 'message': exc.message})
        except (ValueError, UnicodeError):
            self.reply(400, {'error': 'invalid_json', 'message': 'Dữ liệu gửi lên không hợp lệ.'})
        except Exception:
            self.reply(500, {'error': 'internal_error', 'message': 'Backend gặp lỗi. Hãy thử lại.'})


def serve(handler=Handler, default_port=8000):
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=default_port)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    print(f'Local server: http://127.0.0.1:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    serve()
