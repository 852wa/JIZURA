/* WebMCP browser adapter. No server, polyfill, or dependency; editor owns all mutations. */
(() => {
'use strict';
if (!document.getElementById('app') || window.__adobe_cep__ || document.documentElement.classList.contains('cep') || J.webMCP) return;
const status = J.webMCP = { status: 'unavailable', tools: [] };
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const check = (ok, message) => { if (!ok) fail('invalid_input', message); };
const obj = (properties = {}, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const str = (maxLength = 200) => ({ type: 'string', maxLength });
const choice = values => ({ type: 'string', enum: values });
const bool = { type: 'boolean' };
const num = (minimum, maximum) => ({ type: 'number', minimum, maximum });
const integer = (minimum, maximum) => ({ type: 'integer', minimum, maximum });
const list = items => ({ type: 'array', items, maxItems: 2000 });
const nullable = schema => ({ ...schema, type: [schema.type, 'null'] });
const groups = J.GROUP_KEYS;
const cutGroups = ['layout', 'enter', 'hold', 'exit', 'decor', 'treat', 'bg', 'cam', 'trans'];
const localFontKey = key => /^local_[\w\u0080-\uFFFF-]+$/.test(key);
const params = ['motion', 'glitch', 'chroma', 'decor', 'density', 'texture', 'bgSwitch', 'flash', 'koma'];
const revision = integer(0, Number.MAX_SAFE_INTEGER), line = integer(1, 100000), cut = integer(1, 1000);
const color = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
const fx = obj({ ...Object.fromEntries(params.slice(0, 7).map(k => [k, num(0, 1)])), flash: bool,
  koma: { type: 'integer', enum: [0, 8, 12] }, hud: choice(['auto', 'on', 'off']), hideNo: bool, hideTime: bool });
const settings = obj({
  title: str(1000), artist: str(1000), lang: choice(['auto', 'ja', 'en', 'zh-Hant', 'zh-Hans', 'ko']),
  style: choice(J.STYLE_ORDER), seed: integer(-2147483648, 2147483647), fx,
  colors: obj({ enabled: bool, accentOn: bool, ...Object.fromEntries(['bg', 'fg', 'sub', 'accent', 'ghostA', 'ghostB'].map(k => [k, color])) }),
  fonts: obj({ display: str(), serif: str(), body: str() }), localFont: { ...str(80), minLength: 1, pattern: '^[\\w \\u0080-\\uFFFF-]+$' },
  ...Object.fromEntries(['extra', 'wa', 'horror', 'typo', 'kinetic', 'unify', 'typeset', 'centerFree', 'includeAudio'].map(k => [k, bool])),
  centerDir: choice(['tb', 'lr']), keyBg: choice(['off', 'green', 'black']),
  aspect: choice(['16:9', '9:16', '4:3', '3:4', '1:1', '4:5', '21:9']),
  res: { type: 'integer', enum: [720, 1080, 1440, 2160] }, fps: { type: 'integer', enum: [24, 30, 60] },
  quality: choice(['standard', 'high', 'max']), mode: choice(['easy', 'pro', 'mobile']),
  exportRange: nullable(obj({ from: line, to: line }, ['from', 'to'])),
});
const timing = obj({ bpm: num(0, 300), offset: num(0, 86400), lineScale: num(0.3, 4), snap: bool });
// The same small JSON Schema subset is published and enforced even on legacy implementations.
function validate(value, schema, path = 'arguments') {
  if (value === null && (schema.type === 'null' || Array.isArray(schema.type) && schema.type.includes('null'))) return;
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  check(type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
    : type === 'array' ? Array.isArray(value) : type === 'integer' ? Number.isSafeInteger(value)
    : type === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === type, path + ': expected ' + type);
  if (schema.enum) check(schema.enum.includes(value), path + ': unsupported value');
  if (type === 'object') {
    for (const k of schema.required || []) check(own(value, k), path + ': missing ' + k);
    for (const [k, v] of Object.entries(value)) {
      check(!['__proto__', 'prototype', 'constructor'].includes(k), path + ': unsafe key');
      check(own(schema.properties, k), path + ': unknown field ' + k);
      validate(v, schema.properties[k], path + '.' + k);
    }
  }
  if (type === 'array') { check(value.length <= schema.maxItems, path + ': too many items'); value.forEach((v, i) => validate(v, schema.items, path + '[' + i + ']')); }
  if (type === 'string') {
    if (schema.maxLength !== undefined) check(value.length <= schema.maxLength, path + ': too long');
    if (schema.minLength !== undefined) check(value.length >= schema.minLength, path + ': too short');
    if (schema.pattern) check(new RegExp(schema.pattern).test(value), path + ': invalid format');
  }
  if (type === 'number' || type === 'integer') {
    if (schema.minimum !== undefined) check(value >= schema.minimum, path + ': below minimum');
    if (schema.maximum !== undefined) check(value <= schema.maximum, path + ': above maximum');
  }
}
const api = () => J.uiApi.editor;
function current(rev) { if (rev !== J.ui.revision) fail('stale_revision', 'Call jizura_get_state and use its revision and line/cut numbers.'); }
function lineIndex(n) { check(n <= J.ui.plan.lines.length, 'Line does not exist'); return n - 1; }
function cutIndex(n, k) {
  const i = lineIndex(n);
  const cuts = J.ui.plan.cuts.filter(c => c.line === i && J.LAYOUTS[c.layout] && !J.LAYOUTS[c.layout].special);
  check(k <= cuts.length, 'Editable cut does not exist on this line'); return k - 1;
}
function tech(group, key, auto = false) {
  if (auto && key === '') return;
  if (auto && key === 'none' && ['decor', 'trans'].includes(group)) return;
  check(own(J.registry(group), key) && !J.registry(group)[key].special, 'Unknown technique: ' + group + '/' + key);
}
function settingsCheck(p) {
  for (const key of Object.values(p.fonts || {})) check(key === '' || own(J.FONTS, key), 'Unknown font; use jizura_list_options');
  if (p.localFont) check(p.localFont.trim().length > 0, 'Font name is empty');
  if (p.exportRange) { lineIndex(p.exportRange.from); lineIndex(p.exportRange.to); check(p.exportRange.from <= p.exportRange.to, 'Range is reversed'); }
}
// Project files use the existing format, including opaque engine snapshots. Reject executable/prototype
// payloads and malformed known containers before passing a detached copy to the existing importer.
function projectCheck(p) {
  check(p && typeof p === 'object' && !Array.isArray(p), 'Expected a project object');
  check(JSON.stringify(p).length <= 8000000, 'Project exceeds 8 MB');
  const walk = (v, depth = 0) => {
    check(depth < 40, 'Project nesting is too deep');
    if (typeof v === 'number') check(Number.isFinite(v), 'Non-finite project number');
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
      check(!['__proto__', 'prototype', 'constructor'].includes(k), 'Unsafe project key'); walk(x, depth + 1);
    }
  }; walk(p);
  const allowed = [...Object.keys(settings.properties).filter(k => !['mode', 'localFont'].includes(k)), 'version', 'appVersion', 'lyrics', 'mood', 'timing', 'timingOrder', 'themeId', 'enabled', 'overrides', 'locks', 'userFonts', 'audioName'];
  for (const k of Object.keys(p)) check(allowed.includes(k), 'Unknown project field: ' + k);
  check(typeof p.lyrics === 'string' && p.lyrics.length <= 200000, 'Invalid project lyrics');
  for (const k of ['timing', 'fx', 'colors', 'fonts', 'enabled', 'overrides', 'locks']) if (p[k] !== undefined) check(p[k] && typeof p[k] === 'object' && !Array.isArray(p[k]), 'Invalid project ' + k);
  for (const k of ['title', 'artist', 'audioName', 'appVersion']) if (p[k] !== undefined) check(typeof p[k] === 'string', 'Invalid project ' + k);
  for (const k of Object.keys(settings.properties)) if (own(p, k) && !['exportRange', 'colors', 'fx', 'fonts'].includes(k)) validate(p[k], settings.properties[k], 'project.' + k);
  if (p.fonts) for (const [role, key] of Object.entries(p.fonts)) check(['display', 'body', 'serif'].includes(role) && typeof key === 'string' && (own(J.FONTS, key) || J.SAFE_FONT_KEY.test(key) || localFontKey(key)), 'Invalid font role/key');
  if (p.version !== undefined) check(p.version === 1, 'Unsupported project version');
  if (p.timingOrder !== undefined) check(Number.isSafeInteger(p.timingOrder) && [1, 2].includes(p.timingOrder), 'Invalid timing order');
  if (p.themeId !== undefined) check(p.themeId === null || own(J.THEMES, p.themeId), 'Unknown theme');
  if (p.mood !== undefined) check(p.mood === null || own(J.MOODS, p.mood), 'Unknown mood');
  if (p.fx) validate(p.fx, obj({ ...fx.properties, onTwos: bool }), 'project.fx');
  if (p.colors) validate(p.colors, obj({ ...settings.properties.colors.properties, ...Object.fromEntries(['bg', 'fg', 'sub', 'accent', 'ghostA', 'ghostB'].map(k => [k, { type: 'string', pattern: '^#[0-9a-fA-F]{3,8}$' }])) }), 'project.colors');
  if (p.exportRange != null) validate(p.exportRange, obj({ from: integer(0, 100000), to: integer(0, 100000) }, ['from', 'to']), 'project.exportRange');
  if (p.locks) {
    check(Object.keys(p.locks).every(k => ['tech', 'params'].includes(k)), 'Invalid locks');
    for (const kind of ['tech', 'params']) if (p.locks[kind]) validate(p.locks[kind], obj(Object.fromEntries((kind === 'tech' ? groups : params).map(k => [k, bool]))), 'project.locks.' + kind);
  }
  if (p.userFonts !== undefined) {
    check(Array.isArray(p.userFonts), 'Invalid userFonts');
    for (const f of p.userFonts) check(f && typeof f.key === 'string' && (J.SAFE_FONT_KEY.test(f.key) || localFontKey(f.key)) && typeof f.family === 'string', 'Invalid user font');
  }
  if (p.timing) {
    for (const k of Object.keys(timing.properties)) if (own(p.timing, k)) validate(p.timing[k], timing.properties[k], 'timing.' + k);
    if (p.timing.lineTimes !== undefined) {
      check(p.timing.lineTimes && !Array.isArray(p.timing.lineTimes) && typeof p.timing.lineTimes === 'object', 'Invalid lineTimes');
      for (const [i, t] of Object.entries(p.timing.lineTimes)) check(/^\d+$/.test(i) && Number.isFinite(t) && t >= 0, 'Invalid line time');
    }
  }
  if (p.enabled) for (const [g, values] of Object.entries(p.enabled)) {
    check(groups.includes(g) && values && typeof values === 'object' && !Array.isArray(values), 'Invalid technique group');
    for (const [k, on] of Object.entries(values)) check(own(J.registry(g), k) && typeof on === 'boolean', 'Invalid enabled technique');
  }
  const record = (v, label, visit) => {
    check(v && typeof v === 'object' && !Array.isArray(v), 'Invalid ' + label);
    for (const [k, x] of Object.entries(v)) { check(/^\d+$/.test(k), 'Invalid index in ' + label); visit(x); }
  };
  const techniqueValues = o => {
    for (const g of cutGroups) if (o[g] !== undefined && o[g] !== null && g !== 'decor') tech(g, o[g], true);
    if (o.decor !== undefined) { check(Array.isArray(o.decor), 'Invalid decorations'); o.decor.forEach(d => tech('decor', typeof d === 'string' ? d : d && d.id)); }
  };
  record(p.overrides || {}, 'overrides', o => {
    check(o && typeof o === 'object' && !Array.isArray(o), 'Invalid line override');
    const allowed = [...cutGroups, 'cuts', 'single', 'seed', 'lock', 'lockedSeed', 'lockedCuts', 'cutLayouts', 'cutTech', 'cutQuiet'];
    check(Object.keys(o).every(k => allowed.includes(k)), 'Unknown line override');
    techniqueValues(o);
    for (const k of ['seed', 'lockedSeed', 'cuts']) if (o[k] !== undefined) check(Number.isSafeInteger(o[k]), 'Invalid override ' + k);
    for (const k of ['lock', 'single']) if (o[k] !== undefined) check(typeof o[k] === 'boolean', 'Invalid override ' + k);
    if (o.cutLayouts) record(o.cutLayouts, 'cutLayouts', k => tech('layout', k, true));
    if (o.cutTech) record(o.cutTech, 'cutTech', slot => {
      check(slot && typeof slot === 'object' && !Array.isArray(slot), 'Invalid cut technique');
      for (const [g, k] of Object.entries(slot)) { check(cutGroups.includes(g), 'Unknown cut group'); tech(g, k, true); }
    });
    if (o.cutQuiet) record(o.cutQuiet, 'cutQuiet', slot => validate(slot, obj(Object.fromEntries(cutGroups.map(g => [g, bool]))), 'cutQuiet'));
    if (o.lockedCuts) {
      check(Array.isArray(o.lockedCuts), 'Invalid locked cuts');
      for (const c of o.lockedCuts) {
        check(c && typeof c.utext === 'string', 'Invalid locked text'); techniqueValues(c);
        for (const k of ['layout', 'enter', 'exit', 'hold']) check(typeof c[k] === 'string', 'Missing locked technique');
        for (const k of ['inDur', 'outDur', 'seed']) check(Number.isFinite(c[k]), 'Invalid locked cut ' + k);
      }
    }
  });
}
const definitions = [];
function tool(name, description, schema, run, readOnly = false) { definitions.push({ name: 'jizura_' + name, description, inputSchema: schema, run, readOnly }); }
tool('get_state', 'Read the editor, revision, one-based lines/cuts and source rows. Use detail=false for a small status response. Audio and font files must be supplied through the existing browser file inputs.', obj({ detail: bool }), a => api().state(a.detail !== false), true);
tool('list_options', 'Search IDs and localized labels. category is style, font, settings, or a technique group. Pagination is one-based.', obj({ category: choice(['style', 'font', 'settings', ...groups]), query: str(), page: integer(1, 10000), pageSize: integer(1, 100) }, ['category']), a => {
  if (a.category === 'settings') return { settingsSchema: settings, timingSchema: timing, lockParameters: params, groups };
  const table = a.category === 'style' ? J.STYLES : a.category === 'font' ? J.FONTS : J.registry(a.category);
  let items = Object.entries(table).filter(([, v]) => !v.special).map(([id, v]) => ({ id, label: v.name || v.label || id, description: v.desc || '', enabled: a.category === 'font' || a.category === 'style' || J.ui.project.enabled[a.category][id] !== false, eligibleForRandom: a.category === 'font' || J.randomOk(J.ui.project, a.category, id) }));
  if (a.query) items = items.filter(x => (x.id + ' ' + x.label + ' ' + x.description).toLowerCase().includes(a.query.toLowerCase()));
  const page = a.page || 1, size = a.pageSize || 30;
  return { total: items.length, page, items: items.slice((page - 1) * size, page * size) };
}, true);
tool('set_lyrics', 'Replace raw lyrics (LRC and JIZURA syntax supported), or clear lyrics and line settings. Undo uses the existing edit history.', obj({ text: str(200000), clear: bool }), a => {
  check((a.clear === true) !== own(a, 'text'), 'Supply text OR clear=true'); api().lyrics(a.text, a.clear);
});
tool('update_settings', 'Update only supplied settings. Empty font IDs restore style defaults. exportRange uses one-based lines and requires revision. Discover values with list_options.', obj({ settings, revision }, ['settings']), a => {
  settingsCheck(a.settings); if (own(a.settings, 'exportRange')) current(a.revision); api().settings(a.settings);
});
tool('set_timing', 'Update timing, set/delete manual line times, or clear manual times. Times use seconds; line references require revision.', obj({ settings: timing, times: list(obj({ line, time: nullable(num(0, 86400)) }, ['line', 'time'])), clear: bool, revision }), a => {
  if (a.times && a.times.length || a.clear) current(a.revision);
  for (const t of a.times || []) lineIndex(t.line);
  api().timing(a.settings || {}, a.times || [], !!a.clear);
});
tool('edit_line', 'Edit one parsed line. Text replaces its source row body, preserving LRC tags (shared timestamps on that source row also change). Send text separately from layout/cuts/lock. cuts=0 and layout="" restore automatic choices.', obj({ revision, line, text: { ...str(10000), minLength: 1, pattern: '^[^\\r\\n]+$' }, layout: str(), cuts: integer(0, 6), lock: bool }, ['revision', 'line']), a => {
  current(a.revision); const i = lineIndex(a.line), { revision: r, line: l, ...patch } = a;
  check(Object.keys(patch).length > 0, 'No edit specified');
  if (own(patch, 'text')) check(Object.keys(patch).length === 1 && patch.text.trim().length > 0, 'Text must be a separate nonempty edit');
  if (own(patch, 'layout')) tech('layout', patch.layout, true);
  if (!own(patch, 'text')) check(!J.ui.plan.lines[i].interlude, 'Interlude lines only support text/timing edits');
  api().line(i, patch);
});
tool('edit_cut', 'Set a technique on a one-based cut within its line. key="" restores automatic selection. quiet toggles extra-effect suppression for the group.', obj({ revision, line, cut, group: choice(cutGroups), key: str(), quiet: bool }, ['revision', 'line', 'cut', 'group']), a => {
  current(a.revision); const k = cutIndex(a.line, a.cut); check(own(a, 'key') || own(a, 'quiet'), 'Supply key or quiet');
  if (own(a, 'key')) tech(a.group, a.key, true); api().cut(a.line - 1, k, a.group, a.key, a.quiet);
});
tool('set_techniques', 'Enable/disable techniques in one group. Omit keys to affect the entire group, keeping the same safe defaults as the UI bulk buttons.', obj({ group: choice(groups), keys: list(str()), enabled: bool }, ['group', 'enabled']), a => {
  const keys = a.keys || J.order(a.group).filter(k => !J.registry(a.group)[k].special); keys.forEach(k => tech(a.group, k)); api().techniques(a.group, keys, a.enabled, !a.keys);
});
tool('set_locks', 'Set randomization locks for technique groups (tech) or effect parameters (params).', obj({ kind: choice(['tech', 'params']), keys: list(str()), locked: bool }, ['kind', 'keys', 'locked']), a => {
  check(a.keys.every(k => (a.kind === 'tech' ? groups : params).includes(k)), 'Unknown lock'); api().locks(a.kind, a.keys, a.locked);
});
tool('randomize', 'Randomize all, style, mood, palette, composition, line, or cut. Line/cut targets require revision and one-based references. Explicit line reroll unlocks that line, as in the UI.', obj({ target: choice(['all', 'style', 'mood', 'palette', 'composition', 'line', 'cut']), revision, line, cut, strategy: choice(['omakase', 'shuffle']) }, ['target']), a => {
  if (a.strategy) check(a.target === 'cut', 'strategy is only for cut rerolls');
  if (['line', 'cut'].includes(a.target)) { current(a.revision); check(a.line !== undefined, 'Supply line'); lineIndex(a.line); check(!J.ui.plan.lines[a.line - 1].interlude, 'Cannot reroll an interlude line'); }
  if (a.target === 'cut') { check(a.cut !== undefined, 'Supply cut'); cutIndex(a.line, a.cut); }
  api().randomize(a.target, a.line - 1, a.cut - 1, a.strategy);
});
tool('history', 'Use edit undo/redo or look previous/next. These are separate existing histories.', obj({ kind: choice(['edit', 'look']), direction: choice(['back', 'forward']) }, ['kind', 'direction']), a => {
  const h = api().state().history, key = a.kind === 'edit' ? a.direction === 'back' ? 'undo' : 'redo' : a.direction === 'back' ? 'previous' : 'next';
  check(h[key], 'No history in that direction'); api().history(a.kind, a.direction === 'back' ? -1 : 1);
});
tool('preview', 'Play, pause, seek in seconds, set loop/preview volume/mute or display mode. Audio may require a real browser gesture.', obj({ action: choice(['play', 'pause']), time: num(0, 86400), loop: choice(['all', 'line', 'cut', 'off']), volume: num(0, 1), muted: bool, mode: choice(['easy', 'pro', 'mobile']) }), a => api().preview(a));
tool('tap_sync', 'Start tap synchronization at a line, record the current playhead, undo the last tap, or stop. Prefer set_timing for known timestamps.', obj({ action: choice(['start', 'record', 'back', 'stop']), line, revision }, ['action']), a => {
  if (a.action === 'start') { check(!J.ui.tap, 'Tap sync already active'); current(a.revision); lineIndex(a.line || 1); }
  else if (a.action !== 'stop') check(!!J.ui.tap, 'Tap sync is not active');
  api().tap(a.action, (a.line || 1) - 1);
});
tool('project', 'Get/import/save the existing project JSON or get/save AE JSON. JSON does not include audio/font bytes. Import replaces the current project. File inputs are #fileProject, #audioFile, #fontFile.', obj({ action: choice(['get', 'import', 'save', 'get_ae', 'save_ae']), json: str(8000000) }, ['action']), async a => {
  if (a.action === 'import') { check(typeof a.json === 'string', 'Supply json'); let p; try { p = JSON.parse(a.json); } catch { fail('invalid_input', 'Invalid JSON'); } projectCheck(p); await api().importProject(p); }
  else if (a.action === 'get' || a.action === 'get_ae') return { project: api().projectData(a.action === 'get_ae') };
  else return { file: await api().saveProject(a.action === 'save_ae') };
});
tool('start_export', 'Start MP4 or PNG ZIP export. Returns a job immediately; poll get_export_status. Direct-to-file MP4 requires the existing #btnMP4File browser button.', obj({ kind: choice(['mp4', 'png', 'pnga', 'pngl', 'mp4file']) }, ['kind']), a => {
  if (a.kind === 'mp4file') return { status: 'needs_user_action', nextAction: 'Use the #btnMP4File button to choose the destination, then call jizura_get_export_status.' };
  return { job: api().startExport(a.kind) };
});
tool('get_export_status', 'Read the latest export job. completed means encoding completed; download_started is not proof of a file saved on disk. Only the latest job is retained.', obj({ jobId: str() }), a => {
  const job = J.ui.exportJob; if (a.jobId) check(job && a.jobId === job.id, 'Unknown or superseded export job'); return { job: job ? JSON.parse(JSON.stringify(job)) : null };
}, true);
tool('cancel_export', 'Cancel the current export. Poll status for cancellation completion.', obj({ jobId: str() }), a => {
  if (a.jobId) check(J.ui.exportJob && a.jobId === J.ui.exportJob.id, 'Unknown or superseded export job'); return { job: api().cancelExport() };
});
tool('reset_project', 'Open the existing irreversible reset confirmation. The user must confirm in the UI; this tool never bypasses confirmation.', obj(), () => {
  check(typeof document.getElementById('resetDlg').showModal === 'function', 'Use the existing reset button in this browser'); api().requestReset();
  return { status: 'needs_user_action', nextAction: 'Confirm or cancel the existing #resetDlg dialog in the browser.' };
});
let queue = Promise.resolve();
function execute(def, args, options) {
  const run = async () => {
    try {
      if (options && options.signal && options.signal.aborted) fail('cancelled', 'Tool call cancelled before execution');
      validate(args, def.inputSchema);
      check(J.ui && J.ui.project && J.ui.plan, 'Editor has not initialized');
      api().prepare();
      const suffix = def.name.slice(7);
      const read = def.readOnly || suffix === 'project' && ['get', 'get_ae'].includes(args.action);
      if (!read && suffix !== 'cancel_export') {
        if (Object.values(J.ui.loading).some(Boolean)) fail('busy', 'Restoring project or loading audio/fonts; poll jizura_get_state.');
        if (J.ui.exporting) fail('busy', 'Export running; poll or cancel it first.');
        if (document.getElementById('resetDlg').open) fail('busy', 'Resolve the reset dialog in the browser.');
        if (J.ui.tap && !['tap_sync', 'preview'].includes(suffix)) fail('busy', 'Stop tap_sync before editing.');
        api().activate();
      }
      const data = await def.run(args);
      return JSON.stringify({ ok: true, ...(data || {}), state: read ? undefined : api().state() });
    } catch (e) { return JSON.stringify({ ok: false, error: { code: e.code || 'operation_failed', message: String(e.message || e) } }); }
  };
  if (def.readOnly || def.name === 'jizura_cancel_export') return run();
  const result = queue.then(run, run); queue = result.then(() => undefined, () => undefined); return result;
}
async function register() {
  try {
    if (window.__adobe_cep__ || document.documentElement.classList.contains('cep')) { status.status = 'disabled'; return; }
    const context = document.modelContext && typeof document.modelContext.registerTool === 'function' ? document.modelContext : navigator.modelContext;
    if (!context || typeof context.registerTool !== 'function') return;
    const controller = new AbortController(); status.status = 'registering';
    try {
      for (const def of definitions) {
        await context.registerTool({ name: def.name, description: def.description, inputSchema: def.inputSchema,
          annotations: { readOnlyHint: def.readOnly, untrustedContentHint: true },
          execute: (args, options) => execute(def, args, options) }, { signal: controller.signal });
        status.tools.push(def.name);
      }
      status.status = 'ready';
    } catch (e) {
      controller.abort();
      if (typeof context.unregisterTool === 'function') for (const name of status.tools) { try { context.unregisterTool(name); } catch {} }
      status.status = 'failed'; status.error = String(e.message || e);
    }
  } catch (e) { status.status = 'failed'; status.error = String(e.message || e); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', register, { once: true }); else void register();
})();
