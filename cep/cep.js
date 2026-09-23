/* ============================================================
   JIZURA — After Effects CEP panel bridge
   Runs only inside the AE panel (window.__adobe_cep__). Adds "build the comp in AE",
   "use the song / markers of the selected AE layer", native save dialogs and external links.
   Talks to ../jsx/host.jsx (JZCEP.*) with evalScript; every host call returns JSON.
   ============================================================ */
(() => {
'use strict';
const CEP = window.__adobe_cep__;
if (!CEP) return;
const J = window.J, S = J.ui, UI = J.uiApi || {};
const $ = id => document.getElementById(id);
document.documentElement.classList.add('cep');

// Node.js (enabled in the manifest): cep_node in CEP 8+, or a plain require in mixed context
const nodeReq = (window.cep_node && window.cep_node.require) || (typeof window.require === 'function' ? window.require : null);
const fs = nodeReq ? nodeReq('fs') : null, os = nodeReq ? nodeReq('os') : null, pathM = nodeReq ? nodeReq('path') : null;
const NodeBuffer = (window.cep_node && window.cep_node.Buffer) || (typeof window.Buffer === 'function' ? window.Buffer : null);

const ev = code => new Promise(res => { try { CEP.evalScript(code, r => res(r)); } catch (e) { res('EvalScript error.'); } });
const parse = r => { try { const o = JSON.parse(r); return o && typeof o === 'object' ? o : { ok: false, error: String(r) }; } catch (e) { return { ok: false, error: String(r || 'no answer') }; } };
const toast = m => { try { UI.toast ? UI.toast(m) : console.log(m); } catch (e) {} };
function extRoot() {
  let p = '';
  try { p = decodeURI(CEP.getSystemPath('extension')); } catch (e) {}
  p = p.replace(/^file:\/\//, '');
  if (/^\/[A-Za-z]:/.test(p)) p = p.slice(1);      // Windows: /C:/… -> C:/…
  return p;
}

// ---------------- connection to AE ----------------
let ready = false, connecting = null, aeAudio = null;
function status(m, bad) { document.querySelectorAll('.ae-status').forEach(el => { el.textContent = m; el.classList.toggle('bad', !!bad); }); }
function connect() {
  if (ready) return Promise.resolve(true);
  if (connecting) return connecting;
  connecting = (async () => {
    status('After Effects に接続中…（初回は数秒かかります）');
    const root = extRoot();
    if ((await ev('typeof JZCEP')) !== 'object' && root) await ev('$.evalFile(File(' + JSON.stringify(root + '/jsx/host.jsx') + '))');
    const r = parse(await ev('JZCEP.init(' + JSON.stringify(root) + ')'));
    ready = !!r.ok;
    status(ready ? `After Effects ${String(r.app || '').split('x')[0]} に接続しました` : 'After Effects に接続できませんでした: ' + r.error, !ready);
    connecting = null;
    return ready;
  })();
  return connecting;
}

// ---------------- build the comp ----------------
let building = false;
async function buildInAE() {
  if (building) return;
  if (!(await connect())) { toast('After Effects に接続できませんでした'); return; }
  building = true; setBusy(true);
  try {
    UI.pause && UI.pause();
    const plan = J.planForAE(S.plan, S.project), txt = JSON.stringify(plan);
    const useAudio = aeAudio && (!$('aeAudioIn') || $('aeAudioIn').checked);
    const aid = useAudio ? (aeAudio.id | 0) : 0;
    status(`コンポを作成中…（${plan.cuts.length} カット）`);
    await new Promise(r => setTimeout(r, 30));              // let the status paint before AE blocks
    let r;
    if (fs && os && pathM) {
      const p = pathM.join(os.tmpdir(), 'jizura_plan_' + Date.now() + '.json');
      fs.writeFileSync(p, txt, 'utf8');
      r = parse(await ev('JZCEP.buildFromFile(' + JSON.stringify(p) + ',' + aid + ')'));
    } else {
      r = parse(await ev('JZCEP.buildFromString(' + JSON.stringify(encodeURIComponent(txt)) + ',' + aid + ')'));
    }
    if (r.ok) {
      let m = `「${r.name}」を作成しました（${r.cuts} カット・${(+r.secs).toFixed(1)} 秒${r.audio ? '・曲入り' : ''}）`;
      if (r.fallbacks > 0) m += ` / 近い表現で置換 ${r.fallbacks} 箇所`;
      if (r.notesTotal > 0) m += ` / 注意 ${r.notesTotal} 件`;
      if (r.missingFonts && r.missingFonts.length) m += ` / この PC に無い書体（${r.missingFonts.join('・')}）は近い書体で作りました。Google Fonts から入れて AE を再起動すると、同じ書体になります`;
      if (r.fontCheck === false) m += ' / この AE（2024 より前）では書体の有無を確認できないため、スクリプト版パネルの「フォント」タブの書体（未設定なら游ゴシック・游明朝）で作りました';
      status(m); toast('After Effects にコンポを作成しました');
      if (r.notes && r.notes.length) console.warn('JIZURA AE notes', r.notes);
    } else { status('作成できませんでした: ' + r.error, true); toast('作成できませんでした'); }
  } catch (e) { status('作成できませんでした: ' + (e && e.message ? e.message : e), true); }
  finally { building = false; setBusy(false); }
}
function setBusy(b) { document.querySelectorAll('.ae-build').forEach(el => { el.disabled = b; }); }
async function diagnose() {
  if (!(await connect())) return;
  status('診断中…（数十秒かかることがあります）');
  await new Promise(r => setTimeout(r, 30));
  const r = parse(await ev('JZCEP.diagnose()'));
  if (!r.ok) { status(r.error, true); toast(r.error); return; }
  status(`診断：エクスプレッション ${r.expressions} 個のうちエラー ${r.errors} 個${r.partial ? '（途中まで）' : ''}` + (r.path ? ` / レポート: ${r.path}` : ' / レポートを保存できませんでした（AE の環境設定「スクリプトによるファイルへの書き込み…を許可」をオンに）'));
}

// ---------------- song / markers from the AE timeline ----------------
async function useAEAudio() {
  if (!(await connect())) return;
  const r = parse(await ev('JZCEP.selectedAudio()'));
  if (!r.ok) { toast(r.error); status(r.error, true); return; }
  if (!fs) { toast('このパネルでは曲ファイルを直接読めません。「曲を読み込む」から選んでください'); return; }
  try {
    const buf = fs.readFileSync(r.path), u8 = new Uint8Array(buf.length); u8.set(buf);
    const ok = UI.loadAudioFile ? await UI.loadAudioFile(new File([u8], r.name)) : false;
    if (ok) {
      aeAudio = { id: r.id, name: r.name, start: r.start };
      document.querySelectorAll('.ae-audio-row').forEach(el => { el.hidden = false; });
      document.querySelectorAll('.ae-audio-name').forEach(el => { el.textContent = r.name; });
      toast(`AE の「${r.name}」で拍を合わせました`);
    } else toast('この曲ファイルは読み込めませんでした（wav / mp3 / m4a などを使ってください）');
  } catch (e) { toast('曲ファイルを読めませんでした: ' + e.message); }
}
async function useAEMarkers() {
  if (!(await connect())) return;
  const r = parse(await ev('JZCEP.markers()'));
  if (!r.ok) { toast(r.error); status(r.error, true); return; }
  const n = S.plan.lines.length, lt = {};
  r.times.slice(0, n).forEach((t, i) => { lt[i] = +(+t).toFixed(3); });
  S.project.timing.lineTimes = lt;
  UI.replan && UI.replan(); UI.syncUI && UI.syncUI(); UI.flushSave && UI.flushSave();
  toast(`${r.source === 'layer' ? 'レイヤー' : 'コンポ'}のマーカー ${Object.keys(lt).length} 個を行の開始時刻にしました` + (r.times.length < n ? `（残り ${n - r.times.length} 行は自動）` : ''));
}

// ---------------- UI ----------------
function btn(id, text, cls, fn) { const b = document.createElement('button'); b.id = id; b.textContent = text; if (cls) b.className = cls; b.addEventListener('click', fn); return b; }
function inject() {
  // header: "AE用に書き出し" (JSON) -> build right here
  const hb = $('btnAE');
  if (hb) {
    const nb = hb.cloneNode(true); hb.replaceWith(nb);
    nb.textContent = 'AEでコンポを生成'; nb.title = '今の構成で After Effects にコンポを作ります'; nb.classList.add('ae-build');
    nb.addEventListener('click', buildInAE);
  }
  // song & timing: take them from the AE timeline
  const tim = $('audioFile') && $('audioFile').closest('.row');
  if (tim) {
    const row = document.createElement('div'); row.className = 'row wrap ae-row';
    row.append(btn('aeAudio', 'AEで選択中の曲', 'small', useAEAudio), btn('aeMarkers', 'AEのマーカーを行頭に', 'small', useAEMarkers));
    row.querySelector('#aeAudio').title = 'AE で選択している曲のレイヤーを読み込み、拍に合わせます（コンポを作るときにその曲も入ります）';
    row.querySelector('#aeMarkers').title = '選択レイヤー（無ければコンポ）のマーカーを、各行の開始時刻にします';
    tim.after(row);
  }
  $('audioFile') && $('audioFile').addEventListener('change', () => { aeAudio = null; document.querySelectorAll('.ae-audio-row').forEach(el => { el.hidden = true; }); });
  // easy mode export: AE first
  const eMP4 = $('eMP4');
  if (eMP4) {
    eMP4.classList.remove('primary');
    const box = document.createElement('div'); box.className = 'ae-box';
    box.innerHTML = '<div class="outbtns"></div><label class="row ae-audio-row" hidden><input type="checkbox" class="ae-audio-in" checked><span>曲（<span class="ae-audio-name"></span>）をコンポに入れる</span></label><p class="note ae-status">—</p>';
    box.querySelector('.outbtns').append(btn('eAEBuild', 'After Effects にコンポを作る', 'primary ae-build', buildInAE));
    eMP4.closest('.outbtns').before(box);
  }
  // pro mode: an After Effects block at the top of the output tab
  const pane = document.querySelector('[data-pane="out"]');
  if (pane) {
    const box = document.createElement('div'); box.className = 'ae-box';
    box.innerHTML = '<h3>After Effects</h3><div class="outbtns"></div><label class="row ae-audio-row" hidden><input id="aeAudioIn" type="checkbox" class="ae-audio-in" checked><span>曲（<span class="ae-audio-name"></span>）をコンポに入れる</span></label><p class="note ae-status">—</p><h3>動画・画像</h3>';
    box.querySelector('.outbtns').append(btn('aeBuild', 'AEでコンポを生成', 'primary ae-build', buildInAE), btn('aeDiag', '診断レポートを保存', 'small', diagnose));
    box.querySelector('#aeDiag').title = '最後に作ったコンポを調べて JIZURA_report.txt を保存します（うまく作れないときに送ってください）';
    pane.prepend(box);
    const m = $('btnMP4'); m && m.classList.remove('primary');
  }
  // keep the two "include the song" checkboxes in step
  document.querySelectorAll('.ae-audio-in').forEach(cb => cb.addEventListener('change', () => { document.querySelectorAll('.ae-audio-in').forEach(o => { o.checked = cb.checked; }); }));
  const style = document.createElement('style');
  style.textContent = '.ae-row{margin-top:8px;gap:6px}.ae-box{margin-bottom:12px}.ae-box h3{margin:0 0 8px}.ae-status{margin-top:8px}.ae-status.bad{color:#ff8a80;border-left-color:#ff8a80}';
  document.head.appendChild(style);
}

// ---------------- native save dialog + external links ----------------
const origSave = J.saveFile;
J.saveFile = async (filename, data) => {
  const cfs = window.cep && window.cep.fs;
  if (!cfs || typeof cfs.showSaveDialogEx !== 'function' || !fs) return origSave(filename, data);
  let res;
  try { res = cfs.showSaveDialogEx('保存', '', [filename.split('.').pop()], filename); } catch (e) { return origSave(filename, data); }
  const p = res && res.data;
  if (!p) return 'declined';
  const blob = data instanceof Blob ? data : new Blob([data]);
  const u8 = new Uint8Array(await blob.arrayBuffer());
  fs.writeFileSync(p, NodeBuffer ? NodeBuffer.from(u8) : u8);
  toast('保存しました: ' + p);
  return 'saved';
};
document.addEventListener('click', e => {
  const a = e.target && e.target.closest ? e.target.closest('a[href^="http"]') : null;
  if (!a) return;
  e.preventDefault();
  try { window.cep.util.openURLInDefaultBrowser(a.href); } catch (err) {}
}, true);

// the app binds its own buttons on DOMContentLoaded — add ours after that
const start = () => { inject(); connect(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0)); else setTimeout(start, 0);
J.cep = { connect, buildInAE, useAEAudio, useAEMarkers, diagnose, ev };
})();
