/* ============================================================
   JIZURA — editor UI
   ============================================================ */
(() => {
'use strict';
if (!document.getElementById('app')) return;          // engine-only pages (tests)
const $ = id => document.getElementById(id);
const LS_KEY = 'jizura.project.v1';
const HUD_CHARS = '0123456789:./-_()【】・No.LYRICRECUNTITLEDXYlinebpminterlude—─／ ';
const ICON = {
  dice: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="2" width="12" height="12" rx="2"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><circle cx="10.5" cy="10.5" r="1" fill="currentColor"/><circle cx="10.5" cy="5.5" r="1" fill="currentColor"/><circle cx="5.5" cy="10.5" r="1" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>',
};

const S = { project: null, plan: null, audio: null, renderer: new J.Renderer(), playing: false, t: 0, t0: 0, loop: 'all', loopHold: null, need: true, exporting: null, tap: null, slow: false, lineEls: [], curLine: -2 };
const LOOP_CYCLE = ['all', 'line', 'cut', false];
const LOOP_COPY = {
  all:  { ja: 'ループ', en: 'Loop', titleJa: '全体を繰り返し', titleEn: 'Loop the whole piece' },
  line: { ja: '行ループ', en: 'Line loop', titleJa: 'この行を繰り返し', titleEn: 'Loop this line' },
  cut:  { ja: 'カットループ', en: 'Cut loop', titleJa: 'このカットを繰り返し', titleEn: 'Loop this cut' },
  off:  { ja: 'ループ', en: 'Loop', titleJa: '繰り返しなし', titleEn: 'No loop' },
};
const isEn = () => document.documentElement.lang === 'en';
function cutAround(t) {
  const c = J.cutAt(S.plan, t);
  if (c) return c;
  const cs = S.plan.cuts;
  let ans = null;
  for (let i = 0; i < cs.length; i++) { if (cs[i].start <= t) ans = cs[i]; else break; }
  return ans;
}
function loopRange(t) {
  const T = t != null ? t : S.t;
  const endAll = S.plan.duration;
  if (S.loop === 'cut') {
    const cut = cutAround(T);
    return cut ? { start: cut.start, end: cut.end } : { start: 0, end: endAll };
  }
  if (S.loop === 'line') {
    const cut = cutAround(T);
    if (!cut || cut.line < 0) return cut ? { start: cut.start, end: cut.end } : { start: 0, end: endAll };
    const same = S.plan.cuts.filter(c => c.line === cut.line && c.layout !== 'interlude' && c.layout !== 'title');
    if (!same.length) return { start: cut.start, end: cut.end };
    return { start: same[0].start, end: same[same.length - 1].end };
  }
  return { start: 0, end: endAll };
}
function refreshLoopHold(t) {
  S.loopHold = (S.loop === 'line' || S.loop === 'cut') ? loopRange(t != null ? t : S.t) : null;
}
function activeLoopRange() {
  if ((S.loop === 'line' || S.loop === 'cut') && S.loopHold) return S.loopHold;
  return loopRange(S.t);
}
function syncLoopBtn() {
  const b = $('btnLoop'); if (!b) return;
  const key = S.loop || 'off';
  const copy = LOOP_COPY[key] || LOOP_COPY.off;
  const en = isEn();
  b.textContent = en ? copy.en : copy.ja;
  b.title = en ? copy.titleEn : copy.titleJa;
  b.setAttribute('aria-pressed', String(!!S.loop));
  b.dataset.mode = key;
  refreshLoopHold();
}

/* WebAudio player (works inside sandboxed pages where blob media may be blocked) */
const AP = {
  ctx: null, src: null, startAt: 0, gain: null, vol: 0.8, muted: false,
  play(buffer, offset) {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.stop();
    if (!this.gain) { this.gain = this.ctx.createGain(); this.gain.connect(this.ctx.destination); this.applyVol(); }
    const s = this.ctx.createBufferSource(); s.buffer = buffer; s.connect(this.gain);
    const off = Math.max(0, Math.min(offset, buffer.duration - 0.01));
    s.start(0, off); this.src = s; this.startAt = this.ctx.currentTime - off;
  },
  stop() { if (this.src) { try { this.src.stop(); } catch (e) {} try { this.src.disconnect(); } catch (e) {} this.src = null; } },
  time() { return this.ctx ? this.ctx.currentTime - this.startAt : 0; },
  /* preview volume only (exports keep the original level) */
  setVol(v, muted) { if (v != null) this.vol = Math.max(0, Math.min(1, v)); if (muted != null) this.muted = !!muted; this.applyVol(); },
  applyVol() { if (!this.gain) return; const v = this.muted ? 0 : this.vol * this.vol; try { this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.015); } catch (e) { this.gain.gain.value = v; } },
};
/* プレビュー音量: remembered per browser */
function initVolume() {
  const el = $('vol'), mb = $('btnMute'); if (!el || !mb) return;
  let v = 0.8, m = false;
  try { const o = JSON.parse(localStorage.getItem('jizura.previewVolume') || 'null'); if (o) { v = +o.v; m = !!o.m; } } catch (e) {}
  if (!(v >= 0 && v <= 1)) v = 0.8;
  const show = () => { el.value = Math.round(AP.vol * 100); mb.textContent = AP.muted || AP.vol === 0 ? '消音' : '音量'; mb.setAttribute('aria-pressed', String(AP.muted)); el.title = '音量 ' + Math.round(AP.vol * 100) + '%'; };
  const save = () => { try { localStorage.setItem('jizura.previewVolume', JSON.stringify({ v: AP.vol, m: AP.muted })); } catch (e) {} };
  AP.setVol(v, m); show();
  el.addEventListener('input', () => { AP.setVol(el.value / 100, false); show(); save(); });
  mb.addEventListener('click', () => { AP.setVol(null, !AP.muted); show(); save(); });
}

/* ---------------- project persistence ---------------- */
function mergeProject(p) {
  const d = J.defaultProject();
  const o = Object.assign(d, p || {});
  o.fx = Object.assign(J.defaultProject().fx, (p && p.fx) || {});
  o.timing = Object.assign(J.defaultProject().timing, (p && p.timing) || {});
  const en = J.defaultProject().enabled;
  for (const g of Object.keys(en)) en[g] = Object.assign(en[g], ((p && p.enabled) || {})[g] || {});
  o.enabled = en;
  o.overrides = (p && p.overrides) || {};
  o.colors = Object.assign({ enabled: false }, (p && p.colors) || {});
  o.fonts = (p && p.fonts) || {};
  o.userFonts = (p && p.userFonts) || [];
  for (const uf of o.userFonts) if (!J.FONTS[uf.key]) J.addUserFont(uf.key, uf.label, uf.family, uf.weight || 400);
  return o;
}
function setBadges(d) {
  return (d && d.extra ? '<span class="set-badge ex" title="最初の公開版のあとに追加">追加</span>' : '') + (d && d.wa ? '<span class="set-badge" title="和風の演出">和</span>' : '');
}
function loadLocal() { try { const s = localStorage.getItem(LS_KEY); if (s) return mergeProject(JSON.parse(s)); } catch (e) {} return mergeProject(null); }
let saveTimer = 0;
function autosave() { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 700); }
function flushSave() { clearTimeout(saveTimer); try { localStorage.setItem(LS_KEY, JSON.stringify(S.project)); } catch (e) {} }
window.addEventListener('pagehide', () => { if (S.project) flushSave(); });

/* ---------------- planning ---------------- */
function audioLike() {
  const T = S.project.timing;
  if (S.audio) {
    const a = Object.assign({}, S.audio);
    if (T.bpm > 0) a.beats = J.beatGrid(T.bpm, T.beatOffset || 0, S.audio.duration);
    return a;
  }
  if (T.bpm > 0) return { beats: J.beatGrid(T.bpm, T.beatOffset || 0, 600) };
  return null;
}
/* 自動判定のとき、判定結果を言語欄の横に出す */
function langNote() {
  const el = $('langNote'); if (!el) return;
  el.textContent = (S.project.lang || 'auto') === 'auto' ? '→ ' + J.LANG_LABEL[J.resolveLang(S.project)] : '';
  if (langNote.last !== undefined && langNote.last !== J.lang) { try { renderFontRoles(); } catch (e) {} }   // font menus show the language's faces
  langNote.last = J.lang;
}
function replan() {
  S.plan = J.plan(S.project, audioLike());
  langNote();
  if (S.t > S.plan.duration) S.t = 0;
  refreshLoopHold();
  renderLines(); sizeViewport(); drawTimeline(); updateTimeUI();
  lastCutIdx = -2;
  if (typeof cutPick !== 'undefined' && cutPick.g) fillCutPick();
  S.need = true; autosave(); ensureFonts(); drawSwatch(); showNow();
  clearTimeout(warmTimer); warmTimer = setTimeout(warm, 450);
}
/* pre-decompose glyphs used by piece animations while the editor is idle, so playback does not hitch */
let warmTimer = 0, warmJob = 0;
function warm() {
  const job = ++warmJob;
  const cuts = S.plan.cuts.filter(c => c.enter === 'assemble' || ['explode', 'fall', 'drift'].includes(c.exit));
  const src = $('view');
  const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
  const ctx = cv.getContext('2d');
  let i = 0;
  const idle = window.requestIdleCallback ? (f) => window.requestIdleCallback(f, { timeout: 400 }) : (f) => setTimeout(() => f(null), 40);
  const step = (deadline) => {
    if (job !== warmJob || S.exporting) return;
    do {
      const c = cuts[i++]; if (!c) break;
      const ts = [];
      if (c.enter === 'assemble') ts.push(c.start + Math.min(c.inDur * 0.3, c.dur * 0.2));
      if (c.outDur > 0) ts.push(c.end - c.outDur * 0.5);
      for (const t of ts) { try { S.renderer.frame(ctx, S.plan, t, { scale: cv.width / S.plan.W, fast: true, noHud: true, noGhost: true }); } catch (e) {} }
    } while (i < cuts.length && deadline && deadline.timeRemaining() > 10);
    if (i < cuts.length) idle(step);
  };
  idle(step);
}
let replanTimer = 0;
const replanSoon = (ms = 220) => { clearTimeout(replanTimer); replanTimer = setTimeout(replan, ms); };
let fontKey = '';
let thumbFonts = null;
async function ensureFonts() {
  const txt = S.project.lyrics + (S.project.title || '') + (S.project.artist || '') + HUD_CHARS;
  const keys = J.fontsOfPlan(S.plan);                       // only the faces this plan draws with
  const key = txt + '|' + keys.join(',') + '|' + Object.keys(J.FONTS).length;
  if (key === fontKey) return;
  fontKey = key;
  showMsg('フォントを読み込み中…');
  try { await J.ensureFonts(txt, keys); } catch (e) {}
  showMsg(null); S.need = true; drawStyleGrid(); loadThumbFonts();
}
// style thumbnails need two glyphs of every style's display face — fetched only once the style grid is actually shown
function loadThumbFonts() {
  if (thumbFonts || !$('styleGrid').offsetParent) return;
  thumbFonts = J.ensureFonts('字面', [...new Set(J.STYLE_ORDER.map(k => J.STYLES[k].fonts.display[0]))]).then(() => drawStyleGrid()).catch(() => {});
}
function showMsg(m) { const el = $('viewMsg'); if (!m) { el.hidden = true; return; } el.textContent = m; el.hidden = false; }

/* ---------------- viewport & drawing ---------------- */
function sizeViewport() {
  const vp = $('viewport'), c = $('view');
  const ar = S.plan.W / S.plan.H;
  let cssW = vp.clientWidth || 800, cssH = cssW / ar;
  const maxH = Math.max(220, window.innerHeight * 0.68);
  if (cssH > maxH) { cssH = maxH; cssW = cssH * ar; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pw = Math.round(Math.min(S.plan.W, cssW * dpr)), ph = Math.round(pw / ar);
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
  c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
  S.need = true;
}
function draw() {
  const c = $('view'), ctx = c.getContext('2d');
  const t0 = performance.now();
  S.renderer.frame(ctx, S.plan, S.t, { scale: c.width / S.plan.W, fast: S.playing && S.slow });
  const dt = performance.now() - t0;
  S.slow = S.playing ? (dt > 30 ? true : dt < 14 ? false : S.slow) : false;
  updateTimeUI(); drawTimeline(); updateCutInfo();
}
function tick(now) {
  requestAnimationFrame(tick);
  if (S.exporting) return;
  if (S.playing) {
    // rAF timestamps can precede the moment play()/seek() stamped t0 → clamp so t never goes negative
    let t = Math.max(0, S.audio ? AP.time() : (now - S.t0) / 1000);
    const range = activeLoopRange();
    if (t >= range.end - 1e-3) {
      if (S.loop && !S.tap) { seek(range.start); t = range.start; }
      else { pause(); t = Math.min(t, S.plan.duration - 1e-3); if (S.tap) stopTap(); }
    }
    S.t = t; S.need = true;
  }
  if (S.need) { S.need = false; draw(); }
}
function updateTimeUI() {
  $('timeNow').textContent = J.fmtTime(S.t);
  $('timeDur').textContent = J.fmtTime(S.plan.duration);
  if (!S.scrubbing) $('scrub').value = String(Math.round(S.t / Math.max(0.001, S.plan.duration) * 10000));
}
function play() {
  refreshLoopHold();
  if (S.audio) AP.play(S.audio.buffer, S.t);
  else S.t0 = performance.now() - S.t * 1000;
  S.playing = true; $('btnPlay').textContent = '❚❚'; $('btnPlay').setAttribute('aria-label', '一時停止');
}
function pause() {
  S.playing = false; AP.stop();
  $('btnPlay').textContent = '▶'; $('btnPlay').setAttribute('aria-label', '再生'); S.need = true;
}
function seek(t) {
  S.t = J.clamp(t, 0, Math.max(0, S.plan.duration - 1e-3));
  if (S.audio) { if (S.playing) AP.play(S.audio.buffer, S.t); }
  else S.t0 = performance.now() - S.t * 1000;
  refreshLoopHold();
  S.need = true;
}

/* ---------------- timeline ---------------- */
const layoutHue = k => (J.LAYOUT_ORDER.indexOf(k) * 37 + 30) % 360;
function drawTimeline() {
  const c = $('timeline'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(10, Math.round(c.clientWidth * dpr)), h = Math.max(10, Math.round(c.clientHeight * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const x = c.getContext('2d'), D = Math.max(0.001, S.plan.duration), X = t => t / D * w;
  x.fillStyle = '#131316'; x.fillRect(0, 0, w, h);
  if (S.audio && S.audio.peaks) {
    const pk = S.audio.peaks, n = pk.length, sd = S.audio.duration;
    x.fillStyle = '#2b2b33';
    for (let i = 0; i < w; i += 2) { const t = i / w * D; if (t > sd) break; const v = pk[Math.min(n - 1, Math.floor(t / sd * n))]; const hh = v * h * 0.8; x.fillRect(i, h * 0.6 - hh / 2, 1.5, hh); }
  }
  const beats = S.plan.beats || [];
  x.fillStyle = '#3a3a44';
  for (const b of beats) { if (b > D) break; x.fillRect(Math.round(X(b)), h - 6 * dpr, 1, 6 * dpr); }
  const top = h * 0.3, bot = h - 8 * dpr;
  for (const cut of S.plan.cuts) {
    const x0 = X(cut.start), x1 = X(cut.end);
    const hue = layoutHue(cut.layout);
    x.fillStyle = `hsla(${hue},70%,58%,0.28)`; x.fillRect(x0, top, Math.max(1, x1 - x0 - 1), bot - top);
    x.fillStyle = `hsla(${hue},80%,62%,0.95)`; x.fillRect(x0, top, Math.max(1, 2 * dpr), bot - top);
    if (x1 - x0 > 34 * dpr) {
      x.fillStyle = 'rgba(236,231,225,0.85)'; x.font = `${10 * dpr}px ${getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace'}`;
      x.save(); x.beginPath(); x.rect(x0, top, x1 - x0 - 3, bot - top); x.clip();
      x.fillText((J.LAYOUTS[cut.layout] || {}).name || cut.layout, x0 + 5 * dpr, top + 13 * dpr); x.restore();
    }
  }
  x.font = `${10 * dpr}px monospace`;
  for (const ln of S.plan.lines) {
    const lx = X(ln.start);
    x.fillStyle = '#5d5a63'; x.fillRect(lx, 0, 1, top);
    x.fillStyle = '#8e8a94'; x.fillText(String(ln.index + 1).padStart(2, '0'), lx + 3 * dpr, 12 * dpr);
  }
  if (S.loop === 'line' || S.loop === 'cut') {
    const r = activeLoopRange();
    x.fillStyle = 'rgba(245,165,12,0.16)';
    x.fillRect(X(r.start), 0, Math.max(2 * dpr, X(r.end) - X(r.start)), h);
  }
  const px = X(S.t);
  x.fillStyle = '#f5a50c'; x.fillRect(Math.round(px) - dpr, 0, 2 * dpr, h);
}
function timelineSeek(ev) {
  const r = $('timeline').getBoundingClientRect();
  seek((ev.clientX - r.left) / r.width * S.plan.duration);
}

/* ---------------- cut info ---------------- */
const CHIP_GROUPS = [
  ['layout', 'l', 'レイアウト'], ['enter', 'e', '登場'], ['hold', 'h', '保持'], ['exit', 'x', '退場'],
  ['decor', '', '装飾'], ['treat', 't', '加工'], ['bg', 'b', '背景'], ['cam', 'c', 'カメラ'], ['trans', 'c', 'つなぎ'],
];
const cutPick = { g: null, line: -1, k: -1 };
let lastCutIdx = -2;

function lyricCutK(cut) {
  if (!cut || cut.line < 0) return -1;
  let k = 0;
  for (const c of S.plan.cuts) {
    if (c.line !== cut.line) continue;
    if (!J.LAYOUTS[c.layout] || J.LAYOUTS[c.layout].special) continue;
    if (c.index === cut.index) return k;
    k++;
  }
  return -1;
}
function cutTechSlot(line, k) {
  const o = (S.project.overrides || {})[line] || {};
  const t = (o.cutTech && (o.cutTech[k] || o.cutTech[String(k)])) || {};
  const lay = o.cutLayouts && (o.cutLayouts[k] || o.cutLayouts[String(k)]);
  return lay && t.layout == null ? Object.assign({ layout: lay }, t) : t;
}
function cutGroupVal(cut, g) {
  if (g === 'layout') return cut.layout || '';
  if (g === 'enter') return cut.enter || '';
  if (g === 'hold') return cut.hold || '';
  if (g === 'exit') return cut.exit || '';
  if (g === 'treat') return cut.treat || 'none';
  if (g === 'bg') return cut.bg || 'none';
  if (g === 'cam') return cut.cam || 'push';
  if (g === 'trans') return cut.trans || '';
  if (g === 'decor') return (cut.decor && cut.decor[0] && cut.decor[0].id) || '';
  return '';
}
function groupName(g, k) {
  if (!k) return 'なし';
  const tbl = J.registry(g);
  return (tbl && tbl[k] && tbl[k].name) || k;
}
function updateCutInfo() {
  const cut = J.cutAt(S.plan, S.t);
  const idx = cut ? cut.index : -1;
  const li = cut ? cut.line : -1;
  if (li !== S.curLine) { S.lineEls.forEach((el, i) => el.classList.toggle('cur', i === li)); S.curLine = li; }
  if (idx === lastCutIdx) return;
  lastCutIdx = idx;
  const el = $('cutInfo');
  if (!cut) { el.innerHTML = '<span class="hint">この位置にカットはありません</span>'; closeCutPick(); return; }
  const k = lyricCutK(cut);
  const slot = k >= 0 ? cutTechSlot(cut.line, k) : {};
  const bits = [`<span class="chip mono">#${String(cut.index + 1).padStart(2, '0')}</span>`];
  CHIP_GROUPS.forEach(([g, cls, label]) => {
    const forced = slot[g] != null && slot[g] !== '';
    bits.push(`<button type="button" class="chip ${cls}${forced ? ' is-forced' : ''}" data-g="${g}" aria-pressed="${cutPick.g === g ? 'true' : 'false'}" ${k < 0 ? 'disabled' : ''}><b>${label}</b>${escapeHtml(groupName(g, cutGroupVal(cut, g)))}</button>`);
  });
  el.innerHTML = bits.join('');
  if (k >= 0) el.querySelectorAll('button.chip[data-g]').forEach(b => b.addEventListener('click', () => toggleCutPick(b.dataset.g, cut, k)));
}
function closeCutPick() {
  cutPick.g = null; cutPick.line = -1; cutPick.k = -1;
  const p = $('cutPick'); if (p) p.hidden = true;
  lastCutIdx = -2;
}
function toggleCutPick(g, cut, k) {
  if (cutPick.g === g && cutPick.line === cut.line && cutPick.k === k) { closeCutPick(); updateCutInfo(); return; }
  cutPick.g = g; cutPick.line = cut.line; cutPick.k = k;
  $('cutPick').hidden = false;
  fillCutPick();
  lastCutIdx = -2; updateCutInfo();
}
function fillCutPick() {
  const g = cutPick.g, grid = $('cutPickGrid');
  if (!g || !grid) return;
  const meta = CHIP_GROUPS.find(x => x[0] === g);
  $('cutPickTitle').textContent = meta ? meta[2] : g;
  const cut = J.cutAt(S.plan, S.t);
  const cur = cut ? cutGroupVal(cut, g) : '';
  const forced = cutTechSlot(cutPick.line, cutPick.k)[g];
  const onKey = forced || cur;
  grid.innerHTML = '';
  if (g === 'decor' || g === 'trans') {
    const none = document.createElement('button');
    none.type = 'button';
    none.className = 'tcard' + (forced === 'none' ? ' is-on' : '');
    none.innerHTML = '<span class="tcard-name" style="padding:16px 6px"><span>なし</span></span>';
    none.addEventListener('click', () => { setCutTech(cutPick.line, cutPick.k, g, 'none'); replan(); });
    grid.appendChild(none);
  }
  const [W, H] = J.designSize(S.project.aspect || '16:9');
  const th = 80, tw = Math.max(72, Math.round(th * W / H));
  const items = J.order(g).filter(key => J.registry(g)[key] && !J.registry(g)[key].special);
  items.forEach(key => {
    const def = J.registry(g)[key];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tcard' + (key === onKey ? ' is-on' : '');
    b.title = key;
    b.innerHTML = `<canvas width="${tw}" height="${th}" data-g="${g}" data-k="${key}"></canvas><span class="tcard-name"><span>${escapeHtml(def.name)}</span>${setBadges(def)}</span>`;
    b.addEventListener('click', () => {
      setCutTech(cutPick.line, cutPick.k, g, key);
      replan();
    });
    grid.appendChild(b);
  });
  queueThumbs(grid);
}

/* ---------------- line list ---------------- */
function renderLines() {
  const ol = $('lineList'); ol.innerHTML = ''; S.lineEls = []; S.curLine = -2;
  const ov = S.project.overrides;
  const layoutOpts = '<option value="">自動</option>' + J.LAYOUT_ORDER.map(k => `<option value="${k}">${J.LAYOUTS[k].name}</option>`).join('');
  S.plan.lines.forEach((ln, i) => {
    const o = ov[i] || {};
    const li = document.createElement('li'); li.className = 'ln';
    const manual = S.project.timing.lineTimes && S.project.timing.lineTimes[i] != null;
    li.innerHTML = `<span class="no">${String(i + 1).padStart(2, '0')}</span>
      <input class="time mono" type="number" step="0.01" min="0" value="${ln.start.toFixed(2)}" title="開始（秒）${manual ? '・手動' : '・自動'}" aria-label="${i + 1}行目の開始秒" style="${manual ? 'border-color:var(--cyan)' : ''}">
      <span class="txt" title="${escapeHtml(ln.text)}">${escapeHtml(ln.text)}</span>
      <div class="meta"><span class="cuts"></span>
      <span class="tools">
        <button class="icon ghost dice" title="この行を再抽選">${ICON.dice}</button>
        <button class="icon ghost lock" title="この行の構成をロック" aria-pressed="${o.lock ? 'true' : 'false'}">${ICON.lock}</button>
      </span></div>`;
    li.querySelector('.time').addEventListener('change', e => {
      const v = parseFloat(e.target.value);
      if (!S.project.timing.lineTimes) S.project.timing.lineTimes = {};
      if (isFinite(v)) S.project.timing.lineTimes[i] = Math.max(0, v); else delete S.project.timing.lineTimes[i];
      replan();
    });
    li.querySelector('.txt').addEventListener('click', () => seek(ln.start + 0.001));
    li.querySelector('.dice').addEventListener('click', () => { const cur = ov[i] || {}; setOv(i, { seed: (cur.seed | 0) + 1, lock: false }); replan(); seek(ln.start + 0.001); });
    li.querySelector('.lock').addEventListener('click', () => {
      const cur = ov[i] || {};
      if (cur.lock) setOv(i, { lock: false, lockedSeed: undefined });
      else setOv(i, { lock: true, lockedSeed: ln.seed });
      replan();
    });
    const cutsEl = li.querySelector('.cuts');
    S.plan.cuts.filter(c => c.line === i && J.LAYOUTS[c.layout] && !J.LAYOUTS[c.layout].special).forEach((c, k) => {
      const forced = o.cutLayouts && o.cutLayouts[k];
      const sel = document.createElement('select');
      sel.className = 'cut-lay' + (forced ? ' is-forced' : '');
      sel.innerHTML = layoutOpts;
      sel.value = forced || c.layout;
      sel.title = `${c.text}｜${J.ENTER[c.enter].name} → ${J.EXIT[c.exit].name}`;
      sel.setAttribute('aria-label', `${i + 1}行目 カット${k + 1}のレイアウト`);
      sel.style.borderColor = `hsla(${layoutHue(c.layout)},70%,58%,0.7)`;
      sel.addEventListener('pointerdown', () => seek(c.start + Math.min(c.dur * 0.5, c.inDur + 0.05)));
      sel.addEventListener('change', e => { setCutLayout(i, k, e.target.value); replan(); seek(c.start + Math.min(c.dur * 0.5, c.inDur + 0.05)); });
      cutsEl.appendChild(sel);
    });
    ol.appendChild(li); S.lineEls.push(li);
  });
  $('linesInfo').textContent = `${S.plan.lines.length}行 / ${S.plan.cuts.length}カット`;
}
function setOv(i, patch) {
  const cur = Object.assign({}, S.project.overrides[i] || {}, patch);
  for (const k of Object.keys(cur)) if (cur[k] === undefined || cur[k] === false || cur[k] === '') delete cur[k];
  if (Object.keys(cur).length) S.project.overrides[i] = cur; else delete S.project.overrides[i];
}
function setCutLayout(i, k, layout) { setCutTech(i, k, 'layout', layout); }
function setCutTech(i, k, group, key) {
  if (i == null || i < 0 || k == null || k < 0) return;
  const cur = Object.assign({}, S.project.overrides[i] || {});
  const cutTech = Object.assign({}, cur.cutTech || {});
  const slot = Object.assign({}, cutTech[k] || cutTech[String(k)] || {});
  delete cutTech[String(k)];
  if (!key) delete slot[group];
  else slot[group] = key;
  if (!Object.keys(slot).length) delete cutTech[k];
  else cutTech[k] = slot;
  if (Object.keys(cutTech).length) cur.cutTech = cutTech; else delete cur.cutTech;
  if (group === 'layout') {
    const cutLayouts = Object.assign({}, cur.cutLayouts || {});
    if (!key) delete cutLayouts[k]; else cutLayouts[k] = key;
    if (Object.keys(cutLayouts).length) cur.cutLayouts = cutLayouts; else delete cur.cutLayouts;
  }
  if (Object.keys(cur).length) S.project.overrides[i] = cur; else delete S.project.overrides[i];
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------------- style tab ---------------- */
function drawStyleGrid() {
  const g = $('styleGrid');
  if (!g.children.length) {
    J.STYLE_ORDER.forEach(k => {
      const b = document.createElement('button'); b.className = 'stile'; b.dataset.k = k;
      b.title = J.STYLES[k].desc;
      b.innerHTML = `<canvas width="192" height="108"></canvas><span>${J.STYLES[k].name}</span><span class="badges">${setBadges(J.STYLES[k])}</span>`;
      b.addEventListener('click', () => { remember(); S.project.style = k; S.project.colors.enabled = false; syncUI(); replan(); commit(); });
      g.appendChild(b);
    });
  }
  [...g.children].forEach(b => {
    const k = b.dataset.k, st = J.STYLES[k], sc = st.schemes[0], cv = b.querySelector('canvas'), x = cv.getContext('2d');
    b.setAttribute('aria-pressed', S.project.style === k ? 'true' : 'false');
    const off = !J.randomOk(S.project, 'style', k);
    b.classList.toggle('set-off', off);
    b.title = st.desc + (off ? (st.extra && S.project.extra !== true ? '（追加分がオフのため、おまかせでは選ばれません）' : '（和風の演出がオフのため、おまかせでは選ばれません）') : '');
    x.fillStyle = sc.bg; x.fillRect(0, 0, 192, 108);
    st.schemes.slice(1, 4).forEach((s2, i) => { x.fillStyle = s2.bg; x.fillRect(192 - 14 * (i + 1), 0, 14, 10); });
    const f = st.fonts.display[0];
    x.font = J.fontCSS(f, 46); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = sc.ghostB; x.fillText('字面', 96 - 3, 54 - 1);
    x.fillStyle = sc.ghostA; x.fillText('字面', 96 + 3, 54 + 2);
    x.fillStyle = sc.fg; x.fillText('字面', 96, 54);
    x.fillStyle = sc.accent; x.fillRect(12, 90, 30, 4);
    x.font = J.fontCSS('mono', 9); x.textAlign = 'left'; x.fillStyle = sc.sub; x.fillText(k.toUpperCase(), 48, 93);
  });
}
function fontSelectOptions(sel) {
  return '<option value="">スタイルの既定</option>' + Object.entries(J.FONTS).map(([k, f]) => {
    const g = J.faceOf ? J.faceOf(k) : f, alt = g.label && g.label !== f.label ? ' → ' + g.label : '';   // the face actually used for the lyric language
    return `<option value="${k}" ${sel === k ? 'selected' : ''}>${escapeHtml(f.label + alt)}</option>`;
  }).join('');
}
function renderFontRoles() {
  const box = $('fontRoles'); box.innerHTML = '';
  [['display', '見出し'], ['serif', '明朝枠'], ['body', '小さな文字']].forEach(([role, label]) => {
    const row = document.createElement('div'); row.className = 'font-row';
    row.innerHTML = `<span class="muted">${label}</span><select aria-label="${label}のフォント">${fontSelectOptions(S.project.fonts[role])}</select>`;
    row.querySelector('select').addEventListener('change', e => { if (e.target.value) S.project.fonts[role] = e.target.value; else delete S.project.fonts[role]; fontKey = ''; replan(); });
    box.appendChild(row);
  });
}
const BASE_KEYS = [['bg', '背景'], ['fg', '文字'], ['sub', '補助']];
const ACCENT_KEYS = [['accent', 'アクセント'], ['ghostA', 'ズレ色A'], ['ghostB', 'ズレ色B']];
function renderColors() {
  const st = J.STYLES[S.project.style] || J.STYLES.noir, sc = st.schemes[0];
  const c = S.project.colors;
  $('colorOn').checked = !!c.enabled;
  $('accentOn').checked = !!c.accentOn;
  const fill = (rowId, keys, flag) => {
    const row = $(rowId); row.innerHTML = '';
    keys.forEach(([k, label]) => {
      const l = document.createElement('label');
      const v = (c[flag] && c[k]) || c[k] || sc[k];
      l.innerHTML = `${label}<input type="color" value="${toColorInput(v)}">`;
      l.querySelector('input').addEventListener('input', e => {
        c[k] = e.target.value.toUpperCase();
        if (!c[flag]) { c[flag] = true; $(flag === 'enabled' ? 'colorOn' : 'accentOn').checked = true; }
        replanSoon(60); drawSwatch();
      });
      row.appendChild(l);
    });
  };
  fill('colorRow', BASE_KEYS, 'enabled');
  fill('colorRowAccent', ACCENT_KEYS, 'accentOn');
  drawSwatch();
}
const toColorInput = v => { const h = String(v || '#000000'); return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : J.toHex(...J.hex(h)).toLowerCase(); };
function swatchHTML(cols) { return cols.map(c => `<i style="background:${c}" title="${c}"></i>`).join(''); }
function drawSwatch() {
  const sc = S.plan ? S.plan.style.schemes[0] : null; if (!sc) return;
  $('paletteSwatch').innerHTML = swatchHTML([sc.accent, sc.ghostA, sc.ghostB]);
}
function randomPalette() {
  remember();
  const c = S.project.colors;
  const sc0 = J.STYLES[S.project.style].schemes[0];
  const bg = c.enabled && c.bg ? c.bg : sc0.bg;
  let p, guard = 0;
  do { p = J.randomPalette(bg); } while (guard++ < 6 && p.ghostA === c.ghostA && p.ghostB === c.ghostB);
  Object.assign(c, { accent: p.accent, ghostA: p.ghostA, ghostB: p.ghostB, accentOn: true });
  renderColors(); replan(); commit();
  toast('配色：アクセント・ズレ色A/Bを変更', [p.accent, p.ghostA, p.ghostB]);
}

/* ---------------- history of looks (◀ ▶) ---------------- */
// only the "look" is tracked — lyrics, timing and output settings are never rolled back
const HKEYS = ['style', 'mood', 'seed', 'fx', 'enabled', 'fonts', 'colors', 'overrides'];
const H = { list: [], i: -1 };
const lookSnap = () => JSON.stringify(Object.fromEntries(HKEYS.map(k => [k, S.project[k] ?? null])));
function remember() {            // call before changing the look: makes sure the current look is on the stack
  const s = lookSnap();
  if (H.i >= 0 && H.list[H.i] === s) return;
  H.list = H.list.slice(0, H.i + 1); H.list.push(s); H.i = H.list.length - 1;
}
function commit() {              // call after changing the look
  const s = lookSnap();
  if (H.list[H.i] !== s) { H.list = H.list.slice(0, H.i + 1); H.list.push(s); H.i = H.list.length - 1; }
  if (H.list.length > 80) { H.list.splice(0, H.list.length - 80); H.i = H.list.length - 1; }
  updateHist();
}
function histGo(d) {
  if (S.exporting) return;
  remember();                    // hand edits made since the last step become a stop of their own
  const j = H.i + d; if (j < 0 || j >= H.list.length) return;
  H.i = j;
  Object.assign(S.project, JSON.parse(H.list[j]));
  fontKey = ''; syncUI(); replan(); updateHist();
  toast(`${j + 1} / ${H.list.length} 案目`);
  restartPreview();
}
function updateHist() {
  const canB = H.i > 0, canF = H.i < H.list.length - 1;
  ['btnPrev', 'btnPrev2'].forEach(id => { $(id).disabled = !canB; });
  ['btnNext', 'btnNext2'].forEach(id => { $(id).disabled = !canF; });
  $('histPos').textContent = H.list.length > 1 ? `${H.i + 1} / ${H.list.length}` : '';
}

/* ---------------- おまかせ ---------------- */
function restartPreview() { seek(0); if (!S.playing && S.mode === 'easy') play(); }
function omakase() {
  if (S.exporting || S.tap) return;
  remember();
  const r = J.omakase(S.project);
  Object.assign(S.project, r);
  fontKey = ''; syncUI(); replan(); commit();
  toast(`おまかせ：${J.STYLES[r.style].name} × ${J.MOODS[r.mood].name}`, r.colors.accentOn ? [r.colors.accent, r.colors.ghostA, r.colors.ghostB] : null);
  restartPreview();
}
// change just one aspect of the current look
function rerollPart(part) {
  if (S.exporting || S.tap) return;
  remember();
  const P = S.project;
  let msg = '';
  if (part === 'style') {
    let pool = J.STYLE_ORDER.filter(k => k !== P.style && J.randomOk(P, 'style', k));
    if (!pool.length) pool = J.STYLE_ORDER.filter(k => k !== P.style);
    P.style = pool[Math.floor(Math.random() * pool.length)];
    P.colors.enabled = false;
    msg = `スタイル：${J.STYLES[P.style].name}`;
  } else if (part === 'mood') {
    const r = J.omakase(P);
    Object.assign(P, { mood: r.mood, fx: r.fx, enabled: r.enabled });
    msg = `雰囲気：${J.MOODS[r.mood].name}`;
  } else if (part === 'cut') {
    P.seed = (Math.random() * 1e9) | 0;
    msg = '構成：レイアウトと動きを再抽選';
  }
  fontKey = ''; syncUI(); replan(); commit();
  toast(msg);
  restartPreview();
}
function showNow() {
  const el = $('easyNow'); if (!el || !S.plan || el.closest('[hidden]')) return;
  const P = S.project, sc = S.plan.style.schemes[0];
  const moodName = P.mood && J.MOODS[P.mood] ? J.MOODS[P.mood].name : 'カスタム';
  const fk = S.plan.style.fonts.display[0];
  const fontName = J.FONTS[fk] ? J.FONTS[fk].label : fk;
  const cuts = S.plan.cuts.filter(c => c.line >= 0 && c.layout !== 'interlude');
  const kinds = new Set(cuts.map(c => c.layout)).size;
  const row = (k, v) => `<div class="now-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  el.innerHTML = row('スタイル', `<b>${escapeHtml(J.STYLES[P.style].name)}</b>`)
    + row('雰囲気', escapeHtml(moodName))
    + row('配色', `<span class="swatches">${swatchHTML([sc.bg, sc.fg, sc.accent, sc.ghostA, sc.ghostB])}</span>${P.colors.accentOn ? '<span class="tagl">ランダム</span>' : ''}`)
    + row('見出し書体', escapeHtml(fontName))
    + row('構成', `${cuts.length} カット・レイアウト ${kinds} 種`)
    + row('演出', `加工 ${cuts.filter(c => c.treat && c.treat !== 'none').length}・背景 ${new Set(cuts.map(c => c.bg).filter(b => b && b !== 'none')).size}種・カメラ ${cuts.filter(c => c.cam && c.cam !== 'push').length}`);
}
let toastTimer = 0;
function toast(m, cols) {
  const el = $('toast'); if (!el) return;
  el.innerHTML = escapeHtml(m) + (cols ? `<span class="swatches">${swatchHTML(cols)}</span>` : '');
  el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('in'); el.classList.add('out'); toastTimer = setTimeout(() => { el.hidden = true; }, 260); }, 1700);
}

/* ---------------- かんたん / 詳細 ---------------- */
function setMode(m) {
  S.mode = m === 'easy' ? 'easy' : 'pro';
  const easy = S.mode === 'easy';
  $('app').classList.toggle('is-easy', easy);
  $('easyPanel').hidden = !easy;
  $('modeEasy').setAttribute('aria-pressed', String(easy));
  $('modePro').setAttribute('aria-pressed', String(!easy));
  try { localStorage.setItem('jizura.mode', S.mode); } catch (e) {}
  if (easy) { showNow(); syncOut(); codecNote(); }
  sizeViewport(); drawTimeline(); loadThumbFonts();
}

/* ---------------- fx tab ---------------- */
const FX = [['motion', '動きの強さ'], ['glitch', 'グリッチ'], ['chroma', '色ズレ'], ['decor', '装飾の量'], ['density', 'カットの細かさ'], ['texture', '質感'], ['bgSwitch', '背景の切替']];
function renderFx() {
  const box = $('fxSliders'); box.innerHTML = '';
  FX.forEach(([k, label]) => {
    const row = document.createElement('div'); row.className = 'slider';
    const v = S.project.fx[k] ?? 0.5;
    row.innerHTML = `<label for="fx_${k}">${label}</label><input id="fx_${k}" type="range" min="0" max="1" step="0.01" value="${v}"><output>${Math.round(v * 100)}</output>`;
    const inp = row.querySelector('input'), out = row.querySelector('output');
    inp.addEventListener('input', () => { S.project.fx[k] = +inp.value; S.project.mood = null; out.textContent = Math.round(inp.value * 100); replanSoon(120); });
    box.appendChild(row);
  });
  $('fxFlash').checked = !!S.project.fx.flash;
  $('fxKoma').value = String(J.komaOf(S.project.fx));
  $('fxHud').value = S.project.fx.hud || 'auto';
  $('seed').value = S.project.seed;
}

/* ---------------- technique tab ---------------- */
const GROUPS = [['layout', 'レイアウト'], ['enter', '登場'], ['hold', '保持'], ['exit', '退場'], ['decor', '装飾'], ['treat', '文字の加工'], ['bg', '背景'], ['cam', 'カメラ'], ['fx', '画面効果'], ['trans', 'カット間のつなぎ']];
const openGroups = new Set();
function techItems(g) { return J.order(g).filter(k => J.registry(g)[k] && !J.registry(g)[k].special); }

const previewR = new J.Renderer();
const previewPlans = new Map();
const previewLive = new Set();
let previewObs = null, previewRaf = 0, previewLast = 0;
function previewCacheKey(g, k) {
  const p = S.project;
  return [p.style, p.aspect, g, k, p.colors && p.colors.enabled ? JSON.stringify(p.colors) : '', JSON.stringify(p.fonts || {})].join('|');
}
function getPreviewPlan(g, k) {
  const id = previewCacheKey(g, k);
  let plan = previewPlans.get(id);
  if (plan) return plan;
  plan = J.previewPlan(S.project, g, k);
  previewPlans.set(id, plan);
  if (previewPlans.size > 500) previewPlans.delete(previewPlans.keys().next().value);
  return plan;
}
function previewTime(plan, g, now) {
  const c = plan.cuts[plan.cuts.length - 1];
  const u = now / 1000;
  if (g === 'enter') return c.start + ((u % 1.5) / 1.5) * Math.max(0.3, c.inDur);
  if (g === 'exit') { const od = Math.max(0.3, c.outDur || 0.5); return c.end - od + ((u % 1.5) / 1.5) * od; }
  if (g === 'trans') return c.start + ((u % 1.7) / 1.7) * (c.transDur || 0.35);
  if (g === 'fx') return (u % 1.05);
  const span = Math.max(1.6, c.dur * 0.96);
  return c.start + ((u % span) / span) * (c.dur * 0.96);
}
function paintTechCanvas(cv, g, k, t) {
  const plan = getPreviewPlan(g, k);
  const ctx = cv.getContext('2d');
  try {
    previewR.frame(ctx, plan, t, { scale: cv.width / plan.W, fast: true, noHud: true, noGhost: g !== 'fx' });
  } catch (e) {
    ctx.fillStyle = '#131316'; ctx.fillRect(0, 0, cv.width, cv.height);
  }
  cv.dataset.ready = '1';
}
function techPaneOpen() {
  const pane = $('techLists') && $('techLists').closest('.tabpane');
  const pick = $('cutPick');
  return (pane && !pane.hidden) || (pick && !pick.hidden);
}
function ensurePreviewObs() {
  if (previewObs) return previewObs;
  previewObs = new IntersectionObserver((ents) => {
    ents.forEach(e => { if (e.isIntersecting && e.intersectionRatio > 0) previewLive.add(e.target); else previewLive.delete(e.target); });
    kickPreviewLoop();
  }, { root: null, rootMargin: '40px 0px', threshold: [0, 0.12, 0.4] });
  return previewObs;
}
function resetPreviewWatch() {
  previewLive.clear();
  if (previewObs) { previewObs.disconnect(); previewObs = null; }
}
function watchThumb(cv) { ensurePreviewObs().observe(cv); }
function kickPreviewLoop() {
  if (previewRaf) return;
  const tick = (now) => {
    previewRaf = 0;
    if (document.hidden || S.exporting || !techPaneOpen() || !previewLive.size) return;
    if (now - previewLast >= 70) {
      previewLast = now;
      for (const cv of previewLive) {
        if (!cv.isConnected) { previewLive.delete(cv); continue; }
        const g = cv.dataset.g, k = cv.dataset.k;
        if (!g || !k) continue;
        paintTechCanvas(cv, g, k, previewTime(getPreviewPlan(g, k), g, now));
      }
    }
    previewRaf = requestAnimationFrame(tick);
  };
  previewRaf = requestAnimationFrame(tick);
}
function queueThumbs(list) {
  const now = performance.now();
  [...list.querySelectorAll('canvas[data-g]')].forEach(cv => {
    previewLive.add(cv);
    watchThumb(cv);
    const g = cv.dataset.g, k = cv.dataset.k;
    if (g && k) paintTechCanvas(cv, g, k, previewTime(getPreviewPlan(g, k), g, now));
  });
  kickPreviewLoop();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) kickPreviewLoop(); });

function renderTech() {
  resetPreviewWatch();
  const box = $('techLists'); box.innerHTML = '';
  const q = ($('techFilter').value || '').trim().toLowerCase();
  let total = 0, onAll = 0;
  GROUPS.forEach(([g, label]) => {
    const tbl = J.registry(g), items = techItems(g), en = S.project.enabled[g] || (S.project.enabled[g] = {});
    const shown = q ? items.filter(k => (tbl[k].name + ' ' + k).toLowerCase().includes(q)) : items;
    const onN = items.filter(k => en[k] !== false).length;
    total += items.length; onAll += onN;
    if (q && !shown.length) return;
    const d = document.createElement('details'); d.className = 'tgroup';
    d.open = !!q || openGroups.has(g);
    const list = document.createElement('div'); list.className = 'checks tech-grid';
    d.addEventListener('toggle', () => { if (d.open) { openGroups.add(g); queueThumbs(list); } else openGroups.delete(g); });
    d.innerHTML = `<summary><span class="tg-name">${label}</span><span class="tg-cnt mono">${onN}/${items.length}</span></summary><div class="tg-tools"><button class="ghost small" data-a="on">すべてON</button><button class="ghost small" data-a="off">すべてOFF</button><button class="ghost small" data-a="flip">反転</button></div>`;
    const [tw, th] = (() => {
      const [W, H] = J.designSize(S.project.aspect || '16:9');
      const h = 90; return [Math.max(80, Math.round(h * W / H)), h];
    })();
    shown.forEach(k => {
      const l = document.createElement('label');
      l.className = 'tcard';
      l.title = k + (tbl[k].tags && tbl[k].tags.length ? '（' + tbl[k].tags.map(t => (J.MOODS[t] ? J.MOODS[t].name : t)).join('・') + '）' : '');
      if (!J.randomOk(S.project, g, k)) { l.classList.add('set-off'); l.title += tbl[k].extra && S.project.extra !== true ? '（追加分がオフのため、自動では選ばれません）' : '（和風の演出がオフのため、自動では選ばれません）'; }
      l.innerHTML = `<canvas width="${tw}" height="${th}" data-g="${g}" data-k="${k}"></canvas><span class="tcard-name"><input type="checkbox" ${en[k] !== false ? 'checked' : ''}> <span>${escapeHtml(tbl[k].name)}</span>${setBadges(tbl[k])}</span>`;
      const cv = l.querySelector('canvas');
      l.querySelector('input').addEventListener('change', e => { en[k] = e.target.checked; S.project.mood = null; d.querySelector('.tg-cnt').textContent = `${items.filter(x => en[x] !== false).length}/${items.length}`; replanSoon(60); });
      list.appendChild(l);
    });
    d.querySelectorAll('.tg-tools button').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a;
      shown.forEach(k => { en[k] = a === 'on' ? true : a === 'off' ? false : en[k] === false; });
      if (g === 'layout' && !items.some(k => en[k] !== false)) en.center = true;
      if (g === 'enter') en.cut = true; if (g === 'exit') en.cut = true; if (g === 'hold') en.still = true;
      if (g === 'treat') en.none = true; if (g === 'bg') en.none = true; if (g === 'cam') en.push = true;
      S.project.mood = null; openGroups.add(g); renderTech(); replan();
    }));
    d.appendChild(list);
    box.appendChild(d);
    if (d.open) queueThumbs(list);
  });
  $('techTotal').textContent = `${onAll}/${total}`;
}

/* ---------------- output tab ---------------- */
function syncOut() {
  $('outAspect').value = S.project.aspect; $('outRes').value = String(S.project.res); $('outFps').value = String(S.project.fps);
  $('eAspect').value = S.project.aspect; $('eRes').value = String(S.project.res); $('eFps').value = String(S.project.fps);
  $('outQuality').value = S.project.quality || 'high'; $('outAudio').checked = S.project.includeAudio !== false;
  const k = J.keyMode(S.project) || 'off';
  $('outKey').value = k; $('eKey').value = k;
  const kb = $('keyBadge');
  kb.hidden = k === 'off';
  if (k !== 'off') kb.innerHTML = `<i style="background:${J.KEY_BG[k]}"></i>${k === 'green' ? 'グリーンバック' : 'ブラックバック'}`;
}
async function codecNote() {
  const [w, h] = J.outputSize(S.project);
  const vc = await J.pickVideoCodec(w, h, S.project.fps, 12e6);
  $('codecNote').textContent = vc ? `このブラウザでは ${vc.label} で書き出します（${w}×${h} / ${S.project.fps}fps）。書き出し中はタブを開いたままにしてください。` : 'このブラウザは動画エンコード（WebCodecs）に対応していません。Chrome / Edge の最新版で開くか、連番PNGを使ってください。';
  $('btnMP4').disabled = !vc; $('eMP4').disabled = !vc;
  if (!vc) $('eMP4').title = 'このブラウザは MP4 書き出しに対応していません（Chrome / Edge 推奨）';
}
const EXP_BTNS = ['btnMP4', 'btnPNG', 'btnPNGA', 'btnPNGL', 'eMP4'];
function baseName() {
  const k = J.keyMode(S.project);
  return ((S.project.title || 'jizura').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60) || 'jizura') + (k ? (k === 'green' ? '_greenback' : '_blackback') : '');
}
async function runExport(kind) {
  if (S.exporting) return;
  pause();
  const ac = new AbortController(); S.exporting = ac;
  const boxes = [...document.querySelectorAll('.exp-box')];
  const setText = m => boxes.forEach(b => { b.querySelector('.exp-text').textContent = m; });
  const txt = { set textContent(m) { setText(m); }, get textContent() { return boxes[0].querySelector('.exp-text').textContent; } };
  boxes.forEach(b => { b.hidden = false; b.querySelector('.exp-bar').style.width = '0%'; });
  setText('準備中…');
  EXP_BTNS.forEach(id => { $(id).disabled = true; });
  const onProgress = (p, m) => { boxes.forEach(b => { b.querySelector('.exp-bar').style.width = (p * 100).toFixed(1) + '%'; }); setText(m); };
  const t0 = performance.now();
  try {
    await J.ensureFonts(S.project.lyrics + (S.project.title || '') + (S.project.artist || '') + HUD_CHARS, J.fontsOfPlan(S.plan));
    if (kind === 'mp4') {
      const r = await J.exportMP4({ plan: S.plan, project: S.project, audio: S.project.includeAudio !== false ? S.audio : null, quality: S.project.quality || 'high', onProgress, signal: ac.signal });
      txt.textContent = `完成 ${(r.blob.size / 1048576).toFixed(1)}MB・${r.codec}${r.audio ? ' + ' + r.audio.toUpperCase() : ''}・${((performance.now() - t0) / 1000).toFixed(0)}秒`;
      const res = await J.saveFile(baseName() + '.mp4', r.blob);
      if (res === 'declined') txt.textContent += '（保存はキャンセルされました）';
    } else {
      const blob = await J.exportPNGZip({ plan: S.plan, project: S.project, transparent: kind === 'pnga', layers: kind === 'pngl', onProgress, signal: ac.signal });
      txt.textContent = `完成 ${(blob.size / 1048576).toFixed(1)}MB`;
      await J.saveFile(baseName() + (kind === 'pnga' ? '_alpha' : kind === 'pngl' ? '_layers' : '') + '_png.zip', blob);
    }
  } catch (e) {
    txt.textContent = 'エラー: ' + (e && e.message ? e.message : e);
    console.error(e);
  } finally {
    S.exporting = null; S.need = true;
    EXP_BTNS.forEach(id => { $(id).disabled = false; });
    codecNote();
  }
}

/* ---------------- tap sync ---------------- */
function startTap(from) {
  if (!S.plan.lines.length) return;
  const n = S.plan.lines.length;
  const i0 = J.clamp(from == null ? 0 : (from | 0), 0, n - 1);
  S.tap = { i: i0 };
  if (!S.project.timing.lineTimes) S.project.timing.lineTimes = {};
  $('tapPanel').hidden = false;
  $('btnTap').setAttribute('aria-pressed', String(i0 === 0));
  const fromBtn = $('btnTapFrom');
  if (fromBtn) fromBtn.setAttribute('aria-pressed', String(i0 > 0));
  const ln = S.plan.lines[i0];
  const t0 = i0 === 0 ? 0 : Math.max(0, (ln.start || 0) - 1.2);
  seek(t0); play(); updateTap();
  $('tapBtn').focus();
}
function tapNow() {
  if (!S.tap) return;
  S.project.timing.lineTimes[S.tap.i] = +S.t.toFixed(3);
  S.tap.i++;
  replan();
  if (S.tap.i >= S.plan.lines.length) stopTap(); else updateTap();
}
function stopTap() {
  S.tap = null; $('tapPanel').hidden = true;
  $('btnTap').setAttribute('aria-pressed', 'false');
  const fromBtn = $('btnTapFrom'); if (fromBtn) fromBtn.setAttribute('aria-pressed', 'false');
  replan();
}
function updateTap() { const ln = S.plan.lines[S.tap.i]; $('tapLine').textContent = ln ? `${S.tap.i + 1}. ${ln.text}` : '—'; }
function selectedLineIndex() {
  if (S.curLine >= 0) return S.curLine;
  const cut = typeof cutAround === 'function' ? cutAround(S.t) : J.cutAt(S.plan, S.t);
  if (cut && cut.line >= 0) return cut.line;
  const ln = S.plan.lines.find(l => l.start >= S.t - 0.05);
  return ln ? ln.index : 0;
}

/* ---------------- sync all inputs from project ---------------- */
function syncUI() {
  $('songTitle').value = S.project.title || ''; $('songArtist').value = S.project.artist || '';
  $('lyrics').value = S.project.lyrics;
  $('bpm').value = S.project.timing.bpm > 0 ? S.project.timing.bpm : '';
  $('bpm').placeholder = S.audio ? `自動 ${S.audio.bpm}` : 'なし';
  $('offset').value = S.project.timing.offset ?? 0.4;
  $('lineScale').value = S.project.timing.lineScale ?? 1;
  $('snap').checked = !!S.project.timing.snap;
  document.querySelectorAll('.wa-toggle').forEach(el => { el.checked = S.project.wa !== false; });
  document.querySelectorAll('.extra-toggle').forEach(el => { el.checked = S.project.extra === true; });
  $('lyricLang').value = J.LANG_LABEL[S.project.lang] ? S.project.lang : 'auto'; langNote();
  renderFontRoles(); renderColors(); renderFx(); renderTech(); syncOut(); drawStyleGrid();
}

/* ---------------- wiring ---------------- */
function bind() {
  $('lyrics').addEventListener('input', e => { S.project.lyrics = e.target.value; replanSoon(260); });
  $('lyricLang').addEventListener('change', e => {
    remember();
    S.project.lang = e.target.value; replan(); renderFontRoles(); commit(); flushSave();
    const l = J.resolveLang(S.project);
    toast((S.project.lang === 'auto' ? '歌詞の言語：自動判定 → ' : '歌詞の言語：') + J.LANG_LABEL[l]);
  });
  $('songTitle').addEventListener('input', e => { S.project.title = e.target.value; replanSoon(300); });
  $('songArtist').addEventListener('input', e => { S.project.artist = e.target.value; replanSoon(300); });
  $('btnSyntax').addEventListener('click', e => { const s = $('syntax'); s.hidden = !s.hidden; e.target.setAttribute('aria-expanded', String(!s.hidden)); });
  $('bpm').addEventListener('change', e => { S.project.timing.bpm = Math.max(0, parseFloat(e.target.value) || 0); replan(); });
  $('offset').addEventListener('change', e => { S.project.timing.offset = Math.max(0, parseFloat(e.target.value) || 0); replan(); });
  $('lineScale').addEventListener('change', e => { S.project.timing.lineScale = J.clamp(parseFloat(e.target.value) || 1, 0.3, 4); replan(); });
  $('snap').addEventListener('change', e => { S.project.timing.snap = e.target.checked; replan(); });
  $('btnResetTimes').addEventListener('click', () => { S.project.timing.lineTimes = {}; replan(); });
  $('audioFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) loadAudioFile(f); });
  $('btnTap').addEventListener('click', () => (S.tap ? stopTap() : startTap(0)));
  const btnTapFrom = $('btnTapFrom');
  if (btnTapFrom) btnTapFrom.addEventListener('click', () => (S.tap ? stopTap() : startTap(selectedLineIndex())));
  $('tapBtn').addEventListener('click', tapNow);
  $('tapStop').addEventListener('click', () => { pause(); stopTap(); });
  $('btnPlay').addEventListener('click', () => (S.playing ? pause() : play()));
  const cutPickAuto = $('cutPickAuto'), cutPickClose = $('cutPickClose');
  if (cutPickClose) cutPickClose.addEventListener('click', () => { closeCutPick(); updateCutInfo(); });
  if (cutPickAuto) cutPickAuto.addEventListener('click', () => {
    if (!cutPick.g) return;
    setCutTech(cutPick.line, cutPick.k, cutPick.g, '');
    replan();
  });
  $('btnLoop').addEventListener('click', () => {
    const i = LOOP_CYCLE.indexOf(S.loop);
    S.loop = LOOP_CYCLE[(i < 0 ? 0 : i + 1) % LOOP_CYCLE.length];
    syncLoopBtn(); S.need = true;
  });
  $('btnShuffle').addEventListener('click', () => { remember(); S.project.seed = (Math.random() * 1e9) | 0; $('seed').value = S.project.seed; replan(); commit(); });
  const sc = $('scrub');
  sc.addEventListener('input', () => { S.scrubbing = true; seek(sc.value / 10000 * S.plan.duration); });
  sc.addEventListener('change', () => { S.scrubbing = false; });
  const tl = $('timeline');
  let drag = false;
  tl.addEventListener('pointerdown', e => { drag = true; tl.setPointerCapture(e.pointerId); timelineSeek(e); });
  tl.addEventListener('pointermove', e => { if (drag) timelineSeek(e); });
  tl.addEventListener('pointerup', () => { drag = false; });
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('.tabpane').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; });
    if (b.dataset.tab === 'out') codecNote();
    if (b.dataset.tab === 'tech') kickPreviewLoop();
    loadThumbFonts();
  }));
  $('fxFlash').addEventListener('change', e => { S.project.fx.flash = e.target.checked; replan(); });
  $('techFilter').addEventListener('input', () => renderTech());
  const setSwitch = (cls, key, on, msgOn, msgOff) => document.querySelectorAll('.' + cls).forEach(el => el.addEventListener('change', e => {
    remember();
    S.project[key] = e.target.checked;
    document.querySelectorAll('.' + cls).forEach(x => { x.checked = e.target.checked; });
    renderTech(); drawStyleGrid(); replan(); commit(); flushSave();
    toast(e.target.checked ? msgOn : msgOff);
  }));
  setSwitch('extra-toggle', 'extra', true, '追加分の演出：使う', '追加分の演出：使わない（最初の公開版の演出だけ）');
  setSwitch('wa-toggle', 'wa', true, '和風の演出：使う', '和風の演出：使わない（おまかせ・シャッフルで選ばれません）');
  $('fxKoma').addEventListener('change', e => { const k = +e.target.value; S.project.fx.koma = k; S.project.fx.onTwos = k > 0; S.project.mood = null; replan(); });
  $('fxHud').addEventListener('change', e => { S.project.fx.hud = e.target.value; replan(); });
  $('seed').addEventListener('change', e => { S.project.seed = parseInt(e.target.value, 10) || 0; replan(); });
  $('btnSeed').addEventListener('click', () => { S.project.seed = (Math.random() * 1e9) | 0; $('seed').value = S.project.seed; replan(); });
  const colorToggle = (flag, keys) => e => {
    remember();
    const c = S.project.colors; c[flag] = e.target.checked;
    if (c[flag]) { const sc0 = J.STYLES[S.project.style].schemes[0]; keys.forEach(([k]) => { if (!c[k]) c[k] = sc0[k]; }); }
    renderColors(); replan(); commit();
  };
  $('colorOn').addEventListener('change', colorToggle('enabled', BASE_KEYS));
  $('accentOn').addEventListener('change', colorToggle('accentOn', ACCENT_KEYS));
  $('btnRandPalette').addEventListener('click', randomPalette);
  $('btnAddFont').addEventListener('click', () => {
    const name = $('localFont').value.trim(); if (!name) return;
    const key = 'local_' + name.replace(/\s+/g, '_');
    const weight = /bold|太|black|heavy|w[6-9]|[6-9]00/i.test(name) ? 700 : 400;
    J.addUserFont(key, name + '（PC）', name, weight);
    S.project.userFonts = (S.project.userFonts || []).filter(u => u.key !== key).concat([{ key, label: name + '（PC）', family: name, weight }]);
    S.project.fonts.display = key; $('localFont').value = '';
    fontKey = ''; renderFontRoles(); replan();
  });
  $('fontFile').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try { const key = await J.loadFontFile(f); S.project.fonts.display = key; fontKey = ''; renderFontRoles(); replan(); }
    catch (err) { showMsg('フォントを読み込めませんでした'); setTimeout(() => showMsg(null), 2500); }
  });
  ['outAspect', 'eAspect'].forEach(id => $(id).addEventListener('change', e => { S.project.aspect = e.target.value; syncOut(); replan(); codecNote(); }));
  ['outRes', 'eRes'].forEach(id => $(id).addEventListener('change', e => { S.project.res = +e.target.value; syncOut(); autosave(); codecNote(); }));
  ['outFps', 'eFps'].forEach(id => $(id).addEventListener('change', e => { S.project.fps = +e.target.value; syncOut(); replan(); codecNote(); }));
  $('outQuality').addEventListener('change', e => { S.project.quality = e.target.value; autosave(); });
  ['outKey', 'eKey'].forEach(id => $(id).addEventListener('change', e => {
    S.project.keyBg = e.target.value; syncOut(); replan(); flushSave();
    const k = J.keyMode(S.project);
    toast(k ? `背景：${k === 'green' ? 'グリーンバック' : 'ブラックバック'}（白い文字と演出だけ）` : '背景：通常（スタイルの配色）');
  }));
  $('outAudio').addEventListener('change', e => { S.project.includeAudio = e.target.checked; autosave(); });
  $('btnMP4').addEventListener('click', () => runExport('mp4'));
  $('btnPNG').addEventListener('click', () => runExport('png'));
  $('btnPNGA').addEventListener('click', () => runExport('pnga'));
  $('btnPNGL').addEventListener('click', () => runExport('pngl'));
  document.querySelectorAll('.exp-cancel').forEach(b => b.addEventListener('click', () => { if (S.exporting) S.exporting.abort(); }));
  $('eMP4').addEventListener('click', () => runExport('mp4'));
  // かんたんモード
  $('modeEasy').addEventListener('click', () => setMode('easy'));
  $('modePro').addEventListener('click', () => setMode('pro'));
  $('btnOmakase').addEventListener('click', omakase);
  $('btnOmakaseBig').addEventListener('click', omakase);
  ['btnPrev', 'btnPrev2'].forEach(id => $(id).addEventListener('click', () => histGo(-1)));
  ['btnNext', 'btnNext2'].forEach(id => $(id).addEventListener('click', () => histGo(1)));
  $('eStyle').addEventListener('click', () => rerollPart('style'));
  $('eMood').addEventListener('click', () => rerollPart('mood'));
  $('eCut').addEventListener('click', () => rerollPart('cut'));
  $('ePalette').addEventListener('click', () => { randomPalette(); restartPreview(); });
  // 利用について（出力物の権利・ライセンス）
  const dlg = $('termsDlg');
  const openTerms = () => { if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', ''); };
  document.querySelectorAll('.terms-open').forEach(b => b.addEventListener('click', openTerms));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close ? dlg.close() : dlg.removeAttribute('open'); });   // click on the backdrop
  $('btnSave').addEventListener('click', () => J.saveFile(baseName() + '.jizura.json', JSON.stringify(S.project, null, 1)));
  $('btnAE').addEventListener('click', () => J.saveFile(baseName() + '_ae.json', JSON.stringify(J.planForAE(S.plan, S.project), null, 1)));
  $('fileProject').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try { S.project = mergeProject(JSON.parse(await f.text())); syncUI(); replan(); }
    catch (err) { showMsg('プロジェクトを読み込めませんでした'); setTimeout(() => showMsg(null), 2500); }
    e.target.value = '';
  });
  document.addEventListener('keydown', e => {
    const tag = (e.target && e.target.tagName) || '';
    const typing = /INPUT|TEXTAREA|SELECT/.test(tag) && e.target.type !== 'range' && e.target.type !== 'checkbox';
    if (S.tap && (e.code === 'Space' || e.code === 'Enter') && !typing) { e.preventDefault(); tapNow(); return; }
    if (S.tap && e.code === 'Escape') { pause(); stopTap(); return; }
    if (typing || $('termsDlg').open) return;
    if (e.code === 'Space') { e.preventDefault(); S.playing ? pause() : play(); }
    else if (e.code === 'ArrowRight') seek(S.t + (e.shiftKey ? 1 : 1 / S.plan.fps));
    else if (e.code === 'ArrowLeft') seek(S.t - (e.shiftKey ? 1 : 1 / S.plan.fps));
    else if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey && !e.altKey && !S.exporting) { e.preventDefault(); omakase(); }
  });
  window.addEventListener('resize', () => { sizeViewport(); drawTimeline(); });
  if (window.ResizeObserver) new ResizeObserver(() => { sizeViewport(); drawTimeline(); }).observe($('viewport'));
}

/* song file -> beat analysis (file input, or a host such as the After Effects panel) */
async function loadAudioFile(f) {
  $('audioName').textContent = '解析中…';
  try {
    pause();
    S.audio = await J.analyzeAudio(f);
    $('audioName').textContent = `${f.name}（${J.fmtTime(S.audio.duration)}・約${S.audio.bpm}BPM）`;
    S.project.timing.snap = true;
    syncUI(); replan();
    return true;
  } catch (err) { $('audioName').textContent = '読み込めませんでした: ' + err.message; S.audio = null; return false; }
}

/* ---------------- boot ---------------- */
function boot() {
  S.project = loadLocal();
  bind(); initVolume(); syncUI(); syncLoopBtn(); replan();
  let mode = 'easy'; try { mode = localStorage.getItem('jizura.mode') || 'easy'; } catch (e) {}
  setMode(mode); commit();
  // open on a representative frame (end of the first cut's entrance)
  const c0 = S.plan.cuts.find(c => c.line >= 0);
  if (c0) seek(c0.start + Math.min(c0.dur * 0.6, c0.inDur + 0.25));
  requestAnimationFrame(tick);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
J.ui = S;
// hooks for hosts that embed the app (the After Effects CEP panel)
J.uiApi = { toast, replan, syncUI, pause, seek, flushSave, loadAudioFile, restartPreview };
})();
