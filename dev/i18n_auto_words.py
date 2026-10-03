"""Collect the Japanese strings the new auto-timing feature introduces, and report
which translation modules still need them.

usage: python dev/i18n_auto_words.py            (report only)
The pairs are written into app/english.py's BODY glossary (the Japanese phrase to
English) and into each app/i18n_<code>.py module; this script only lists them so the
work is mechanical rather than remembered.
"""
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

from app import english as E, i18n  # noqa: E402

# the strings the feature adds: HTML text first, then the ones only 12_ui.js uses
wanted = [
    '自動で時間を合わせる', '中止', '閉じる', '認識モデル',
    'ダウンロードしたモデルはこのブラウザに保存され、次回からは読み込みません。',
    '音声は送信しません。解析はこの端末の中で行います',
]
ui_wanted = [
    '速い', 'おすすめ', '高精度',
    '準備しています…', '認識ライブラリを読み込んでいます…', '音を調べています…',
    '先に曲を読み込んでください', '先に歌詞を入れてください', 'この版では自動タイミングを使えません',
    '自動タイミングを中止しました', '自動タイミングに失敗しました（コンソールに詳細）',
    'できませんでした: ', '認識モデルを準備しています（', '認識モデルをダウンロードしています（',
    '歌詞を聴き取っています…（', 'できました（', '行の時刻を入れました。一致度の低い ',
    '行は赤く表示しています（行ごとに直せます）', '行の時刻を入れました。再生して確かめて、気になる行だけ直してください',
    '・音声は送信しません（解析はこの端末の中で行います）', '・初回は認識モデル（約', 'MB）をダウンロードします。2回目からは不要です',
    '・曲の長さによっては数分かかります', '始めますか？',
]


def present(keys, text):
    """Some of the strings above are fragments of longer ones (`'・初回は認識モデル（約'`),
    so the test is whether the fragment can be found among the registered keys, not
    whether it is a key itself."""
    return any(text in k for k in keys)


print('strings registered in english.py:')
for w in wanted:
    print(' ', 'OK ' if present(E.BODY, w) else 'MISSING', repr(w))
print('\nUI strings registered in english.py:')
for w in ui_wanted:
    print(' ', 'OK ' if present(E.UI, w) else 'MISSING', repr(w))

print('\nstrings still in Japanese in the built page, per edition')
print('(the two Chinese editions share some words with Japanese — 高精度 is written the same):')
body = open('app/body.html', encoding='utf-8').read()
js = open('src/12_ui.js', encoding='utf-8').read()
for code in i18n.MODULES:
    out_body = i18n.localize_body(code, body)
    out_js = i18n.localize_js(code, js, 'src/12_ui.js')
    miss = [w for w in wanted if w in out_body]
    miss_ui = [w for w in ui_wanted if w in out_js]
    print(f'  {code:8s} untranslated {len(miss) + len(miss_ui):3d}'
          + ('' if not (miss or miss_ui) else '  ' + repr((miss + miss_ui)[:4])))
