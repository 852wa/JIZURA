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
    'Tiny 42MB 速い', 'Base 76MB おすすめ', 'Small 250MB 高精度',
    'ダウンロードしたモデルはこのブラウザに保存され、次回からは読み込みません。',
    '音声は送信しません。解析はこの端末の中で行います',
]
ui_wanted = [
    '準備しています…', '認識ライブラリを読み込んでいます…', '音を調べています…',
    '先に曲を読み込んでください', '先に歌詞を入れてください', 'この版では自動タイミングを使えません',
    '自動タイミングを中止しました', '自動タイミングに失敗しました（コンソールに詳細）',
    'できませんでした: ', '認識モデルを準備しています（', '認識モデルをダウンロードしています（',
    '歌詞を聴き取っています…（', 'できました（', '行の時刻を入れました。一致度の低い ',
    '行は赤く表示しています（行ごとに直せます）', '行の時刻を入れました。再生して確かめて、気になる行だけ直してください',
    '・音声は送信しません（解析はこの端末の中で行います）', '・初回は認識モデル（約', 'MB）をダウンロードします。2回目からは不要です',
    '・曲の長さによっては数分かかります', '始めますか？',
]

print('BODY keys present in english.py:')
for w in wanted:
    print(' ', 'OK ' if w in E.BODY else 'MISSING', repr(w))
print('\nUI keys present in english.py:')
for w in ui_wanted:
    print(' ', 'OK ' if w in E.UI else 'MISSING', repr(w))

print('\nper-module coverage:')
for code in i18n.MODULES:
    m = i18n.module(code)
    miss = [w for w in wanted if w not in m.BODY]
    miss_ui = [w for w in ui_wanted if w not in m.UI]
    print(f'  {code:8s} BODY missing {len(miss):3d}  UI missing {len(miss_ui):3d}')
