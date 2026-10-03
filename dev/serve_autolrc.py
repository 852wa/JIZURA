"""Serve dev/www plus the test audio over HTTP, and mirror the model files from
Hugging Face on first use so a slow link is paid for once.

usage: python dev/serve_autolrc.py [port] [samples-dir]
The page under test reads ?audio=...&truth=...&model=... from dev/www/autolrc.html.

The test audio is not in the repository (the real songs used to check the timing are
copyrighted), so the directory it is served from defaults to $JIZURA_SAMPLES, or to
dev/samples, and can be given as the second argument.
"""
import http.server
import os
import socketserver
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(ROOT, 'dev', 'www')
SAMPLES = os.environ.get('JIZURA_SAMPLES') or os.path.join(ROOT, 'dev', 'samples')
MIRROR = os.path.join(WWW, 'mirror')
HF = 'https://huggingface.co'


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean = path.split('?', 1)[0].split('#', 1)[0]
        if clean.startswith('/mirror/'):
            return os.path.join(WWW, clean.lstrip('/').replace('/', os.sep))
        if clean.startswith('/samples/'):
            return os.path.join(SAMPLES, clean[len('/samples/'):].replace('/', os.sep))
        return os.path.join(WWW, clean.lstrip('/').replace('/', os.sep))

    def do_GET(self):
        clean = self.path.split('?', 1)[0]
        if clean.startswith('/mirror/') and not os.path.exists(self.translate_path(clean)):
            if self.mirror(clean):
                pass
            else:
                self.send_error(502, 'mirror failed')
                return
        return super().do_GET()

    def mirror(self, clean):
        rel = clean[len('/mirror/'):]
        dest = os.path.join(MIRROR, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        url = HF + '/' + rel
        try:
            with urllib.request.urlopen(url, timeout=120) as r, open(dest, 'wb') as f:
                total = 0
                while True:
                    block = r.read(1 << 16)
                    if not block:
                        break
                    f.write(block)
                    total += len(block)
                    if total % (8 << 20) < (1 << 16):
                        print(f'  mirror {rel}: {total / 1e6:.1f} MB', flush=True)
            print(f'mirror done {rel} {os.path.getsize(dest) / 1e6:.2f} MB', flush=True)
            return True
        except (urllib.error.URLError, OSError) as e:
            print(f'mirror FAIL {url}: {e}', flush=True)
            if os.path.exists(dest):
                os.remove(dest)
            return False

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        if self.path.startswith('/mirror/'):
            return
        sys.stderr.write('%s\n' % (fmt % args))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8791
    if len(sys.argv) > 2:
        SAMPLES = sys.argv[2]
    os.makedirs(MIRROR, exist_ok=True)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(('127.0.0.1', port), Handler) as httpd:
        print(f'serving {WWW} + {SAMPLES} + mirror on http://127.0.0.1:{port}/', flush=True)
        httpd.serve_forever()
