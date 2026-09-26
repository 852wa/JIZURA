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
  pen: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 13l1-3.5L11 2.5l2.5 2.5L6.5 12z"/><path d="M9.5 4l2.5 2.5"/></svg>',
  tap: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="2.2" fill="currentColor"/><circle cx="8" cy="8" r="5.5"/></svg>',
  range: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 3v10M13 3v10"/><path d="M5.5 8h5M8.5 5.5L11 8l-2.5 2.5"/></svg>',
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
  o.locks = { tech: {}, params: {} };
  // project files are untrusted: only plain keys may be locked, and only on (never a value we did not write)
  for (const [g, on] of Object.entries((p && p.locks && p.locks.tech) || {})) if (on === true && /^[\w-]+$/.test(g)) o.locks.tech[g] = true;
  for (const [k, on] of Object.entries((p && p.locks && p.locks.params) || {})) if (on === true && /^[\w-]+$/.test(k)) o.locks.params[k] = true;
  delete o.appVersion;
  // project files are untrusted: colours must be colours, font keys plain keys (they end up in the page's HTML / CSS)
  o.colors = { enabled: !!(p && p.colors && p.colors.enabled) };
  for (const [k, v] of Object.entries((p && p.colors) || {})) {
    if (k === 'enabled') continue;
    if (typeof v === 'boolean') o.colors[k] = v;
    else if (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v)) o.colors[k] = v;
  }
  o.userFonts = (Array.isArray(p && p.userFonts) ? p.userFonts : []).filter(uf => uf && J.SAFE_FONT_KEY.test(uf.key))
    .map(uf => ({ key: uf.key, label: String(uf.label || uf.key).slice(0, 80), family: J.safeFamily(uf.family || uf.key.slice(5)), weight: J.clamp(parseInt(uf.weight, 10) || 400, 100, 900) }));
  for (const uf of o.userFonts) if (!J.FONTS[uf.key]) J.addUserFont(uf.key, uf.label, uf.family, uf.weight);
  o.fonts = {};
  for (const [role, k] of Object.entries((p && p.fonts) || {})) if (typeof k === 'string' && J.FONTS[k] && /^[\w-]+$/.test(role)) o.fonts[role] = k;
  return o;
}
const SET_UI = { horror: { name: 'ホラー', badge: 'ホ' }, typo: { name: '文字PV系', badge: '文' }, kinetic: { name: 'キネティック', badge: 'キ' } };
function setBadges(d) {
  return (d && d.extra ? '<span class="set-badge ex" title="最初の公開版のあとに追加">追加</span>' : '') + (d && d.wa ? '<span class="set-badge" title="和風の演出">和</span>' : '')
    + (d && d.set && SET_UI[d.set] ? `<span class="set-badge set-${d.set}" title="${SET_UI[d.set].name}">${SET_UI[d.set].badge}</span>` : '');
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
  // lines locked in older projects (seed only): take a snapshot now, so from here on they stay exactly as they are
  for (const [i, o] of Object.entries(S.project.overrides || {})) if (o && o.lock && !Array.isArray(o.lockedCuts)) { const snap = J.lineSnapshot(S.plan, +i); if (snap) o.lockedCuts = snap; }
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
  const key = txt + '|' + keys.join(',') + '|' + Object.keys(J.FONTS).length + '|' + J.lang;   // the lyric language changes the faces
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
// 固定表示: on wide & tall windows the page itself doesn't scroll (see style.css html.fixed-ok)
const FIXED_MQ = window.matchMedia ? window.matchMedia('(min-width: 1181px) and (min-height: 620px)') : null;
document.documentElement.classList.add('fixed-ok');
function fixedLayout() { return !!(FIXED_MQ && FIXED_MQ.matches) && document.documentElement.classList.contains('fixed-ok'); }
function sizeViewport() {
  const vp = $('viewport'), c = $('view');
  const ar = S.plan.W / S.plan.H;
  let cssW = vp.clientWidth || 800, cssH = cssW / ar;
  // fixed workspace: the viewport gets whatever height is left under the header / above the transport and timeline
  const maxH = fixedLayout() ? Math.max(160, vp.clientHeight - 2) : Math.max(220, window.innerHeight * 0.68);
  if (cssH > maxH) { cssH = maxH; cssW = cssH * ar; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pw = Math.round(Math.min(S.plan.W, cssW * dpr)), ph = Math.round(pw / ar);
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
  c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
  S.need = true;
}
// preview only: dotted outline of the centre that 中央を空ける keeps free (never in exports)
function drawCenterGuide(ctx, k) {
  const P = S.plan, z = P.zones; if (!z) return;
  const r = z[0].side === 'left' ? [z[0].w, 0, P.W - z[0].w - z[1].w, P.H] : [0, z[0].h, P.W, P.H - z[0].h - z[1].h];
  ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.setLineDash([14, 10]); ctx.lineWidth = 2 / k * 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.strokeRect(r[0] + 4, r[1] + 4, r[2] - 8, r[3] - 8);
  ctx.setLineDash([]); ctx.restore();
}
function draw() {
  const c = $('view'), ctx = c.getContext('2d');
  const t0 = performance.now();
  S.renderer.frame(ctx, S.plan, S.t, { scale: c.width / S.plan.W, fast: S.playing && S.slow });
  if (S.plan.centerFree) drawCenterGuide(ctx, c.width / S.plan.W);
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
    followTlPlayhead();
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
// zoomable view: [TL.off, TL.off + D / TL.z] seconds; line starts are draggable handles in the top band
const layoutHue = k => (J.LAYOUT_ORDER.indexOf(k) * 37 + 30) % 360;
const TL = { z: 1, off: 0, hover: -1, drag: -1 };
function tlView() {
  const D = Math.max(0.001, S.plan.duration), vd = D / TL.z;
  TL.off = J.clamp(TL.off, 0, Math.max(0, D - vd));
  return { D, vd, off: TL.off };
}
function tlZoom(f, tc) {
  const { D, vd } = tlView();
  const z = J.clamp(TL.z * f, 1, Math.max(1, D / 2));
  const c = tc == null ? S.t : tc, frac = (c - TL.off) / vd;
  TL.z = z; TL.off = c - frac * (D / z); tlView(); drawTimeline();
}
// while playing zoomed in: redraw (which scrolls the view) once the playhead leaves the visible part
function followTlPlayhead() {
  if (!(TL.z > 1) || TL.drag >= 0) return;
  const { vd, off } = tlView();
  if (S.t < off || S.t > off + vd * 0.92) drawTimeline();
}
function drawTimeline() {
  const c = $('timeline'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(10, Math.round(c.clientWidth * dpr)), h = Math.max(10, Math.round(c.clientHeight * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  let { D, vd, off } = tlView();
  // follow the playhead while playing (zoomed in)
  if (TL.z > 1 && S.playing && TL.drag < 0 && (S.t < off || S.t > off + vd * 0.92)) { TL.off = S.t - vd * 0.1; ({ D, vd, off } = tlView()); }
  const x = c.getContext('2d'), X = t => (t - off) / vd * w, T = px => off + px / w * vd;
  x.fillStyle = '#131316'; x.fillRect(0, 0, w, h);
  if (S.audio && S.audio.peaks) {
    const pk = S.audio.peaks, n = pk.length, sd = S.audio.duration;
    x.fillStyle = '#2b2b33';
    for (let i = 0; i < w; i += 2) { const t = T(i); if (t > sd) break; if (t < 0) continue; const v = pk[Math.min(n - 1, Math.floor(t / sd * n))]; const hh = v * h * 0.8; x.fillRect(i, h * 0.6 - hh / 2, 1.5, hh); }
  }
  const beats = S.plan.beats || [];
  x.fillStyle = '#3a3a44';
  for (const b of beats) { if (b < off) continue; if (b > off + vd) break; x.fillRect(Math.round(X(b)), h - 6 * dpr, 1, 6 * dpr); }
  const top = h * 0.3, bot = h - 8 * dpr;
  const R = exportRange();
  if (R) { x.fillStyle = 'rgba(245,165,12,0.10)'; x.fillRect(X(R.t0), 0, X(R.t1) - X(R.t0), h); }
  for (const cut of S.plan.cuts) {
    const x0 = X(cut.start), x1 = X(cut.end);
    if (x1 < 0 || x0 > w) continue;
    const hue = layoutHue(cut.layout);
    x.fillStyle = `hsla(${hue},70%,58%,0.28)`; x.fillRect(x0, top, Math.max(1, x1 - x0 - 1), bot - top);
    x.fillStyle = `hsla(${hue},80%,62%,0.95)`; x.fillRect(x0, top, Math.max(1, 2 * dpr), bot - top);
    if (x1 - x0 > 34 * dpr) {
      x.fillStyle = 'rgba(236,231,225,0.85)'; x.font = `${10 * dpr}px ${getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace'}`;
      x.save(); x.beginPath(); x.rect(x0, top, x1 - x0 - 3, bot - top); x.clip();
      x.fillText(TL.z > 3 && cut.text ? cut.text : ((J.LAYOUTS[cut.layout] || {}).name || cut.layout), x0 + 5 * dpr, top + 13 * dpr); x.restore();
    }
  }
  x.font = `${10 * dpr}px monospace`;
  const LT = S.project.timing.lineTimes || {};
  for (const ln of S.plan.lines) {
    const lx = X(ln.start);
    if (lx < -20 * dpr || lx > w + 2) continue;
    const on = ln.index === TL.drag || ln.index === TL.hover, man = LT[ln.index] != null;
    x.fillStyle = on ? '#f5a50c' : man ? '#6fb7c8' : '#5d5a63'; x.fillRect(lx - (on ? dpr : 0), 0, on ? 2 * dpr : 1, top);
    // handle
    x.beginPath(); x.moveTo(lx - 5 * dpr, 0); x.lineTo(lx + 5 * dpr, 0); x.lineTo(lx, 7 * dpr); x.closePath(); x.fill();
    x.fillStyle = on ? '#f5a50c' : '#8e8a94'; x.fillText(String(ln.index + 1).padStart(2, '0') + (ln.interlude ? ' 間奏' : ''), lx + 4 * dpr, 17 * dpr);
  }
  if (TL.z > 1) {                                          // where the view sits in the whole song
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, h - 2 * dpr, w, 2 * dpr);
    x.fillStyle = '#f5a50c'; x.fillRect(off / D * w, h - 2 * dpr, Math.max(4, vd / D * w), 2 * dpr);
  }
  if (S.loop === 'line' || S.loop === 'cut') {
    const r = activeLoopRange();
    x.fillStyle = 'rgba(245,165,12,0.16)';
    x.fillRect(X(r.start), 0, Math.max(2 * dpr, X(r.end) - X(r.start)), h);
  }
  const px = X(S.t);
  x.fillStyle = '#f5a50c'; x.fillRect(Math.round(px) - dpr, 0, 2 * dpr, h);
}
function tlTime(ev) {
  const r = $('timeline').getBoundingClientRect(), { vd, off } = tlView();
  return off + J.clamp((ev.clientX - r.left) / r.width, 0, 1) * vd;
}
function timelineSeek(ev) { seek(tlTime(ev)); }
/* the line whose start handle is under the pointer (top band, ±7px) */
function tlHandleAt(ev) {
  const c = $('timeline'), r = c.getBoundingClientRect(), { vd, off } = tlView();
  if (ev.clientY - r.top > r.height * 0.45) return -1;
  let best = -1, bd = 8;
  for (const ln of S.plan.lines) { const d = Math.abs((ln.start - off) / vd * r.width - (ev.clientX - r.left)); if (d < bd) { bd = d; best = ln.index; } }
  return best;
}
function tlDragTo(i, ev) {
  let t = tlTime(ev);
  if (!ev.shiftKey && S.plan.beats && S.plan.beats.length) {       // snap to the nearest beat (Shift: free)
    let bt = null, bd = 0.12; for (const b of S.plan.beats) { const d = Math.abs(b - t); if (d < bd) { bd = d; bt = b; } if (b > t + 0.2) break; }
    if (bt != null) t = bt;
  }
  const L = S.plan.lines, lo = i > 0 ? L[i - 1].start + 0.2 : 0, hi = i < L.length - 1 ? L[i + 1].start - 0.2 : S.plan.duration - 0.2;
  t = +J.clamp(t, lo, Math.max(lo, hi)).toFixed(3);
  if (!S.project.timing.lineTimes) S.project.timing.lineTimes = {};
  // pin the neighbours too, so moving one boundary never shifts the lines after it
  L.forEach(ln => { if (S.project.timing.lineTimes[ln.index] == null) S.project.timing.lineTimes[ln.index] = +ln.start.toFixed(3); });
  S.project.timing.lineTimes[i] = t;
  replan(); seek(t + 0.001);
}

/* ---------------- keep the playing line in view (the list scrolls inside its column) ---------------- */
let listTouched = 0;
function followLine(li) {
  if (!S.playing || li < 0 || !fixedLayout()) return;
  if (performance.now() - listTouched < 2500) return;                       // the user is scrolling the list
  const el = S.lineEls[li], col = el && el.closest('.col-left');
  if (!el || !col || col.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const tp = $('tapPanel'), pad = tp && !tp.hidden ? tp.offsetHeight + 12 : 8;   // 固定表示中のタップboxの下に隠れないように
  const r = el.getBoundingClientRect(), c = col.getBoundingClientRect();
  if (r.top >= c.top + pad && r.bottom <= c.bottom - 8) return;
  col.scrollTo({ top: col.scrollTop + (r.top - c.top) - Math.max(c.height * 0.3, pad + 24), behavior: 'smooth' });
}
function bindFollow() {
  const col = document.querySelector('.col-left'); if (!col) return;
  const touch = () => { listTouched = performance.now(); };
  col.addEventListener('wheel', touch, { passive: true }); col.addEventListener('touchmove', touch, { passive: true }); col.addEventListener('pointerdown', touch);
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
function cutQuietSlot(line, k) {
  const o = (S.project.overrides || {})[line] || {};
  return (o.cutQuiet && (o.cutQuiet[k] || o.cutQuiet[String(k)])) || {};
}
function markCutQuiet(i, k, groups, on) {
  if (i == null || i < 0 || k == null || k < 0) return;
  const cur = Object.assign({}, S.project.overrides[i] || {});
  const cutQuiet = Object.assign({}, cur.cutQuiet || {});
  const q = Object.assign({}, cutQuiet[k] || cutQuiet[String(k)] || {});
  delete cutQuiet[String(k)];
  groups.forEach(g => { if (on) q[g] = true; else delete q[g]; });
  if (Object.keys(q).length) cutQuiet[k] = q; else delete cutQuiet[k];
  if (Object.keys(cutQuiet).length) cur.cutQuiet = cutQuiet; else delete cur.cutQuiet;
  if (Object.keys(cur).length) S.project.overrides[i] = cur; else delete S.project.overrides[i];
}
/* レイアウト文字: per-cut override of the texts the layout puts on screen.
   Same key as cutTech (the cut's index inside its line); an entry is what the user
   actually changed, so an empty object = no override. */
function cutTextSlot(line, k) {
  const o = (S.project.overrides || {})[line] || {};
  return (o.cutText && (o.cutText[k] || o.cutText[String(k)])) || {};
}
function setCutText(line, k, patch) {
  if (line == null || line < 0 || k == null || k < 0) return;
  const cur = Object.assign({}, S.project.overrides[line] || {});
  const all = Object.assign({}, cur.cutText || {});
  let slot = patch === null ? {} : Object.assign({}, all[k] || all[String(k)] || {}, patch);
  delete all[String(k)];
  Object.keys(slot).forEach(key => { if (slot[key] == null || slot[key] === false || slot[key] === '') delete slot[key]; });
  if (Object.keys(slot).length) all[k] = slot; else delete all[k];
  if (Object.keys(all).length) cur.cutText = all; else delete cur.cutText;
  if (Object.keys(cur).length) S.project.overrides[line] = cur; else delete S.project.overrides[line];
}
function cutTextOn(cut, k) {
  return k >= 0 && cut && Object.keys(cutTextSlot(cut.line, k)).length > 0;
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
function pickEnabledTech(g, opts) {
  opts = opts || {};
  const tbl = J.registry(g) || {};
  const en = (S.project.enabled || {})[g] || {};
  let keys = J.order(g).filter(key => {
    const def = tbl[key];
    if (!def || def.special) return false;
    if (en[key] === false) return false;
    return !J.randomOk || J.randomOk(S.project, g, key);
  });
  if (!keys.length) keys = J.order(g).filter(key => tbl[key] && !tbl[key].special && en[key] !== false);
  if (g === 'layout' && opts.n != null) {
    const fit = keys.filter(key => !J.LAYOUTS[key].fits || J.LAYOUTS[key].fits(opts.n));
    if (fit.length) keys = fit;
  }
  if (opts.allowNone && !keys.includes('none')) keys = ['none'].concat(keys);
  if (opts.avoid && keys.length > 1) keys = keys.filter(key => key !== opts.avoid);
  if (!keys.length) return '';
  return keys[(Math.random() * keys.length) | 0];
}
function rerollCurrentCut(kind) {
  if (S.exporting || S.tap) return;
  const cut = J.cutAt(S.plan, S.t);
  const k = lyricCutK(cut);
  if (!cut || k < 0) { toast('この位置のカットは抽選できません'); return; }
  remember();
  const n = [...String(cut.text || '').replace(/\s+/g, '')].length;
  const groups = kind === 'omakase'
    ? CHIP_GROUPS.map(x => x[0])
    : ['layout', 'enter', 'hold', 'exit', 'cam', 'trans'];
  const t0 = S.t;
  groups.forEach(g => {
    const allowNone = g === 'decor' || g === 'trans';
    const key = pickEnabledTech(g, { avoid: kind === 'omakase' ? cutGroupVal(cut, g) : null, allowNone, n });
    if (key) setCutTech(cut.line, k, g, key);
  });
  markCutQuiet(cut.line, k, groups, true);
  closeCutPick();
  replan();
  commit();
  seek(t0);
  toast(kind === 'omakase' ? 'このカットをおまかせ' : 'このカットをシャッフル');
}
function updateCutInfo() {
  const cut = J.cutAt(S.plan, S.t);
  const idx = cut ? cut.index : -1;
  const li = cut ? cut.line : -1;
  if (li !== S.curLine) { S.lineEls.forEach((el, i) => el.classList.toggle('cur', i === li)); S.curLine = li; followLine(li); }
  if (idx === lastCutIdx) return;
  lastCutIdx = idx;
  const el = $('cutInfo');
  if (!cut) { el.innerHTML = '<span class="hint">この位置にカットはありません</span>'; closeCutPick(); closeCutTx(); return; }
  if (S.mode !== 'pro') {          // かんたん／スマホは本家と同じ静的なチップ表示
    closeCutPick();
    closeCutTx();
    const chip = (cls, k, v) => `<span class="chip ${cls}"><b>${k}</b>${v}</span>`;
    const n = (tbl, k) => (tbl[k] ? tbl[k].name : k);
    el.innerHTML = [
      `<span class="chip mono">#${String(cut.index + 1).padStart(2, '0')}</span>`,
      chip('l', 'レイアウト', n(J.LAYOUTS, cut.layout)), chip('e', '登場', n(J.ENTER, cut.enter)), chip('h', '保持', n(J.HOLD, cut.hold)), chip('x', '退場', n(J.EXIT, cut.exit)),
      cut.decor && cut.decor.length ? chip('', '装飾', cut.decor.map(d => n(J.DECOR, d.id)).join('・')) : '',
      cut.treat && cut.treat !== 'none' ? chip('t', '加工', n(J.TREAT, cut.treat)) : '',
      cut.bg && cut.bg !== 'none' ? chip('b', '背景', n(J.BG, cut.bg)) : '',
      cut.cam && cut.cam !== 'push' ? chip('c', 'カメラ', n(J.CAMERA, cut.cam)) : '',
      cut.trans ? chip('c', 'つなぎ', n(J.TRANS, cut.trans)) : '',
    ].join('');
    return;
  }
  const k = lyricCutK(cut);
  const slot = k >= 0 ? cutTechSlot(cut.line, k) : {};
  const quiet = k >= 0 ? cutQuietSlot(cut.line, k) : {};
  const bits = [`<span class="chip mono">#${String(cut.index + 1).padStart(2, '0')}</span>`];
  CHIP_GROUPS.forEach(([g, cls, label]) => {
    const forced = slot[g] != null && slot[g] !== '' && !quiet[g];
    bits.push(`<button type="button" class="chip ${cls}${forced ? ' is-forced' : ''}" data-g="${g}" aria-pressed="${cutPick.g === g ? 'true' : 'false'}" ${k < 0 ? 'disabled' : ''}><b>${label}</b>${escapeHtml(groupName(g, cutGroupVal(cut, g)))}</button>`);
    if (g === 'layout') {
      const on = cutTextOn(cut, k);
      const open = cutTx.open && cutTx.line === cut.line && cutTx.k === k;
      bits.push(`<button type="button" class="chip l${on ? ' is-forced' : ''}" data-tx="1" aria-pressed="${open ? 'true' : 'false'}" ${k < 0 ? 'disabled' : ''} title="このカットのレイアウトが出す文字を調整"><b>レイアウト文字</b>${on ? '調整中' : 'レイアウトの文字'}</button>`);
    }
  });
  bits.push(`<button type="button" class="ghost small cut-roll" data-roll="shuffle" ${k < 0 ? 'disabled' : ''} title="このカットだけ構成を再抽選">シャッフル</button>`);
  bits.push(`<button type="button" class="ghost small cut-roll accent" data-roll="omakase" ${k < 0 ? 'disabled' : ''} title="このカットだけ手法をランダムに">おまかせ</button>`);
  el.innerHTML = bits.join('');
  if (k >= 0) {
    el.querySelectorAll('button.chip[data-g]').forEach(b => b.addEventListener('click', () => toggleCutPick(b.dataset.g, cut, k)));
    el.querySelectorAll('button.cut-roll').forEach(b => b.addEventListener('click', () => rerollCurrentCut(b.dataset.roll)));
    const tb = el.querySelector('button.chip[data-tx]');
    if (tb) tb.addEventListener('click', () => toggleCutTx(cut, k));
    // the panel follows the playhead, exactly like the 手法 picker does
    if (cutTx.open && (cutTx.line !== cut.line || cutTx.k !== k)) {
      cutTx.line = cut.line; cutTx.k = k;
      fillCutTx(cut, k);
    }
  }
  followCutPick(cut, k);
}
function followCutPick(cut, k) {
  if (S.mode !== 'pro' || !cutPick.g) return;
  const p = $('cutPick');
  if (!cut || k < 0) {
    cutPick.g = null; cutPick.line = -1; cutPick.k = -1;
    if (p) p.hidden = true;
    return;
  }
  cutPick.line = cut.line;
  cutPick.k = k;
  if (p) p.hidden = false;
  fillCutPick();
}
function closeCutPick() {
  cutPick.g = null; cutPick.line = -1; cutPick.k = -1;
  const p = $('cutPick'); if (p) p.hidden = true;
  lastCutIdx = -2;
}
function toggleCutPick(g, cut, k) {
  if (S.mode !== 'pro') return;
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
  const cut = J.cutAt(S.plan, S.t);
  $('cutPickTitle').textContent = (meta ? meta[2] : g) + (cut ? ' · #' + String(cut.index + 1).padStart(2, '0') : '');
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
/* ---------------- レイアウト文字: what this cut's layout actually writes on screen -------------
   The rows come from J.txProbe(), which runs the layout once with the recorder in place, so the
   panel lists exactly the texts this layout draws (a layout that never draws a serial number
   simply shows no row for it). */
const cutTx = { open: false, line: -1, k: -1 };
const TX_ROWS = {
  'main':       '本文',
  'main:split': '本文（1文字ずつ配置）',
  'line':       '行の残り（前後の語）',
  'note':       '注釈',
  'romaji':     '自動ローマ字',
  'no':         '通し番号',
  'time':       '時刻',
  'title':      '曲名',
  'other':      'その他（レイアウト独自の文字）',
};
const TX_HIDE = { 'main': 'hideMain', 'main:split': 'hideMain', line: 'hideLine', note: 'hideNote', romaji: 'hideRomaji', no: 'hideNo', time: 'hideTime', title: 'hideTitle', other: 'hideOther' };
const TX_EDIT = { 'main': 'main', note: 'note', title: 'title', 'main:split': 'main' };

function closeCutTx() {
  cutTx.open = false; cutTx.line = -1; cutTx.k = -1;
  const p = $('cutTx'); if (p) p.hidden = true;
}
function toggleCutTx(cut, k) {
  if (S.mode !== 'pro' || !cut || k < 0) return;
  if (cutTx.open && cutTx.line === cut.line && cutTx.k === k) { closeCutTx(); lastCutIdx = -2; updateCutInfo(); return; }
  closeCutPick();
  cutTx.open = true; cutTx.line = cut.line; cutTx.k = k;
  const p = $('cutTx'); if (p) p.hidden = false;
  fillCutTx(cut, k);
  lastCutIdx = -2; updateCutInfo();
}
function refreshCutTx() {
  if (!cutTx.open) return;
  const cut = S.plan && S.plan.cuts.find(c => c.line === cutTx.line && lyricCutK(c) === cutTx.k);
  if (cut) fillCutTx(cut, cutTx.k); else closeCutTx();
}
function fillCutTx(cut, k) {
  const body = $('cutTxBody'); if (!body) return;
  const ttl = $('cutTxTitle');
  if (ttl) ttl.textContent = 'レイアウト文字 · #' + String(cut.index + 1).padStart(2, '0');
  const slot = cutTextSlot(cut.line, k);
  const rows = J.txProbe(cut, S.plan);
  body.innerHTML = '';
  if (!rows.length) {
    const p = document.createElement('p');
    p.className = 'muted tx-none';
    p.textContent = 'このレイアウトは画面に文字を出しません。';
    body.appendChild(p);
    return;
  }
  rows.forEach(tok => {
    const name = TX_ROWS[tok]; if (!name) return;
    const hideKey = TX_HIDE[tok], editKey = TX_EDIT[tok];
    const base = tok === 'note' ? String(cut.note || '')
      : tok === 'title' ? String((cut.params || {}).titleText || '')
      : String(cut.text || '');
    const row = document.createElement('div');
    row.className = 'tx-row' + (slot[hideKey] ? ' is-off' : '');
    const lab = document.createElement('label');
    lab.className = 'tx-lab';
    const chk = document.createElement('input');
    chk.type = 'checkbox'; chk.checked = !slot[hideKey];
    chk.addEventListener('change', () => {
      setCutText(cutTx.line, cutTx.k, { [hideKey]: chk.checked ? null : true });
      replan(); refreshCutTx();
    });
    lab.appendChild(chk);
    const nm = document.createElement('span'); nm.textContent = name; lab.appendChild(nm);
    row.appendChild(lab);
    if (editKey && tok !== 'main:split') {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'tx-in';
      inp.value = slot[editKey] != null ? String(slot[editKey]) : base;
      inp.placeholder = base;
      inp.addEventListener('change', () => {
        const v = inp.value;
        setCutText(cutTx.line, cutTx.k, { [editKey]: (v === base || v.trim() === '') ? null : v });
        replan(); refreshCutTx();
      });
      row.appendChild(inp);
    } else if (tok === 'main:split') {
      const h = document.createElement('span');
      h.className = 'muted tx-hint';
      h.textContent = 'このレイアウトは1文字ずつ並べるので、差し替えはできません（表示／非表示だけ）。';
      row.appendChild(h);
    }
    body.appendChild(row);
  });
}


/* ---------------- line list ---------------- */
function renderLines() {
  const ol = $('lineList'); ol.innerHTML = ''; S.lineEls = []; S.curLine = -2;
  const ov = S.project.overrides, R = exportRangeLines();
  const layoutOpts = '<option value="">自動</option>' + J.LAYOUT_ORDER.map(k => `<option value="${k}">${J.LAYOUTS[k].name}</option>`).join('');
  const cutOpts = '<option value="">カット 自動</option>' + [1, 2, 3, 4, 5, 6].map(n => `<option value="${n}">カット ${n}</option>`).join('');
  S.plan.lines.forEach((ln, i) => {
    const o = ov[i] || {};
    const li = document.createElement('li'); li.className = 'ln' + (ln.interlude ? ' is-inter' : '') + (R && i >= R.from && i <= R.to ? ' in-range' : '');
    const manual = S.project.timing.lineTimes && S.project.timing.lineTimes[i] != null;
    const label = ln.interlude ? `〔間奏${ln.secs ? ' ' + ln.secs + '秒' : ''}〕` : ln.text;
    li.innerHTML = `<span class="no">${String(i + 1).padStart(2, '0')}</span>
      <input class="time mono" type="number" step="0.01" min="0" value="${ln.start.toFixed(2)}" title="開始（秒）${manual ? '・手動' : '・自動'}" aria-label="${i + 1}行目の開始秒" style="${manual ? 'border-color:var(--cyan)' : ''}">
      <span class="txt" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
      <div class="meta"><span class="cuts"></span>
      <span class="tools">
        <button class="icon ghost edit" title="この行の歌詞を直す" aria-label="${i + 1}行目の歌詞を直す">${ICON.pen}</button>
        ${ln.interlude ? '' : `<select class="ncut" aria-label="${i + 1}行目のカット数">${cutOpts}</select>`}
        ${ln.interlude ? '' : `<select class="lay pro-only" aria-label="レイアウト指定">${layoutOpts}</select>`}
        <button class="icon ghost tapfrom" title="この行からタップで同期し直す" aria-label="${i + 1}行目からタップ">${ICON.tap}</button>
        <button class="icon ghost rng" title="書き出す範囲にする（Shift+クリックで範囲を広げる）" aria-pressed="${R && i >= R.from && i <= R.to ? 'true' : 'false'}" aria-label="${i + 1}行目を書き出す範囲に">${ICON.range}</button>
        ${ln.interlude ? '' : `<button class="icon ghost dice" title="この行を再抽選">${ICON.dice}</button>`}
        ${ln.interlude ? '' : `<button class="icon ghost lock" title="この行の構成をロック" aria-pressed="${o.lock ? 'true' : 'false'}">${ICON.lock}</button>`}
      </span></div>`;
    const q = sel => li.querySelector(sel);
    if (q('.lay')) q('.lay').value = o.layout || '';
    if (q('.ncut')) q('.ncut').value = o.cuts ? String(o.cuts) : '';
    q('.time').addEventListener('change', e => {
      const v = parseFloat(e.target.value);
      pushEdit();
      if (!S.project.timing.lineTimes) S.project.timing.lineTimes = {};
      if (isFinite(v)) S.project.timing.lineTimes[i] = Math.max(0, v); else delete S.project.timing.lineTimes[i];
      replan();
    });
    q('.txt').addEventListener('click', () => seek(ln.start + 0.001));
    q('.txt').addEventListener('dblclick', () => editLine(li, ln));
    q('.edit').addEventListener('click', () => editLine(li, ln));
    if (q('.lay')) q('.lay').addEventListener('change', e => { setOv(i, { layout: e.target.value || undefined }); replan(); });
    if (q('.ncut')) q('.ncut').addEventListener('change', e => { remember(); setOv(i, { cuts: +e.target.value || undefined, single: undefined }); replan(); commit(); seek(ln.start + 0.001); });
    q('.tapfrom').addEventListener('click', () => startTap(i));
    q('.rng').addEventListener('click', e => setExportRange(i, e.shiftKey));
    if (q('.dice')) q('.dice').addEventListener('click', () => { const cur = ov[i] || {}; setOv(i, { seed: (cur.seed | 0) + 1, lock: false, lockedSeed: undefined, lockedCuts: undefined }); replan(); seek(ln.start + 0.001); });
    if (q('.lock')) q('.lock').addEventListener('click', () => {
      const cur = ov[i] || {};
      if (cur.lock) setOv(i, { lock: false, lockedSeed: undefined, lockedCuts: undefined });
      else setOv(i, { lock: true, lockedSeed: ln.seed, lockedCuts: J.lineSnapshot(S.plan, i) || undefined });
      replan();
    });
    const cutsEl = q('.cuts');
    S.plan.cuts.filter(c => c.line === i && J.LAYOUTS[c.layout] && !J.LAYOUTS[c.layout].special).forEach((c, k) => {
      const forced = o.cutLayouts && o.cutLayouts[k];
      const sel = document.createElement('select');
      sel.className = 'cut-lay pro-only' + (forced ? ' is-forced' : '');
      sel.innerHTML = layoutOpts;
      sel.value = forced || c.layout;
      sel.title = `${c.text}｜${J.ENTER[c.enter].name} → ${J.EXIT[c.exit].name}`;
      sel.setAttribute('aria-label', `${i + 1}行目 カット${k + 1}のレイアウト`);
      sel.style.borderColor = `hsla(${layoutHue(c.layout)},70%,58%,0.7)`;
      sel.addEventListener('pointerdown', () => seek(c.start + Math.min(c.dur * 0.5, c.inDur + 0.05)));
      sel.addEventListener('change', e => { setCutLayout(i, k, e.target.value); replan(); seek(c.start + Math.min(c.dur * 0.5, c.inDur + 0.05)); });
      cutsEl.appendChild(sel);
    });
    // スマホ: a row is one line of text; tapping it opens its tools (and jumps there)
    if (S.openLine === i) li.classList.add('open');
    li.addEventListener('click', e => {
      if (S.mode !== 'mobile' || e.target.closest('button, select, input, .cuts')) return;
      const was = li.classList.contains('open');
      S.lineEls.forEach(x => x.classList.remove('open'));
      if (!was) { li.classList.add('open'); S.openLine = i; } else S.openLine = -1;
    });
    ol.appendChild(li); S.lineEls.push(li);
  });
  $('linesInfo').textContent = `${S.plan.lines.length}行 / ${S.plan.cuts.length}カット`;
  syncRangeUI();
}

/* ---------------- 行から歌詞を直す ---------------- */
// the lyrics text is the source: a plan line knows the row it came from (ln.src); LRC time tags on that row are kept
const LRC_PREFIX = /^\s*(?:\[\d+:\d+(?:[.:]\d+)?\])*/;
function editLine(li, ln) {
  if (ln.src == null || li.querySelector('.txt-edit')) return;
  const rows = S.project.lyrics.replace(/\r/g, '').split('\n'), row = rows[ln.src] || '';
  const pre = (row.match(LRC_PREFIX) || [''])[0], body = row.slice(pre.length).trim();
  const txt = li.querySelector('.txt'), inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'txt-edit'; inp.value = body; inp.setAttribute('aria-label', `${ln.index + 1}行目の歌詞`);
  inp.title = '記法（/ 区切り・*強調*・行末の ! ・| 注釈・[間奏 8]）もそのまま使えます。Enter で確定、Esc で取り消し';
  txt.replaceWith(inp); inp.focus(); inp.select();
  let done = false;
  const finish = ok => {
    if (done) return; done = true;
    const v = inp.value.trim();
    if (ok && v && v !== body) {
      pushEdit();
      rows[ln.src] = pre + v;
      S.project.lyrics = rows.join('\n'); $('lyrics').value = S.project.lyrics;
      replan(); flushSave(); toast(`${ln.index + 1}行目の歌詞を直しました`);
    } else renderLines();
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); } });
  inp.addEventListener('blur', () => finish(true));
}

/* ---------------- 歌詞・タイミングの取り消し（Ctrl+Z） ---------------- */
// separate from the ◀ ▶ history of looks: lyric edits, dragged / typed / tapped line times
const ED = { undo: [], redo: [] };
const edSnap = () => JSON.stringify({ lyrics: S.project.lyrics, lineTimes: S.project.timing.lineTimes || {} });
function pushEdit() { const s = edSnap(); if (ED.undo[ED.undo.length - 1] !== s) ED.undo.push(s); if (ED.undo.length > 60) ED.undo.shift(); ED.redo = []; updateEditBtns(); }
function edGo(d) {
  const from = d < 0 ? ED.undo : ED.redo, to = d < 0 ? ED.redo : ED.undo;
  if (!from.length) return;
  const o = JSON.parse(from.pop()), cur = JSON.parse(edSnap());
  if ('ov' in o) { cur.ov = S.project.overrides; cur.range = S.project.exportRange || null; }   // clearLyrics() also cleared these
  to.push(JSON.stringify(cur));
  S.project.lyrics = o.lyrics; S.project.timing.lineTimes = o.lineTimes; $('lyrics').value = o.lyrics;
  if ('ov' in o) { S.project.overrides = o.ov || {}; S.project.exportRange = o.range || null; }
  replan(); flushSave(); updateEditBtns();
  toast(d < 0 ? '元に戻しました' : 'やり直しました');
}
// 歌詞を消す: lyrics + everything tied to line numbers (times, per-line settings, export range); undoable
function clearLyrics() {
  if (S.tap || S.exporting) return;
  const P = S.project;
  if (!P.lyrics.trim() && !Object.keys(P.timing.lineTimes || {}).length) { $('lyrics').focus(); return; }
  const snap = JSON.parse(edSnap()); snap.ov = P.overrides || {}; snap.range = P.exportRange || null;
  ED.undo.push(JSON.stringify(snap)); if (ED.undo.length > 60) ED.undo.shift(); ED.redo = [];
  pause();
  P.lyrics = ''; P.timing.lineTimes = {}; P.overrides = {}; P.exportRange = null; $('lyrics').value = '';
  replan(); flushSave(); updateEditBtns(); seek(0);
  toast('歌詞を消しました（「元に戻す」か Ctrl+Z で戻せます）');
}
// 初期化: back to a blank project — song (also the copy kept in this browser), settings and both histories go
let audioNameDefault = '';
async function resetAll() {
  if (S.exporting) return;
  if (S.tap) stopTap();
  pause();
  S.project = mergeProject(null); S.project.lyrics = '';
  S.audio = null; if ($('audioFile')) $('audioFile').value = '';
  if (J.forgetSong) await J.forgetSong();
  $('audioName').textContent = audioNameDefault;
  ED.undo = []; ED.redo = []; H.list = []; H.i = -1;
  TL.z = 1; TL.off = 0;
  $('lyrics').value = ''; fontKey = '';
  syncUI(); replan(); commit(); updateEditBtns(); flushSave(); seek(0);
  toast('初期化しました');
}
function updateEditBtns() { const u = $('btnUndoEdit'); if (u) u.disabled = !ED.undo.length; }

/* ---------------- 書き出す範囲（選んだ行だけ） ---------------- */
function exportRangeLines() {
  const r = S.project.exportRange, n = S.plan ? S.plan.lines.length : 0;
  if (!r || !n || !(r.from >= 0)) return null;
  const from = Math.min(n - 1, r.from | 0), to = Math.min(n - 1, Math.max(from, r.to | 0));
  return { from, to };
}
function exportRange() {
  const R = exportRangeLines(); if (!R) return null;
  const L = S.plan.lines, a = L[R.from], b = L[R.to], last = R.to === L.length - 1;
  const t0 = Math.max(0, a.start - 0.25);
  const t1 = last ? S.plan.duration : Math.min(L[R.to + 1].start, (b.interlude ? b.end : b.visEnd) + 0.35);
  return { t0, t1 };
}
function rangeSuffix() { const R = exportRangeLines(); if (!R) return ''; const f = n => String(n + 1).padStart(2, '0'); return '_L' + f(R.from) + (R.to > R.from ? '-' + f(R.to) : ''); }
function setExportRange(i, extend) {
  const R = exportRangeLines();
  if (extend && R) S.project.exportRange = { from: Math.min(R.from, i), to: Math.max(R.to, i) };
  else if (R && R.from === i && R.to === i) S.project.exportRange = null;          // click again: back to the whole song
  else S.project.exportRange = { from: i, to: i };
  flushSave(); renderLines();
  const R2 = exportRangeLines();
  toast(R2 ? `書き出す範囲：${R2.from + 1}${R2.to > R2.from ? '〜' + (R2.to + 1) : ''}行目` : '書き出す範囲：全体');
}
function syncRangeUI() {
  const R = exportRangeLines(), n = S.plan.lines.length;
  const opts = (sel, first) => `<option value="-1">${first}</option>` + S.plan.lines.map((ln, i) => `<option value="${i}">${String(i + 1).padStart(2, '0')} ${escapeHtml((ln.interlude ? '〔間奏〕' : ln.text).slice(0, 14))}</option>`).join('');
  document.querySelectorAll('.rngFrom').forEach(el => { el.innerHTML = opts(el, '全体'); el.value = R ? String(R.from) : '-1'; });
  document.querySelectorAll('.rngTo').forEach(el => { el.innerHTML = opts(el, '—'); el.value = R ? String(R.to) : '-1'; el.disabled = !R; });
  const r = exportRange();
  document.querySelectorAll('.rngInfo').forEach(el => { el.textContent = r ? `${J.fmtTime(r.t0)} 〜 ${J.fmtTime(r.t1)}（${(r.t1 - r.t0).toFixed(1)}秒）` : `全体（${S.plan.duration.toFixed(1)}秒）`; });
}
function bindRangeUI() {
  document.querySelectorAll('.rngFrom').forEach(el => el.addEventListener('change', () => {
    const v = +el.value, R = exportRangeLines();
    S.project.exportRange = v < 0 ? null : { from: v, to: R ? Math.max(v, R.to) : v };
    flushSave(); renderLines();
  }));
  document.querySelectorAll('.rngTo').forEach(el => el.addEventListener('change', () => {
    const v = +el.value, R = exportRangeLines(); if (!R) return;
    S.project.exportRange = v < 0 ? { from: R.from, to: R.from } : { from: Math.min(R.from, v), to: Math.max(R.from, v) };
    flushSave(); renderLines();
  }));
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
  if (Object.keys(slot).length) cutTech[k] = slot;
  else delete cutTech[k];
  if (Object.keys(cutTech).length) cur.cutTech = cutTech; else delete cur.cutTech;
  const cutQuiet = Object.assign({}, cur.cutQuiet || {});
  const q = Object.assign({}, cutQuiet[k] || cutQuiet[String(k)] || {});
  delete cutQuiet[String(k)];
  delete q[group];
  if (Object.keys(q).length) cutQuiet[k] = q; else delete cutQuiet[k];
  if (Object.keys(cutQuiet).length) cur.cutQuiet = cutQuiet; else delete cur.cutQuiet;
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
    b.title = st.desc + (off ? (st.extra && S.project.extra !== true ? '（追加分がオフのため、おまかせでは選ばれません）' : st.set && !J.setOn(S.project, st.set) ? '（このセットがオフのため、おまかせでは選ばれません）' : '（和風の演出がオフのため、おまかせでは選ばれません）') : '');
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
    return `<option value="${escapeHtml(k)}" ${sel === k ? 'selected' : ''}>${escapeHtml(f.label + alt)}</option>`;
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
function swatchHTML(cols) { return cols.filter(c => /^#[0-9a-f]{3,8}$/i.test(String(c))).map(c => `<i style="background:${c}" title="${c}"></i>`).join(''); }
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
const HKEYS = ['style', 'mood', 'seed', 'fx', 'enabled', 'fonts', 'colors', 'overrides', 'locks'];
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

/* ---------------- locks (what Randomize / Shuffle must not touch) ----------------
   project.locks = { tech: { group: true }, params: { key: true } }
   tech:   freezes that group's ON/OFF selection, i.e. the candidate count the panel shows (120/140, 28/28).
           Randomize re-picks which techniques are candidates, so freezing the pool is what keeps the count —
           this does not pin one technique in place.
   params: freezes the current value of the effects sliders, on-twos and flash.
   Neither goes into J.plan: they only bracket the places that rewrite the look (Randomize, mood reroll). */
const LOCK_TITLE_ON = 'おまかせ／シャッフルで変えないようにロック';
const TECH_LOCK_ON = 'おまかせでON／OFFを変えないようにロック';
const LOCK_TITLE_OFF = 'ロック中。クリックで解除';
function locksOf() {
  const P = S.project;
  if (!P.locks) P.locks = { tech: {}, params: {} };
  if (!P.locks.tech) P.locks.tech = {};
  if (!P.locks.params) P.locks.params = {};
  return P.locks;
}
function lockOn(k) { return !!locksOf().params[k]; }
function lockName(k) {
  const f = FX.find(x => x[0] === k);
  return f ? f[1] : k;
}
function groupLabel(g) { const m = GROUPS.find(x => x[0] === g); return m ? m[1] : g; }
function toggleTechLock(g) {
  const L = locksOf();
  remember();
  if (L.tech[g]) { delete L.tech[g]; toast('ロック解除：' + groupLabel(g)); }
  else { L.tech[g] = true; toast('ロック：' + groupLabel(g)); }
  commit(); autosave(); renderTech();
}
function toggleParamLock(k) {
  const L = locksOf();
  remember();
  if (L.params[k]) { delete L.params[k]; toast('ロック解除：' + lockName(k)); }
  else { L.params[k] = true; toast('ロック：' + lockName(k)); }
  commit(); autosave(); renderFx();
}
function lockedEnabled() {                        // ON/OFF selection of every locked group, as it is now
  const P = S.project, out = {};
  for (const g of Object.keys(locksOf().tech)) if (P.enabled && P.enabled[g]) out[g] = Object.assign({}, P.enabled[g]);
  return out;
}
function restoreEnabled(keep) {                   // put the locked groups back after Randomize
  const P = S.project;
  for (const g of Object.keys(keep || {})) { P.enabled = P.enabled || {}; P.enabled[g] = keep[g]; }
}
function lockedParams() {                         // current value of every locked effect / set switch
  const out = {}, L = locksOf(), F = S.project.fx;
  for (const k of Object.keys(L.params)) {
    if (!L.params[k]) continue;
    if (k === 'koma') out[k] = J.komaOf(F);                      // on-twos: freeze the effective value even when unset
    else if (k === 'flash') out[k] = !!F.flash;
    else if (F[k] != null) out[k] = F[k];
  }
  return out;
}
function restoreParams(keep) {
  const P = S.project;
  for (const k of Object.keys(keep || {})) P.fx[k] = keep[k];
}
function lockBtn(k, anchor) {                     // lock button for effects that are not sliders (on-twos, flash)
  const p = anchor.parentElement;
  let b = p.querySelector(':scope > .lk[data-lk="' + k + '"]');
  if (!b) {
    b = document.createElement('button');
    b.type = 'button'; b.className = 'icon ghost lk pro-only'; b.dataset.lk = k;
    b.innerHTML = ICON.lock;
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggleParamLock(k); });
    anchor.insertAdjacentElement('afterend', b);
  }
  const on = !!locksOf().params[k];
  b.setAttribute('aria-pressed', String(on));
  b.title = on ? LOCK_TITLE_OFF : LOCK_TITLE_ON;
  return b;
}

/* ---------------- おまかせ ---------------- */
function restartPreview() { seek(0); if (!S.playing && S.mode !== 'pro') play(); }
function omakase() {
  if (S.exporting || S.tap) return;
  remember();
  const keepE = lockedEnabled(), keepP = lockedParams();
  const r = J.omakase(S.project);
  Object.assign(S.project, r);
  restoreEnabled(keepE); restoreParams(keepP);
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
    const keepE = lockedEnabled(), keepP = lockedParams();
    const r = J.omakase(P);
    Object.assign(P, { mood: r.mood, fx: r.fx, enabled: r.enabled });
    restoreEnabled(keepE); restoreParams(keepP);
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
  const fontName = J.FONTS[fk] ? (J.faceOf ? J.faceOf(fk) : J.FONTS[fk]).label : fk;   // the face actually drawn for the lyric language
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
  S.mode = m === 'easy' ? 'easy' : m === 'mobile' ? 'mobile' : 'pro';
  const mobile = S.mode === 'mobile', easy = S.mode === 'easy' || mobile;   // スマホ = the かんたん panel, laid out for a phone
  $('app').classList.toggle('is-easy', easy);
  $('app').classList.toggle('is-mobile', mobile);
  $('app').classList.remove('menu-open'); $('btnMenu').setAttribute('aria-expanded', 'false');
  document.documentElement.classList.toggle('fixed-ok', !mobile);           // one scrolling page on a phone
  $('easyPanel').hidden = !easy;
  $('modeMobile').setAttribute('aria-pressed', String(mobile));
  $('modeEasy').setAttribute('aria-pressed', String(S.mode === 'easy'));
  $('modePro').setAttribute('aria-pressed', String(S.mode === 'pro'));
  try { localStorage.setItem('jizura.mode', S.mode); } catch (e) {}
  if (mobile) mobileInit();
    if (easy) { showNow(); syncOut(); codecNoteSoon(); }
    if (easy) closeCutPick();
    if (S.plan && S.lineEls && S.lineEls.length) { lastCutIdx = -2; updateCutInfo(); }
  sizeViewport(); drawTimeline(); loadThumbFonts();
}

/* スマホ: the preview sticks right under the header; the first time, a phone-friendly size and the line list folded */
function mobileBar() { const b = document.querySelector('.bar'); if (b) document.documentElement.style.setProperty('--mbar', b.offsetHeight + 'px'); }
function mobileInit() {
  mobileBar();
  let first = true; try { first = localStorage.getItem('jizura.mobileInit') !== '1'; localStorage.setItem('jizura.mobileInit', '1'); } catch (e) {}
  if (first) {
    if ((S.project.res || 1080) > 720) { S.project.res = 720; syncOut(); autosave(); }
    const sec = $('lineList') && $('lineList').closest('.sec'); if (sec) sec.classList.add('fold');
  }
}

/* ---------------- fx tab ---------------- */
const FX = [['motion', '動きの強さ'], ['glitch', 'グリッチ'], ['chroma', '色ズレ'], ['decor', '装飾の量'], ['density', 'カットの細かさ'], ['texture', '質感'], ['bgSwitch', '背景の切替']];
function renderFx() {
  const box = $('fxSliders'); box.innerHTML = '';
  FX.forEach(([k, label]) => {
    const row = document.createElement('div'); row.className = 'slider';
    const v = S.project.fx[k] ?? 0.5;
    const lk = lockOn(k);
    row.innerHTML = `<label for="fx_${k}">${label}</label><input id="fx_${k}" type="range" min="0" max="1" step="0.01" value="${v}"><output>${Math.round(v * 100)}</output>`
      + `<button type="button" class="icon ghost lk pro-only" data-lk="${k}" aria-pressed="${lk}" title="${lk ? LOCK_TITLE_OFF : LOCK_TITLE_ON}">${ICON.lock}</button>`;
    const inp = row.querySelector('input'), out = row.querySelector('output');
    row.querySelector('.lk').addEventListener('click', () => toggleParamLock(k));
    inp.addEventListener('input', () => { S.project.fx[k] = +inp.value; S.project.mood = null; out.textContent = Math.round(inp.value * 100); replanSoon(120); });
    box.appendChild(row);
  });
  lockBtn('flash', $('fxFlash').closest('label'));
  lockBtn('koma', $('fxKoma').closest('label'));
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
    const lked = !!locksOf().tech[g];
    d.innerHTML = `<summary><span class="tg-name">${label}</span><span class="tg-cnt mono">${onN}/${items.length}</span>`
      + `<button type="button" class="icon ghost lk pro-only" data-lk="${g}" aria-pressed="${lked}" title="${lked ? LOCK_TITLE_OFF : TECH_LOCK_ON}">${ICON.lock}</button></summary><div class="tg-tools"><button class="ghost small" data-a="on">すべてON</button><button class="ghost small" data-a="off">すべてOFF</button><button class="ghost small" data-a="flip">反転</button></div>`;
    const [tw, th] = (() => {
      const [W, H] = J.designSize(S.project.aspect || '16:9');
      const h = 90; return [Math.max(80, Math.round(h * W / H)), h];
    })();
    shown.forEach(k => {
      const l = document.createElement('label');
      l.className = 'tcard';
      l.title = k + (tbl[k].tags && tbl[k].tags.length ? '（' + tbl[k].tags.map(t => (J.MOODS[t] ? J.MOODS[t].name : t)).join('・') + '）' : '');
      if (!J.randomOk(S.project, g, k)) { l.classList.add('set-off'); l.title += tbl[k].extra && S.project.extra !== true ? '（追加分がオフのため、自動では選ばれません）' : tbl[k].set && !J.setOn(S.project, tbl[k].set) ? '（このセットがオフのため、自動では選ばれません）' : '（和風の演出がオフのため、自動では選ばれません）'; }
      l.innerHTML = `<canvas width="${tw}" height="${th}" data-g="${g}" data-k="${k}"></canvas><span class="tcard-name"><input type="checkbox" ${en[k] !== false ? 'checked' : ''}> <span>${escapeHtml(tbl[k].name)}</span>${setBadges(tbl[k])}</span>`;
      const cv = l.querySelector('canvas');
      l.querySelector('input').addEventListener('change', e => { en[k] = e.target.checked; S.project.mood = null; d.querySelector('.tg-cnt').textContent = `${items.filter(x => en[x] !== false).length}/${items.length}`; replanSoon(60); });
      list.appendChild(l);
    });
    d.querySelector('summary .lk').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggleTechLock(g); });
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
  $('outCenter').checked = $('eCenter').checked = !!S.project.centerFree;
  const tall = J.designSize(S.project.aspect)[1] > J.designSize(S.project.aspect)[0] * 1.1;
  document.querySelectorAll('.center-dir').forEach(el => { el.hidden = !(S.project.centerFree && tall); });
  document.querySelectorAll('.centerDirSel').forEach(el => { el.value = S.project.centerDir === 'lr' ? 'lr' : 'tb'; });
  const kb = $('keyBadge');
  kb.hidden = k === 'off';
  if (k !== 'off') kb.innerHTML = `<i style="background:${J.KEY_BG[k]}"></i>${k === 'green' ? 'グリーンバック' : 'ブラックバック'}`;
}
// the codec check is slow in some browsers: at start-up, let the first preview frames paint before asking
function codecNoteSoon() { (window.requestIdleCallback || (f => setTimeout(f, 400)))(() => codecNote(), { timeout: 1500 }); }
async function codecNote() {
  const [w, h] = J.outputSize(S.project);
  const vc = await J.pickVideoCodec(w, h, S.project.fps, 12e6);
  $('codecNote').textContent = vc ? `このブラウザでは ${vc.label} で書き出します（${w}×${h} / ${S.project.fps}fps）。書き出し中はタブを開いたままにしてください。` : 'このブラウザは動画エンコード（WebCodecs）に対応していません。Chrome / Edge の最新版で開くか、連番PNGを使ってください。';
  $('btnMP4').disabled = !vc; $('eMP4').disabled = !vc;
  ['btnMP4File', 'eMP4File'].forEach(id => { $(id).hidden = !vc || !canPickFile(); });
  if (!vc) $('eMP4').title = 'このブラウザは MP4 書き出しに対応していません（Chrome / Edge 推奨）';
}
const EXP_BTNS = ['btnMP4', 'btnPNG', 'btnPNGA', 'btnPNGL', 'eMP4', 'btnMP4File', 'eMP4File'];
function baseName() {
  const k = J.keyMode(S.project);
  return ((S.project.title || 'jizura').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60) || 'jizura') + (k ? (k === 'green' ? '_greenback' : '_blackback') : '');
}
const canPickFile = () => typeof window.showSaveFilePicker === 'function' && !document.documentElement.classList.contains('cep') && typeof VideoEncoder !== 'undefined';
async function runExport(kind) {
  if (S.exporting) return;
  // 大きな動画用: the save dialog must open straight from the click (before anything is awaited)
  let file = null, fileName = '';
  if (kind === 'mp4file') {
    try {
      const hnd = await window.showSaveFilePicker({ suggestedName: baseName() + rangeSuffix() + '.mp4', types: [{ description: 'MP4', accept: { 'video/mp4': ['.mp4'] } }] });
      file = await hnd.createWritable(); fileName = hnd.name;
    } catch (e) { if (e && e.name === 'AbortError') return; toast('保存先を開けませんでした: ' + (e && e.message ? e.message : e)); return; }
  }
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
  boxes.forEach(b => { const sh = b.querySelector('.exp-share'); if (sh) sh.hidden = true; });
  // keep the phone's screen on while exporting (a sleeping screen stops the encoder)
  let wake = null; try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) { wake = null; }
  // スマホ: at most 1080p (phones run out of memory / encoder time at 1440p and 4K)
  const proj = S.mode === 'mobile' && (S.project.res || 1080) > 1080 ? Object.assign({}, S.project, { res: 1080 }) : S.project;
  if (proj !== S.project) toast('スマホの画面では 1080p で書き出します');
  try {
    await J.ensureFonts(S.project.lyrics + (S.project.title || '') + (S.project.artist || '') + HUD_CHARS, J.fontsOfPlan(S.plan));
    const lost = J.missingUserFonts(J.fontsOfPlan(S.plan).concat(Object.values(S.project.fonts || {})));
    if (lost.length) throw new Error(`読み込んだ書体（${[...new Set(lost)].join('・')}）がこのブラウザにないため、書き出しを止めました。「フォント」から同じファイルを読み込み直すか、別の書体を選んでください`);
    if (kind === 'mp4' || kind === 'mp4file') {
      const plan = S.plan, range = exportRange(), span = J.exportSpan(plan, range);
      const r = await J.exportMP4({ plan, project: proj, audio: S.project.includeAudio !== false ? S.audio : null, quality: S.project.quality || 'high', onProgress, signal: ac.signal, range, file });
      file = null;
      txt.textContent = `完成 ${r.blob ? (r.blob.size / 1048576).toFixed(1) + 'MB・' : ''}${r.codec}${r.audio ? ' + ' + r.audio.toUpperCase() : ''}・${((performance.now() - t0) / 1000).toFixed(0)}秒`;
      if (r.blob) {
        const name = baseName() + rangeSuffix() + '.mp4';
        const res = await J.saveFile(name, r.blob);
        if (res === 'declined') txt.textContent += '（保存はキャンセルされました）';
        offerShare(boxes, r.blob, name);
      } else txt.textContent += `・「${fileName}」に保存しました`;
      if (r.tried && r.tried.length) txt.textContent += '（最初の方法では失敗したため、別のエンコーダーで書き出しました）';
      // audio that some players cannot play (Opus), or none at all: save the soundtrack as WAV next to it
      if (r.audioWanted && r.audio !== 'aac') {
        await J.saveFile(baseName() + rangeSuffix() + '_audio.wav', J.audioWav(S.audio.buffer, span.dur, span.t0));
        txt.textContent += r.audio ? '。このブラウザでは音声が Opus になり、iPhone・QuickTime などでは音が出ないことがあるため、音声を WAV でも保存しました' : '。このブラウザは音声を書き出せないため、音声を WAV で別に保存しました（動画編集ソフトで重ねてください）';
      } else if (S.project.includeAudio !== false && !S.audio && S.project.audioName) txt.textContent += '。曲が読み込まれていないため音声なしです（「曲を読み込む」から読み込み直してください）';
    } else {
      const blob = await J.exportPNGZip({ plan: S.plan, project: proj, transparent: kind === 'pnga', layers: kind === 'pngl', onProgress, signal: ac.signal, range: exportRange() });
      txt.textContent = `完成 ${(blob.size / 1048576).toFixed(1)}MB`;
      await J.saveFile(baseName() + rangeSuffix() + (kind === 'pnga' ? '_alpha' : kind === 'pngl' ? '_layers' : '') + '_png.zip', blob);
    }
  } catch (e) {
    txt.textContent = 'エラー: ' + (e && e.message ? e.message : e);
    console.error(e);
    if (file) { try { await file.abort(); } catch (e2) {} }
  } finally {
    S.exporting = null; S.need = true;
    EXP_BTNS.forEach(id => { $(id).disabled = false; });
    try { if (wake) await wake.release(); } catch (e) {}
    codecNote();
  }
}
/* phones: the share sheet is the reliable way to put a video into Photos / Files (a download link often isn't) */
function offerShare(boxes, blob, name) {
  let f = null;
  try { f = new File([blob], name, { type: blob.type || 'video/mp4' }); } catch (e) { return; }
  if (!navigator.canShare || !navigator.share || !navigator.canShare({ files: [f] })) return;
  boxes.forEach(b => {
    const sh = b.querySelector('.exp-share'); if (!sh) return;
    sh.hidden = false;
    sh.onclick = async () => { try { await navigator.share({ files: [f], title: name }); } catch (e) {} };
  });
}

/* ---------------- tap sync ---------------- */
// start from any line: playback begins a little before that line, earlier lines keep their times
function startTap(from = 0) {
  if (!S.plan.lines.length) return;
  from = J.clamp(from | 0, 0, S.plan.lines.length - 1);
  pushEdit();
  S.tap = { i: from, from, done: [] };
  if (!S.project.timing.lineTimes) S.project.timing.lineTimes = {};
  $('tapPanel').hidden = false; $('btnTap').setAttribute('aria-pressed', 'true');
  $('tapPanel').classList.remove('compact');
  const prev = from > 0 ? S.plan.lines[from - 1] : null, cur = S.plan.lines[from];
  const t0 = from === 0 ? 0 : Math.max(0, prev.start + 0.01, cur.start - 2.5);      // a little before the line, never before the previous one
  seek(t0); play(); updateTap();
  $('tapBtn').focus();
  if (from > 0) toast(`${from + 1}行目からタップで同期します（${J.fmtTime(t0)} から再生）`);
}
function tapNow() {
  if (!S.tap) return;
  const LT = S.project.timing.lineTimes, i = S.tap.i, t = +S.t.toFixed(3);
  S.tap.done.push({ i, had: LT[i] });
  LT[i] = t;
  // later lines tapped earlier (a previous pass) must not come before this one
  for (const k of Object.keys(LT)) if (+k > i && LT[k] <= t + 0.2) delete LT[k];
  S.tap.i++;
  replan();
  if (S.tap.i >= S.plan.lines.length) stopTap(); else updateTap();
}
function tapBack() {                    // 1つ戻る: undo the last tap and jump back a little
  if (!S.tap || !S.tap.done.length) return;
  const d = S.tap.done.pop(), LT = S.project.timing.lineTimes;
  if (d.had != null) LT[d.i] = d.had; else delete LT[d.i];
  S.tap.i = d.i; replan(); updateTap();
  seek(Math.max(0, S.t - 3)); if (!S.playing) play();
}
function stopTap() { S.tap = null; $('tapPanel').hidden = true; $('btnTap').setAttribute('aria-pressed', 'false'); replan(); flushSave(); }
function updateTap() {
  const ln = S.plan.lines[S.tap.i];
  $('tapLine').textContent = ln ? `${S.tap.i + 1}. ${ln.interlude ? '〔間奏〕' : ln.text}` : '—';
  const bb = $('tapBack'); if (bb) bb.disabled = !S.tap.done.length;
  $('tapPanel').classList.toggle('compact', S.tap.done.length > 0);   // 最初の数回が終わったら説明を畳んで、固定しても邪魔にならないように
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
  for (const set of J.SET_ORDER) document.querySelectorAll('.' + set + '-toggle').forEach(el => { el.checked = J.setOn(S.project, set); });
  document.querySelectorAll('.unify-toggle').forEach(el => { el.checked = S.project.unify === true; });
  document.querySelectorAll('.txno-toggle').forEach(el => { el.checked = S.project.fx.hideNo !== true; });
  document.querySelectorAll('.txtime-toggle').forEach(el => { el.checked = S.project.fx.hideTime !== true; });
  document.querySelectorAll('.typeset-toggle').forEach(el => { el.checked = S.project.typeset === true; });
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
  $('btnTap').addEventListener('click', () => (S.tap ? stopTap() : startTap()));
  $('tapBtn').addEventListener('click', tapNow);
  $('tapStop').addEventListener('click', () => { pause(); stopTap(); });
  $('btnPlay').addEventListener('click', () => (S.playing ? pause() : play()));
  const cutTxAuto = $('cutTxAuto'), cutTxClose = $('cutTxClose');
  if (cutTxClose) cutTxClose.addEventListener('click', () => { closeCutTx(); lastCutIdx = -2; updateCutInfo(); });
  if (cutTxAuto) cutTxAuto.addEventListener('click', () => {
    setCutText(cutTx.line, cutTx.k, null);
    replan(); refreshCutTx();
  });
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
  let drag = false, raf = 0;
  tl.addEventListener('pointerdown', e => {
    tl.setPointerCapture(e.pointerId);
    const h = S.tap || S.exporting ? -1 : tlHandleAt(e);
    if (h >= 0) { pushEdit(); TL.drag = h; pause(); tl.style.cursor = 'ew-resize'; return; }
    drag = true; timelineSeek(e);
  });
  tl.addEventListener('pointermove', e => {
    if (TL.drag >= 0) { const ev = { clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey }; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => tlDragTo(TL.drag, ev)); return; }
    if (drag) { timelineSeek(e); return; }
    const hv = tlHandleAt(e); if (hv !== TL.hover) { TL.hover = hv; tl.style.cursor = hv >= 0 ? 'ew-resize' : 'pointer'; drawTimeline(); }
  });
  const endDrag = () => { if (TL.drag >= 0) { TL.drag = -1; flushSave(); renderLines(); drawTimeline(); } drag = false; };
  tl.addEventListener('pointerup', endDrag); tl.addEventListener('pointercancel', endDrag);
  tl.addEventListener('pointerleave', () => { if (TL.hover >= 0 && TL.drag < 0) { TL.hover = -1; drawTimeline(); } });
  tl.addEventListener('wheel', e => {
    e.preventDefault();
    const { vd } = tlView();
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { TL.off += (e.shiftKey ? e.deltaY : e.deltaX) / tl.clientWidth * vd; tlView(); drawTimeline(); }
    else tlZoom(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)), tlTime(e));
  }, { passive: false });
  $('tlIn').addEventListener('click', () => tlZoom(1.6));
  $('tlOut').addEventListener('click', () => tlZoom(1 / 1.6));
  $('tlFit').addEventListener('click', () => { TL.z = 1; TL.off = 0; drawTimeline(); });
  $('btnUndoEdit').addEventListener('click', () => edGo(-1));
  $('tapBack').addEventListener('click', tapBack);
  bindRangeUI();
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
  setSwitch('typo-toggle', 'typo', true, '文字PV系の部品：使う', '文字PV系の部品：使わない（おまかせ・シャッフルで選ばれません）');
  setSwitch('kinetic-toggle', 'kinetic', true, 'キネティックの部品：使う', 'キネティックの部品：使わない（おまかせ・シャッフルで選ばれません）');
  setSwitch('horror-toggle', 'horror', true, 'ホラーの演出：使う（おまかせの雰囲気に「ホラー」が加わります）', 'ホラーの演出：使わない');
  setSwitch('unify-toggle', 'unify', true, '統一感：オン（パートごとにそろえ、キメ・モーフ・太さも使います）', '統一感：オフ');
  setSwitch('typeset-toggle', 'typeset', true, '文字整列：オン（字間・助詞・英字・0.2秒先・効果控えめ）', '文字整列：オフ');
  // レイアウト文字: 通し番号 / 時刻 — one project-wide pair, shared by the 演出 tab and the かんたん panel
  const txSwitch = (cls, key, msgOn, msgOff) => document.querySelectorAll('.' + cls).forEach(el => el.addEventListener('change', e => {
    remember();
    S.project.fx[key] = !e.target.checked;
    document.querySelectorAll('.' + cls).forEach(x => { x.checked = e.target.checked; });
    replan(); commit(); flushSave();
    toast(e.target.checked ? msgOn : msgOff);
  }));
  txSwitch('txno-toggle', 'hideNo', '通し番号：表示', '通し番号：非表示');
  txSwitch('txtime-toggle', 'hideTime', '時刻：表示', '時刻：非表示');
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
    try {
      const uf = await J.loadFontFile(f);
      S.project.userFonts = (S.project.userFonts || []).filter(x => x.key !== uf.key).concat([uf]);
      S.project.fonts.display = uf.key; fontKey = ''; renderFontRoles(); replan(); flushSave();
    }
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
  document.querySelectorAll('.centerDirSel').forEach(el => el.addEventListener('change', e => {
    S.project.centerDir = e.target.value; syncOut(); replan(); flushSave();
    toast(e.target.value === 'lr' ? '縦長の画面：左右に分けます' : '縦長の画面：上下に分けます');
  }));
  ['outCenter', 'eCenter'].forEach(id => $(id).addEventListener('change', e => {
    S.project.centerFree = e.target.checked; syncOut(); replan(); flushSave();
    const tall = S.plan.H > S.plan.W * 1.1 && S.project.centerDir !== 'lr';
    toast(e.target.checked ? `中央を空けました：文字と演出を${tall ? '上下' : '左右'}に置きます` : '中央を空けるのをやめました');
  }));
  $('btnMP4').addEventListener('click', () => runExport('mp4'));
  ['btnMP4File', 'eMP4File'].forEach(id => $(id).addEventListener('click', () => runExport('mp4file')));
  $('btnPNG').addEventListener('click', () => runExport('png'));
  $('btnPNGA').addEventListener('click', () => runExport('pnga'));
  $('btnPNGL').addEventListener('click', () => runExport('pngl'));
  document.querySelectorAll('.exp-cancel').forEach(b => b.addEventListener('click', () => { if (S.exporting) S.exporting.abort(); }));
  $('eMP4').addEventListener('click', () => runExport('mp4'));
  // かんたんモード
  $('modeEasy').addEventListener('click', () => setMode('easy'));
  $('modeMobile').addEventListener('click', () => setMode('mobile'));
  $('btnOmakaseTop').addEventListener('click', omakase);
  $('btnMenu').addEventListener('click', () => { const on = !$('app').classList.contains('menu-open'); $('app').classList.toggle('menu-open', on); $('btnMenu').setAttribute('aria-expanded', String(on)); mobileBar(); });
  document.querySelectorAll('.sec > .sec-h h2').forEach(h => h.addEventListener('click', () => { if (S.mode === 'mobile') h.closest('.sec').classList.toggle('fold'); }));
  if (window.ResizeObserver) new ResizeObserver(mobileBar).observe(document.querySelector('.bar'));
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
  $('btnSave').addEventListener('click', () => J.saveFile(baseName() + '.jizura.json', JSON.stringify(Object.assign({}, S.project, { appVersion: '@VERSION@' }), null, 1)));
  $('btnAE').addEventListener('click', () => J.saveFile(baseName() + rangeSuffix() + '_ae.json', JSON.stringify(J.planForAE(S.plan, S.project, exportRange()), null, 1)));
  audioNameDefault = $('audioName').textContent;
  $('btnClearLyrics').addEventListener('click', clearLyrics);
  $('btnReset').addEventListener('click', () => {
    const dlg = $('resetDlg');
    if (!dlg || typeof dlg.showModal !== 'function') { if (window.confirm('歌詞・曲・設定・履歴をすべて消して、最初の状態に戻します。元に戻すことはできません。')) resetAll(); return; }
    dlg.returnValue = ''; dlg.showModal();
  });
  $('resetDlg').addEventListener('close', () => { if ($('resetDlg').returnValue === 'reset') resetAll(); });
  $('fileProject').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try { S.project = mergeProject(JSON.parse(await f.text())); syncUI(); replan(); restoreFonts(); }
    catch (err) { showMsg('プロジェクトを読み込めませんでした'); setTimeout(() => showMsg(null), 2500); }
    e.target.value = '';
  });
  document.addEventListener('keydown', e => {
    const tag = (e.target && e.target.tagName) || '';
    const typing = /INPUT|TEXTAREA|SELECT/.test(tag) && e.target.type !== 'range' && e.target.type !== 'checkbox';
    if (S.tap && (e.code === 'Space' || e.code === 'Enter') && !typing) { e.preventDefault(); tapNow(); return; }
    if (S.tap && e.code === 'Escape') { pause(); stopTap(); return; }
    if (S.tap && e.code === 'Backspace' && !typing) { e.preventDefault(); tapBack(); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !typing && !S.tap) { e.preventDefault(); edGo(e.shiftKey ? 1 : -1); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY' && !typing && !S.tap) { e.preventDefault(); edGo(1); return; }
    if (typing || $('termsDlg').open || $('resetDlg').open) return;
    if (e.code === 'Space') { e.preventDefault(); S.playing ? pause() : play(); }
    else if (e.code === 'ArrowRight') seek(S.t + (e.shiftKey ? 1 : 1 / S.plan.fps));
    else if (e.code === 'ArrowLeft') seek(S.t - (e.shiftKey ? 1 : 1 / S.plan.fps));
    else if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey && !e.altKey && !S.exporting) { e.preventDefault(); omakase(); }
  });
  window.addEventListener('resize', () => { sizeViewport(); drawTimeline(); });
  if (window.ResizeObserver) new ResizeObserver(() => { sizeViewport(); drawTimeline(); }).observe($('viewport'));
  bindFollow();
}

/* song file -> beat analysis (file input, or a host such as the After Effects panel) */
let audioSeq = 0;
async function loadAudioFile(f, restored) {
  const my = ++audioSeq;                      // only the latest choice may win (an earlier, slower analysis is dropped)
  $('audioName').textContent = '解析中…';
  try {
    pause();
    const a = await J.analyzeAudio(f);
    if (my !== audioSeq) return false;
    S.audio = a;
    $('audioName').textContent = `${f.name}（${J.fmtTime(S.audio.duration)}・約${S.audio.bpm}BPM）` + (restored ? '・前回の曲' : '');
    S.project.audioName = f.name;
    if (!restored && J.saveSong) J.saveSong(f);             // kept in this browser: a reload does not drop the song from exports
    S.project.timing.snap = true;
    syncUI(); replan();
    return true;
  } catch (err) { if (my !== audioSeq) return false; $('audioName').textContent = '読み込めませんでした: ' + err.message; S.audio = null; return false; }
}

/* ---------------- かんたんモードの案内ツアー ---------------- */
const TOUR = [
  { t: () => $('lyrics'), title: '1. 歌詞を入れる', text: '1行が1フレーズになります。空行で少し間が空き、[間奏 8] と書くと8秒の間奏（背景と装飾だけ）になります。' },
  { t: () => $('audioFile').closest('label') || $('audioFile'), title: '2. 曲を読み込む', text: 'mp3 などを読み込むと拍を検出して、カットの切り替わりを合わせます。曲がなくても作れます。「タップで同期」で行の頭を合わせることもできます。' },
  { t: () => $('btnOmakaseBig'), title: '3. おまかせで作る', text: 'スタイル・雰囲気・動き・配色・構成をまるごと決めます。押すたびに別の案になり、「◀ 前の案」で戻れます。' },
  { t: () => $('btnPlay'), title: '4. 再生して確認する', text: '再生して見てみましょう。下のタイムラインでは、行の区切りをドラッグして動かせます（＋−で拡大）。' },
  { t: () => $('lineList'), title: '5. 気になる行だけ直す', text: '行ごとに、歌詞を直す（✎）、カット数を決める、この行からタップし直す（◎）、この行だけ作り直す（サイコロ）ができます。' },
  { t: () => $('eMP4').closest('.easy-sec') || $('eMP4'), title: '6. 書き出す', text: '画面比（縦長 9:16 など）と解像度を選んで MP4 を書き出します。「書き出す範囲」で選んだ行だけを書き出すこともできます。' },
];
const TR = { i: -1 };
function tourShow(i) {
  const el = $('tour'), n = TOUR.length;
  if (i < 0 || i >= n) return tourEnd();
  TR.i = i;
  const st = TOUR[i], tg = st.t();
  el.hidden = false;
  el.querySelector('.tour-step').textContent = `${i + 1} / ${n}`;
  el.querySelector('.tour-title').textContent = st.title;
  el.querySelector('.tour-text').textContent = st.text;
  el.querySelector('.tour-prev').disabled = i === 0;
  el.querySelector('.tour-next').textContent = i === n - 1 ? 'はじめる' : '次へ';
  if (tg && tg.scrollIntoView) tg.scrollIntoView({ block: 'center', behavior: 'auto' });
  requestAnimationFrame(() => tourPlace(tg));
  el.querySelector('.tour-next').focus();
}
function tourPlace(tg) {
  const el = $('tour'), spot = el.querySelector('.tour-spot'), bub = el.querySelector('.tour-bub');
  const vw = window.innerWidth, vh = window.innerHeight, pad = 6;
  const r = tg ? tg.getBoundingClientRect() : { left: vw / 2, top: vh / 2, width: 0, height: 0, right: vw / 2, bottom: vh / 2 };
  const x0 = Math.max(4, r.left - pad), y0 = Math.max(4, r.top - pad), x1 = Math.min(vw - 4, r.right + pad), y1 = Math.min(vh - 4, r.bottom + pad);
  Object.assign(spot.style, { left: x0 + 'px', top: y0 + 'px', width: Math.max(0, x1 - x0) + 'px', height: Math.max(0, y1 - y0) + 'px' });
  const bw = bub.offsetWidth, bh = bub.offsetHeight, gap = 12;
  let top = y1 + gap <= vh - bh - 8 ? y1 + gap : y0 - gap - bh >= 8 ? y0 - gap - bh : Math.max(8, vh - bh - 8);
  let left = J.clamp(x0 + (x1 - x0) / 2 - bw / 2, 8, vw - bw - 8);
  Object.assign(bub.style, { top: top + 'px', left: left + 'px' });
}
function tourStart() {
  if (S.exporting || S.tap) return;
  if (S.mode !== 'easy') setMode('easy');
  pause(); tourShow(0);
}
function tourEnd() {
  $('tour').hidden = true; TR.i = -1;
  try { localStorage.setItem('jizura.tourDone', '1'); } catch (e) {}
}
function bindTour() {
  const el = $('tour');
  el.querySelector('.tour-next').addEventListener('click', () => tourShow(TR.i + 1));
  el.querySelector('.tour-prev').addEventListener('click', () => tourShow(TR.i - 1));
  el.querySelector('.tour-skip').addEventListener('click', tourEnd);
  $('btnTour').addEventListener('click', tourStart);
  document.addEventListener('keydown', e => {
    if (TR.i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); tourShow(TR.i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); tourShow(TR.i - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); tourEnd(); }
    else if (e.key !== 'Tab') { e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('resize', () => { if (TR.i >= 0) tourPlace(TOUR[TR.i].t()); });
  window.addEventListener('scroll', () => { if (TR.i >= 0) tourPlace(TOUR[TR.i].t()); }, true);
}

/* uploaded faces: bring them back from this browser; say so when a project uses one that is not here */
async function restoreFonts() {
  const list = S.project.userFonts || [];
  if (!list.length) return;
  const missing = await J.restoreUserFonts(list);
  fontKey = ''; renderFontRoles(); replan();
  if (missing.length) toast(`読み込んだ書体（${missing.join('・')}）がこのブラウザにありません。「フォント」から同じファイルを読み込み直してください（それまでは近い書体で表示します）`);
}

/* ---------------- boot ---------------- */
function boot() {
  S.project = loadLocal();
  bind(); initVolume(); syncUI(); syncLoopBtn(); replan();
  restoreFonts();
  // first visit on a phone: スマホ mode
  let mode = window.matchMedia && window.matchMedia('(max-width: 760px)').matches ? 'mobile' : 'easy';
  try { mode = localStorage.getItem('jizura.mode') || mode; } catch (e) {}
  setMode(mode); commit();
  bindTour();
  let seen = false; try { seen = localStorage.getItem('jizura.tourDone') === '1'; } catch (e) {}
  if (!seen && S.mode === 'easy' && !window.__adobe_cep__) setTimeout(tourStart, 600);   // first visit: show the tour once
  // open on a representative frame (end of the first cut's entrance)
  const c0 = S.plan.cuts.find(c => c.line >= 0);
  if (c0) seek(c0.start + Math.min(c0.dur * 0.6, c0.inDur + 0.25));
  requestAnimationFrame(tick);
  // the song used last time (same name as the saved project's) comes back after a reload
  if (J.loadSong && S.project.audioName) J.loadSong().then(f => { if (f && f.name === S.project.audioName && !S.audio) loadAudioFile(f, true); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
J.ui = S;
// hooks for hosts that embed the app (the After Effects CEP panel)
J.uiApi = { toast, replan, syncUI, pause, seek, flushSave, loadAudioFile, restartPreview, exportRange, exportRangeLines };
})();
