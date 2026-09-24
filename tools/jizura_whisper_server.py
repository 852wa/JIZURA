#!/usr/bin/env python3
"""Local Whisper server for JIZURA's 自動で同期 (lyric auto-sync). See docs/LYRICS_SYNC.md.

It speaks the protocol of whisper.cpp's `whisper-server`, which the editor calls:
  POST /inference   multipart form: file (audio), response_format=verbose_json, language (optional)
                    -> {"text", "language", "segments": [{start, end, text, no_speech_prob, avg_logprob,
                        words: [{word, start, end, probability}]}]}
  GET  /            the JIZURA page from this repository (same origin, so Safari works too)

usage:
  pip install mlx-whisper        # Apple Silicon
  pip install faster-whisper     # Windows / Linux / Intel Mac (uses CUDA when present)
  python3 tools/jizura_whisper_server.py [--port 8080] [--model large-v3-turbo] [--backend auto|mlx|faster]
  then open http://127.0.0.1:8080/ (or the published page) and press 自動で同期.

The server listens on 127.0.0.1 only: the song never leaves this computer.
The first run downloads the model (large-v3-turbo: about 1.6 GB).
"""
import argparse
import email.parser
import email.policy
import functools
import http.server
import json
import os
import re
import sys
import tempfile
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MLX_REPOS = {'large-v3-turbo': 'mlx-community/whisper-large-v3-turbo', 'large-v3': 'mlx-community/whisper-large-v3-mlx',
             'medium': 'mlx-community/whisper-medium-mlx', 'small': 'mlx-community/whisper-small-mlx'}
# Settings that held up on sung Japanese: no carry-over of the previous text (it feeds hallucinations
# through instrumental breaks), and a stricter no-speech / repetition cut than the defaults.
DECODE = dict(word_timestamps=True, condition_on_previous_text=False, no_speech_threshold=0.4, compression_ratio_threshold=2.6)


def pick_backend(name):
    if name in ('auto', 'mlx'):
        try:
            import mlx_whisper  # noqa: F401
            return 'mlx'
        except ImportError:
            if name == 'mlx':
                sys.exit('mlx-whisper is not installed: pip install mlx-whisper')
    try:
        import faster_whisper  # noqa: F401
        return 'faster'
    except ImportError:
        sys.exit('No Whisper backend found. Install one:\n  pip install mlx-whisper      (Apple Silicon)\n'
                 '  pip install faster-whisper   (Windows / Linux / Intel Mac)')


class Whisper:
    def __init__(self, backend, model, vad):
        self.backend, self.model_name, self.vad = backend, model, vad
        self.model = None
        self.lock = threading.Lock()

    def transcribe(self, path, language):
        lang = None if language in (None, '', 'auto') else language
        with self.lock:                      # one song at a time; the model is not re-entrant
            if self.backend == 'mlx':
                import mlx_whisper
                r = mlx_whisper.transcribe(path, path_or_hf_repo=MLX_REPOS.get(self.model_name, self.model_name), language=lang, **DECODE)
                segs = [{'start': s['start'], 'end': s['end'], 'text': s['text'], 'no_speech_prob': s.get('no_speech_prob', 0),
                         'avg_logprob': s.get('avg_logprob', 0),
                         'words': [{'word': w['word'], 'start': w['start'], 'end': w['end'], 'probability': w.get('probability', 0)}
                                   for w in s.get('words', [])]} for s in r['segments']]
                return {'text': r.get('text', ''), 'language': r.get('language', lang), 'segments': segs}
            from faster_whisper import WhisperModel
            if self.model is None:
                self.model = WhisperModel(self.model_name, device='auto', compute_type='auto')   # int8 on CPU, float16 on CUDA
            it, info = self.model.transcribe(path, language=lang, vad_filter=self.vad, **DECODE)
            segs = [{'start': s.start, 'end': s.end, 'text': s.text, 'no_speech_prob': s.no_speech_prob, 'avg_logprob': s.avg_logprob,
                     'words': [{'word': w.word, 'start': w.start, 'end': w.end, 'probability': w.probability} for w in (s.words or [])]}
                    for s in it]
            return {'text': ''.join(s['text'] for s in segs), 'language': info.language, 'segments': segs}


class Handler(http.server.SimpleHTTPRequestHandler):
    whisper = None
    origins = ()

    def log_message(self, fmt, *a):
        pass

    def cors(self):
        origin = self.headers.get('Origin')
        if origin and self.allowed(origin):
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Private-Network', 'true')

    def allowed(self, origin):
        return origin in self.origins or re.fullmatch(r'http://(127\.0\.0\.1|localhost)(:\d+)?', origin) is not None

    def reply(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path.split('?')[0] != '/inference':
            return self.reply(404, {'error': 'not found'})
        host = (self.headers.get('Host') or '').rsplit(':', 1)[0]
        if host not in ('127.0.0.1', 'localhost'):         # refuse DNS-rebinding tricks
            return self.reply(403, {'error': 'use http://127.0.0.1'})
        origin = self.headers.get('Origin')
        if origin and not self.allowed(origin):
            return self.reply(403, {'error': f'origin {origin} is not allowed (add it with --allow-origin)'})
        size = int(self.headers.get('Content-Length') or 0)
        if not 0 < size <= 300 << 20:
            return self.reply(413, {'error': 'send one song (up to 300 MB)'})
        raw = self.rfile.read(size)
        msg = email.parser.BytesParser(policy=email.policy.HTTP).parsebytes(
            b'Content-Type: ' + self.headers.get('Content-Type', '').encode() + b'\r\n\r\n' + raw)
        fields, audio, suffix = {}, None, '.wav'
        for part in msg.iter_parts():
            name = part.get_param('name', header='content-disposition')
            if name == 'file':
                audio = part.get_payload(decode=True)
                suffix = os.path.splitext(part.get_filename() or 'a.wav')[1] or '.wav'
            elif name:
                fields[name] = (part.get_payload(decode=True) or b'').decode('utf-8', 'replace').strip()
        if not audio:
            return self.reply(400, {'error': 'no "file" field'})
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(audio)
        t0 = time.time()
        try:
            out = self.whisper.transcribe(f.name, fields.get('language'))
        except Exception as e:  # report to the editor rather than dropping the connection
            return self.reply(500, {'error': str(e)})
        finally:
            os.unlink(f.name)
        n = sum(len(s['words']) for s in out['segments'])
        print(f'transcribed {len(audio) / 1e6:.1f} MB in {time.time() - t0:.0f}s: {len(out["segments"])} segments, {n} words', flush=True)
        self.reply(200, out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--port', type=int, default=8080)
    ap.add_argument('--model', default='large-v3-turbo', help='large-v3-turbo (default), large-v3, medium, small, or a model path / repo id')
    ap.add_argument('--backend', default='auto', choices=['auto', 'mlx', 'faster'])
    ap.add_argument('--vad', action='store_true', help='faster-whisper only: skip non-vocal passages with Silero VAD')
    ap.add_argument('--allow-origin', action='append', default=[], metavar='URL',
                    help='another page allowed to call this server, e.g. https://you.github.io (repeatable)')
    a = ap.parse_args()
    backend = pick_backend(a.backend)
    Handler.whisper = Whisper(backend, a.model, a.vad)
    Handler.origins = ('https://852wa.github.io', 'null', *a.allow_origin)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', a.port), functools.partial(Handler, directory=ROOT))
    print(f'JIZURA Whisper server ({backend}, {a.model}) on http://127.0.0.1:{a.port}/  — Ctrl+C to stop', flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
