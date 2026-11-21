"""Run with: python3 -m unittest discover -s tools -p test_translate_ko.py"""
from contextlib import contextmanager
from copy import deepcopy
from http.server import BaseHTTPRequestHandler, HTTPServer
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch

import translate_ko as translate


def fixture():
    sources = {
        'BODY': {'保存': '保存'},
        'UI': {"'保存'": "'保存'"},
        'EXPORT': {"`書き出し ${count}`": "`書き出し ${count}`"},
        'STYLES': {'plain': ['標準', '白い文字']},
        'MOODS': {'calm': '穏やか'},
        'PARTS': {'trans': {'sweep': '流しディゾルブ'}},
    }
    current = {
        'BODY': {'保存': '저장'},
        'UI': {"'保存'": "'저장'"},
        'EXPORT': {"`書き出し ${count}`": "`내보내기 ${count}`"},
        'STYLES': {'plain': ['기본', '흰색 글자']},
        'MOODS': {'calm': '차분함'},
        'SAMPLE': '한국어 가사', 'TITLE': 'JIZURA', 'DESCRIPTION': '한국어 설명',
        'PARTS': {'trans': {'sweep': '흐르는 디졸브'}},
        'SOURCE_HASHES': {
            'STYLES': {'plain': translate.source_hash(sources['STYLES']['plain'])},
            'MOODS': {'calm': translate.source_hash(sources['MOODS']['calm'])},
            'PARTS': {'trans': {'sweep': translate.source_hash(sources['PARTS']['trans']['sweep'])}},
        },
    }
    return current, sources


@contextmanager
def api(answer):
    """A local endpoint exercises the real HTTP request and response validation."""
    requests = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            payload = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            requests.append((self.path, self.headers['Authorization'], payload))
            response = {'choices': [{'message': {'content': answer(payload, len(requests))}}]}
            encoded = json.dumps(response).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def log_message(self, *args):
            pass

    server = HTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    settings = {
        'TRANSLATE_API_KEY': 'test-key',
        'TRANSLATE_API_URL': f'http://127.0.0.1:{server.server_port}/v1',
        'TRANSLATE_MODEL': 'test-model',
    }
    try:
        with patch.dict(os.environ, settings):
            yield requests
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


class TranslationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'app').mkdir()
        (self.root / 'src').mkdir()
        self.path = self.root / 'app/i18n_ko.py'
        self.current, self.sources = fixture()
        self.path.write_text(translate.serialize_catalog(self.current), encoding='utf-8')
        (self.root / 'app/body.html').write_text('<button>保存</button>', encoding='utf-8')
        (self.root / 'src/12_ui.js').write_text("const label = '保存';", encoding='utf-8')
        (self.root / 'src/11_export.js').write_text('const count = 1; const label = `書き出し ${count}`;', encoding='utf-8')
        self.output = patch('sys.stdout', new_callable=io.StringIO)
        self.output.start()
        self.addCleanup(self.output.stop)

    def test_current_manual_edits_do_not_call_api_or_rewrite_file(self):
        self.current['PARTS']['trans']['sweep'] = '사람이 교정한 이름'
        self.path.write_text(translate.serialize_catalog(self.current), encoding='utf-8')
        before = self.path.read_bytes()
        with patch('urllib.request.urlopen', side_effect=AssertionError('Unexpected network')):
            self.assertEqual(translate.update_catalog(self.path, self.sources, root=self.root), 0)
        self.assertEqual(before, self.path.read_bytes())

    def test_changes_to_stable_keys_and_new_ui_are_detected(self):
        self.sources['PARTS']['trans']['sweep'] = '新しいディゾルブ'
        self.sources['UI']["'停止'"] = "'停止'"
        candidate, pending = translate.plan_updates(self.current, self.sources)
        self.assertEqual({path for path, _ in pending}, {('PARTS', 'trans', 'sweep'), ('UI', "'停止'")})
        self.assertEqual(candidate['BODY']['保存'], '저장')
        self.assertEqual(candidate['SOURCE_HASHES']['PARTS']['trans']['sweep'], translate.source_hash('新しいディゾルブ'))

    def test_check_needs_no_credentials_and_writes_nothing(self):
        self.sources['PARTS']['trans']['sweep'] = '新しい名前'
        before = self.path.read_bytes()
        with patch.dict(os.environ, {}, clear=True), patch('urllib.request.urlopen', side_effect=AssertionError('Unexpected network')):
            self.assertEqual(translate.update_catalog(self.path, self.sources, check=True, root=self.root), 1)
        self.assertEqual(before, self.path.read_bytes())

    def test_removed_sources_and_hashes_are_pruned_without_api(self):
        self.sources['PARTS']['trans'] = {}
        self.sources['STYLES'] = {}
        self.sources['MOODS'] = {}
        with patch('urllib.request.urlopen', side_effect=AssertionError('Unexpected network')):
            self.assertEqual(translate.update_catalog(self.path, self.sources, root=self.root), 0)
        result = translate.load_catalog(self.path)
        self.assertEqual(result['PARTS'], {'trans': {}})
        self.assertEqual(result['SOURCE_HASHES'], {'STYLES': {}, 'MOODS': {}, 'PARTS': {'trans': {}}})

    def test_collect_sources_keeps_active_community_phrases_and_removes_stale(self):
        (self.root / 'app/english.py').write_text("BODY = {'保存':'Save','古い':'Old'}\nUI = {}\nEXPORT = {}\n", encoding='utf-8')
        self.current['BODY'].update({'追加': '추가', '削除済み': '삭제됨'})
        (self.root / 'app/body.html').write_text('保存 追加', encoding='utf-8')
        labels = {'styles': {}, 'moods': {}, 'groups': {}}
        with patch('subprocess.check_output', return_value=json.dumps(labels)):
            sources = translate.collect_sources(self.current, self.root)
        self.assertEqual(sources['BODY'], {'保存': '保存', '追加': '追加'})

    def test_http_update_only_sends_changed_entries_and_persists_hash(self):
        self.sources['PARTS']['trans']['sweep'] = '新しいディゾルブ'
        with api(lambda payload, count: json.dumps({'0': '새 디졸브'})) as requests:
            self.assertEqual(translate.update_catalog(self.path, self.sources, root=self.root), 0)
        self.assertEqual(len(requests), 1)
        path, auth, payload = requests[0]
        self.assertEqual(path, '/v1/chat/completions')
        self.assertEqual(auth, 'Bearer test-key')
        self.assertEqual(payload['model'], 'test-model')
        self.assertEqual(json.loads(payload['messages'][1]['content']), {
            '0': {'context': 'PARTS.trans.sweep', 'source': '新しいディゾルブ'}})
        result = translate.load_catalog(self.path)
        self.assertEqual(result['PARTS']['trans']['sweep'], '새 디졸브')
        self.assertEqual(result['SOURCE_HASHES']['PARTS']['trans']['sweep'], translate.source_hash('新しいディゾルブ'))
        self.assertEqual(result['BODY'], self.current['BODY'])

    def test_later_batch_failure_keeps_original_file(self):
        self.sources['PARTS']['trans'] = {f'new{i}': f'新しい効果{i}' for i in range(31)}
        before = self.path.read_bytes()

        def answer(payload, count):
            if count == 2:
                return '{"wrong-id":"번역"}'
            return json.dumps({key: '새 효과' for key in json.loads(payload['messages'][1]['content'])})

        with api(answer) as requests:
            with self.assertRaisesRegex(ValueError, 'exactly the requested'):
                translate.update_catalog(self.path, self.sources, root=self.root)
        self.assertEqual(len(requests), 2)
        self.assertEqual(before, self.path.read_bytes())

    def test_corrupt_javascript_is_rejected_before_write(self):
        self.sources['UI']["'新しい'"] = "'新しい'"
        before = self.path.read_bytes()
        with api(lambda payload, count: json.dumps({'0': "'새 이름'; alert('injected')"})):
            with self.assertRaises(ValueError):
                translate.update_catalog(self.path, self.sources, root=self.root)
        self.assertEqual(before, self.path.read_bytes())

    def test_non_display_attribute_and_placeholder_changes_are_rejected(self):
        cases = [
            ('<button id="save">保存</button>', '<button id="other">저장</button>'),
            ('title="保存" value="save"', 'title="저장" value="other"'),
            ('`書き出し ${count}`', '`내보내기 ${other}`'),
            ('`${a}と${b}`', '`${a}와${a}`'),
            ("'名前\\n'", "'이름'"),
            ('説明 https://example.com/page', '설명 https://example.com/other'),
        ]
        for source, translated in cases:
            with self.subTest(source=source), self.assertRaises(ValueError):
                translate.validate_copy(source, translated)

    def test_existing_korean_grammar_and_dictionary_prefixes_are_valid(self):
        cases = [
            ('`${j + 1} / ${H.list.length} 案目`', '`${H.list.length}개 중 ${j + 1}번째 안`'),
            ("`範囲：${a}${b ? '〜' + b : ''}行目`", "`범위: ${a}${b ? '~' + b : ''}줄`"),
            ('`スタイル：', '`스타일: '),
            ('`雰囲気：', '`분위기: '),
            ("'（' + tbl[k].tags", "' (' + tbl[k].tags"),
            ("`文字を${tall ? '上下' : '左右'}に置きます`", "`글자를${tall ? '상하' : '좌우'}에 놓습니다`"),
            ('<input id="x" title="説明" aria-label="名前">', '<input id="x" title="설명" aria-label="이름">'),
        ]
        for source, translated in cases:
            with self.subTest(source=source):
                translate.validate_copy(source, translated)

    def test_duplicate_response_keys_are_rejected(self):
        with api(lambda payload, count: '{"0":"첫 번째","0":"두 번째"}') as requests:
            with self.assertRaisesRegex(ValueError, 'repeats a key'):
                translate.request_translations([(('MOODS', 'calm'), '穏やか')], (
                    os.environ['TRANSLATE_API_KEY'], os.environ['TRANSLATE_API_URL'], os.environ['TRANSLATE_MODEL']))
        self.assertEqual(len(requests), 1)


if __name__ == '__main__':
    unittest.main()
