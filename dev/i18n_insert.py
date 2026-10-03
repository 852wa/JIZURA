"""Insert the auto-timing strings into the per-edition translation modules.

The browser editions replace Japanese copy with a glossary, so every new string has to
exist in app/i18n_<code>.py as well as app/english.py (which is written by hand). This
script is the mechanical half: it appends the entries to BODY and UI of the modules
under app/, leaving the Japanese source and english.py alone.

usage: python dev/i18n_insert.py [--check]
       --check only reports which keys are missing, without writing.
"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# key -> {code: translation}. The key is the Japanese source string, exactly as it
# appears in app/body.html or src/12_ui.js.
BODY = [
    ('自動で時間を合わせる', {
        'zh-Hans': '自动对齐时间', 'zh-Hant': '自動對齊時間', 'ko': '자동으로 시간 맞추기',
        'id': 'Selaraskan waktu otomatis', 'vi': 'Tự động khớp thời gian'}),
    ('<button id="btnAutoTime" title="曲をブラウザの中で解析して、歌詞の各行の開始時刻を自動で合わせます。音声は送信しません。初回だけ認識モデルをダウンロードします">自動で時間を合わせる</button>', {
        'zh-Hans': '<button id="btnAutoTime" title="在浏览器里分析这首歌，自动对齐每行歌词的开始时间。音频不会被上传，只在第一次下载识别模型">自动对齐时间</button>',
        'zh-Hant': '<button id="btnAutoTime" title="在瀏覽器裡分析這首歌，自動對齊每行歌詞的開始時間。音訊不會上傳，只在第一次下載辨識模型">自動對齊時間</button>',
        'ko': '<button id="btnAutoTime" title="브라우저 안에서 곡을 분석해 가사 각 줄의 시작 시간을 자동으로 맞춥니다. 음성은 전송되지 않고, 처음 한 번만 인식 모델을 내려받습니다">자동으로 시간 맞추기</button>',
        'id': '<button id="btnAutoTime" title="Analisis lagu ini di dalam peramban dan selaraskan waktu mulai setiap baris lirik secara otomatis. Audio tidak diunggah; model pengenalan hanya diunduh sekali">Selaraskan waktu otomatis</button>',
        'vi': '<button id="btnAutoTime" title="Phân tích bài hát ngay trong trình duyệt và tự động khớp thời gian bắt đầu từng dòng lời. Âm thanh không bị tải lên; mô hình nhận dạng chỉ tải một lần đầu">Tự động khớp thời gian</button>'}),
    ('aria-label="認識モデル"', {
        'zh-Hans': 'aria-label="识别模型"', 'zh-Hant': 'aria-label="辨識模型"', 'ko': 'aria-label="인식 모델"',
        'id': 'aria-label="Model pengenalan"', 'vi': 'aria-label="Mô hình nhận dạng"'}),
    ('認識モデル<select id="autoModel"', {
        'zh-Hans': '识别模型<select id="autoModel"', 'zh-Hant': '辨識模型<select id="autoModel"',
        'ko': '인식 모델<select id="autoModel"', 'id': 'Model pengenalan<select id="autoModel"',
        'vi': 'Mô hình nhận dạng<select id="autoModel"'}),
    ('Tiny 42MB 速い', {
        'zh-Hans': 'Tiny 42MB 最快', 'zh-Hant': 'Tiny 42MB 最快', 'ko': 'Tiny 42MB 가장 빠름',
        'id': 'Tiny 42MB tercepat', 'vi': 'Tiny 42MB nhanh nhất'}),
    ('Base 76MB おすすめ', {
        'zh-Hans': 'Base 76MB 推荐', 'zh-Hant': 'Base 76MB 推薦', 'ko': 'Base 76MB 권장',
        'id': 'Base 76MB disarankan', 'vi': 'Base 76MB đề xuất'}),
    ('Small 250MB 高精度', {
        'zh-Hans': 'Small 250MB 高精度', 'zh-Hant': 'Small 250MB 高精度', 'ko': 'Small 250MB 고정밀',
        'id': 'Small 250MB paling akurat', 'vi': 'Small 250MB chính xác nhất'}),
    ('ダウンロードしたモデルはこのブラウザに保存され、次回からは読み込みません。', {
        'zh-Hans': '下载的模型会保存在这个浏览器里，下次不再下载。',
        'zh-Hant': '下載的模型會保存在這個瀏覽器裡，下次不再下載。',
        'ko': '내려받은 모델은 이 브라우저에 저장되어 다음부터는 받지 않습니다.',
        'id': 'Model yang diunduh disimpan di peramban ini dan tidak diunduh lagi.',
        'vi': 'Mô hình đã tải được lưu trong trình duyệt này và sẽ không tải lại.'}),
    ('音声は送信しません。解析はこの端末の中で行います', {
        'zh-Hans': '音频不会上传，分析在这台设备上进行',
        'zh-Hant': '音訊不會上傳，分析在這台裝置上進行',
        'ko': '음성은 전송하지 않습니다. 분석은 이 기기 안에서 합니다',
        'id': 'Audio tidak diunggah; analisis berjalan di perangkat ini',
        'vi': 'Âm thanh không được tải lên; phân tích chạy trên thiết bị này'}),
]

UI = [
    ("'準備しています…'", {
        'zh-Hans': "'正在准备…'", 'zh-Hant': "'正在準備…'", 'ko': "'준비하고 있습니다…'",
        'id': "'Menyiapkan…'", 'vi': "'Đang chuẩn bị…'"}),
    ("'認識ライブラリを読み込んでいます…'", {
        'zh-Hans': "'正在加载识别库…'", 'zh-Hant': "'正在載入辨識函式庫…'", 'ko': "'인식 라이브러리를 불러오는 중…'",
        'id': "'Memuat pustaka pengenalan…'", 'vi': "'Đang tải thư viện nhận dạng…'"}),
    ("'音を調べています…'", {
        'zh-Hans': "'正在分析声音…'", 'zh-Hant': "'正在分析聲音…'", 'ko': "'소리를 살펴보는 중…'",
        'id': "'Memeriksa audionya…'", 'vi': "'Đang xem xét âm thanh…'"}),
    ("'先に曲を読み込んでください'", {
        'zh-Hans': "'请先导入歌曲'", 'zh-Hant': "'請先匯入歌曲'", 'ko': "'먼저 곡을 불러오세요'",
        'id': "'Muat lagunya lebih dulu'", 'vi': "'Hãy tải bài hát trước'"}),
    ("'先に歌詞を入れてください'", {
        'zh-Hans': "'请先输入歌词'", 'zh-Hant': "'請先輸入歌詞'", 'ko': "'먼저 가사를 입력하세요'",
        'id': "'Isi liriknya lebih dulu'", 'vi': "'Hãy nhập lời trước'"}),
    ("'この版では自動タイミングを使えません'", {
        'zh-Hans': "'这个版本无法使用自动对齐'", 'zh-Hant': "'這個版本無法使用自動對齊'",
        'ko': "'이 버전에서는 자동 타이밍을 쓸 수 없습니다'",
        'id': "'Penyelarasan otomatis tidak tersedia di edisi ini'", 'vi': "'Bản này không có tính năng khớp thời gian tự động'"}),
    ("'自動タイミングを中止しました'", {
        'zh-Hans': "'已取消自动对齐'", 'zh-Hant': "'已取消自動對齊'", 'ko': "'자동 타이밍을 중단했습니다'",
        'id': "'Penyelarasan otomatis dihentikan'", 'vi': "'Đã dừng khớp thời gian tự động'"}),
    ("'自動タイミングに失敗しました（コンソールに詳細）'", {
        'zh-Hans': "'自动对齐失败（详情见控制台）'", 'zh-Hant': "'自動對齊失敗（詳情見主控台）'",
        'ko': "'자동 타이밍에 실패했습니다(자세한 내용은 콘솔에)'",
        'id': "'Penyelarasan otomatis gagal (lihat konsol untuk detail)'",
        'vi': "'Khớp thời gian tự động thất bại (xem bảng điều khiển để biết chi tiết)'"}),
    ("'できませんでした: '", {
        'zh-Hans': "'没有成功：'", 'zh-Hant': "'沒有成功：'", 'ko': "'실패했습니다: '",
        'id': "'Tidak berhasil: '", 'vi': "'Không thành công: '"}),
    ("`認識モデルを準備しています（${p.device === 'webgpu' ? 'WebGPU' : 'CPU'}・約${p.mb}MB）…`", {
        'zh-Hans': "`正在准备识别模型（${p.device === 'webgpu' ? 'WebGPU' : 'CPU'} · 约 ${p.mb}MB）…`",
        'zh-Hant': "`正在準備辨識模型（${p.device === 'webgpu' ? 'WebGPU' : 'CPU'} · 約 ${p.mb}MB）…`",
        'ko': "`인식 모델을 준비하는 중(${p.device === 'webgpu' ? 'WebGPU' : 'CPU'} · 약 ${p.mb}MB)…`",
        'id': "`Menyiapkan model pengenalan (${p.device === 'webgpu' ? 'WebGPU' : 'CPU'}, sekitar ${p.mb}MB)…`",
        'vi': "`Đang chuẩn bị mô hình nhận dạng (${p.device === 'webgpu' ? 'WebGPU' : 'CPU'}, khoảng ${p.mb}MB)…`"}),
    ("`認識モデルをダウンロードしています（約${p.mb}MB）…`", {
        'zh-Hans': '`正在下载识别模型（约 ${p.mb}MB）…`', 'zh-Hant': '`正在下載辨識模型（約 ${p.mb}MB）…`',
        'ko': '`인식 모델을 내려받는 중(약 ${p.mb}MB)…`',
        'id': '`Mengunduh model pengenalan (sekitar ${p.mb}MB)…`',
        'vi': '`Đang tải mô hình nhận dạng (khoảng ${p.mb}MB)…`'}),
    ("`歌詞を聴き取っています…（${p.chunk} / ${p.chunks}）`", {
        'zh-Hans': '`正在听写歌词…（${p.chunk} / ${p.chunks}）`', 'zh-Hant': '`正在聽寫歌詞…（${p.chunk} / ${p.chunks}）`',
        'ko': '`가사를 듣고 있습니다…(${p.chunk} / ${p.chunks})`',
        'id': '`Mendengarkan liriknya… (${p.chunk} / ${p.chunks})`',
        'vi': '`Đang nghe lời bài hát… (${p.chunk} / ${p.chunks})`'}),
    ("`できました（${n}行・一致度 ${cov}%${low ? `・要確認 ${low}行` : ''}）`", {
        'zh-Hans': "`完成了（${n} 行 · 匹配度 ${cov}%${low ? ` · 需确认 ${low} 行` : ''}）`",
        'zh-Hant': "`完成了（${n} 行 · 符合度 ${cov}%${low ? ` · 需確認 ${low} 行` : ''}）`",
        'ko': "`완료했습니다(${n}줄 · 일치도 ${cov}%${low ? ` · 확인 필요 ${low}줄` : ''})`",
        'id': "`Selesai (${n} baris, kecocokan ${cov}%${low ? `, ${low} perlu diperiksa` : ''})`",
        'vi': "`Xong (${n} dòng, độ khớp ${cov}%${low ? `, ${low} dòng cần xem lại` : ''})`"}),
    ("`${n}行の時刻を入れました。一致度の低い ${low} 行は赤く表示しています（行ごとに直せます）`", {
        'zh-Hans': '`已为 ${n} 行填入时间。匹配度低的 ${low} 行用红色标出（可以逐行修改）`',
        'zh-Hant': '`已為 ${n} 行填入時間。符合度低的 ${low} 行用紅色標出（可以逐行修改）`',
        'ko': '`${n}줄의 시간을 넣었습니다. 일치도가 낮은 ${low}줄은 빨갛게 표시했습니다(줄마다 고칠 수 있습니다)`',
        'id': '`Waktu ${n} baris sudah diisi. ${low} baris dengan kecocokan rendah ditandai merah (bisa diperbaiki per baris)`',
        'vi': '`Đã điền thời gian cho ${n} dòng. ${low} dòng có độ khớp thấp được tô đỏ (sửa được từng dòng)`'}),
    ("`${n}行の時刻を入れました。再生して確かめて、気になる行だけ直してください`", {
        'zh-Hans': '`已为 ${n} 行填入时间。播放确认一下，只改需要调整的行`',
        'zh-Hant': '`已為 ${n} 行填入時間。播放確認一下，只改需要調整的行`',
        'ko': '`${n}줄의 시간을 넣었습니다. 재생해 확인하고 신경 쓰이는 줄만 고치세요`',
        'id': '`Waktu ${n} baris sudah diisi. Putar untuk memeriksa dan perbaiki baris yang perlu saja`',
        'vi': '`Đã điền thời gian cho ${n} dòng. Phát lại để kiểm tra và chỉ sửa những dòng cần thiết`'}),
    ("'曲をブラウザの中で解析して、歌詞の各行の開始時刻を求めます。'", {
        'zh-Hans': "'在浏览器里分析这首歌，求出每行歌词的开始时间。'",
        'zh-Hant': "'在瀏覽器裡分析這首歌，求出每行歌詞的開始時間。'",
        'ko': "'브라우저 안에서 곡을 분석해 가사 각 줄의 시작 시간을 구합니다.'",
        'id': "'Lagu ini dianalisis di dalam peramban untuk mencari waktu mulai setiap baris lirik.'",
        'vi': "'Bài hát được phân tích trong trình duyệt để tìm thời gian bắt đầu từng dòng lời.'"}),
    ("'・音声は送信しません（解析はこの端末の中で行います）'", {
        'zh-Hans': "'・音频不会上传（分析在这台设备上进行）'",
        'zh-Hant': "'・音訊不會上傳（分析在這台裝置上進行）'",
        'ko': "'・음성은 전송하지 않습니다(분석은 이 기기 안에서 합니다)'",
        'id': "'・Audio tidak diunggah (analisis berjalan di perangkat ini)'",
        'vi': "'・Âm thanh không được tải lên (phân tích chạy trên thiết bị này)'"}),
    ("`・初回は認識モデル（約${mb}MB）をダウンロードします。2回目からは不要です`", {
        'zh-Hans': '`・第一次会下载识别模型（约 ${mb}MB），第二次起不再需要`',
        'zh-Hant': '`・第一次會下載辨識模型（約 ${mb}MB），第二次起不再需要`',
        'ko': '`・처음 한 번 인식 모델(약 ${mb}MB)을 내려받습니다. 두 번째부터는 필요 없습니다`',
        'id': '`・Pertama kali mengunduh model pengenalan (sekitar ${mb}MB). Setelah itu tidak perlu lagi`',
        'vi': '`・Lần đầu tải mô hình nhận dạng (khoảng ${mb}MB). Từ lần sau không cần nữa`'}),
    ("'・曲の長さによっては数分かかります'", {
        'zh-Hans': "'・根据歌曲长度，可能需要几分钟'", 'zh-Hant': "'・依歌曲長度，可能需要幾分鐘'",
        'ko': "'・곡 길이에 따라 몇 분 걸릴 수 있습니다'",
        'id': "'・Tergantung panjang lagu, bisa perlu beberapa menit'",
        'vi': "'・Tùy độ dài bài hát, có thể mất vài phút'"}),
    ("'始めますか？'", {
        'zh-Hans': "'要开始吗？'", 'zh-Hant': "'要開始嗎？'", 'ko': "'시작할까요?'",
        'id': "'Mulai?'", 'vi': "'Bắt đầu chứ?'"}),
    ("'・自動タイミングの一致度が低い行です。再生して確かめてください'", {
        'zh-Hans': "'・这行的自动对齐匹配度较低，请播放确认'",
        'zh-Hant': "'・這行的自動對齊符合度較低，請播放確認'",
        'ko': "'・자동 타이밍의 일치도가 낮은 줄입니다. 재생해 확인하세요'",
        'id': "'・Kecocokan penyelarasan otomatis untuk baris ini rendah — putar dan periksa'",
        'vi': "'・Độ khớp của khớp thời gian tự động cho dòng này thấp — hãy phát lại và kiểm tra'"}),
]

MODULES = {'zh-Hans': 'app/i18n_zh_hans.py', 'zh-Hant': 'app/i18n_zh_hant.py', 'ko': 'app/i18n_ko.py',
           'id': 'app/i18n_id.py', 'vi': 'app/i18n_vi.py'}


def quote(k, v):
    """both key and value as single-quoted Python strings.

    Some of the UI keys are template literals in the JavaScript source, and the older
    entries were written into the modules as bare backtick expressions. That only works
    while the literal has no character Python dislikes; writing them as quoted strings
    every time is the version that cannot break the module."""
    key = "'" + k.replace('\\', '\\\\').replace("'", "\\'") + "'"
    return f'    {key}: {v},\n'


def insert(text, section, entries):
    """append entries before the closing brace of `section`"""
    start = re.search(r'^' + section + r' = \{$', text, re.M)
    if not start:
        raise SystemExit(f'no {section} in this module')
    end = text.index('\n}', start.end())
    head = text[:end]
    # the entries are written uniformly, so whatever is added has to satisfy the same
    # rule: every key ends in a comma, including the last one of the block
    lines = head.rstrip().split('\n')
    if lines and not lines[-1].rstrip().endswith(','):
        lines[-1] = lines[-1].rstrip() + ','
    return '\n'.join(lines) + '\n' + '\n'.join(entries) + text[end:]


def main():
    check = '--check' in sys.argv
    for code, path in MODULES.items():
        with io.open(path, encoding='utf-8') as f:
            text = f.read()
        # a key that starts with a backtick is written into the file as a quoted string
        # too (the grammar of the replacement only needs the Japanese text to match)
        def has(k):
            k = "'" + k + "'"
            return k in text
        missing_body = [k for k, tr in BODY if not has(k)]
        missing_ui = [k for k, tr in UI if not has(k)]
        print(f'{code:8s} missing BODY {len(missing_body):2d}  UI {len(missing_ui):2d}')
        if check or (not missing_body and not missing_ui):
            continue
        add_body = [quote(k, "'" + tr[code].replace('\\', '\\\\').replace("'", "\\'") + "'") for k, tr in BODY if k in missing_body]
        add_ui = [quote(k, "'" + tr[code].replace('\\', '\\\\').replace("'", "\\'") + "'") for k, tr in UI if k in missing_ui]
        if add_body:
            text = insert(text, 'BODY', add_body)
        if add_ui:
            text = insert(text, 'UI', add_ui)
        with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print(f'         -> wrote {len(add_body)} BODY + {len(add_ui)} UI entries')


main()
