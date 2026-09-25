// ================================================================ expression registry (AE)
// Every expression group has a table of AE implementations. Packs (ae/p_*.jsx) add entries with jzReg().
// WHAT gets picked (weights, mood tags, fits, 追加分/和風 flags …) comes from the web engine via
// JZ_DATA.meta so the browser and AE planners stay in step; this file only knows HOW to build.
//
//  layout : { build(ctx) -> bbox, plan(rng, cut, st) -> params }
//  enter / hold / exit : { apply(m) }            m = motion context (see 20_motion.jsx)
//  decor  : { build(ctx, bb, d) }
//  treat  : { apply(ctx, L, P, o), plan(rng, st) }
//  bg     : { build(bctx, P), plan(rng, st) }
//  cam    : { apply(cam, P), plan(rng, st) }    cam = { ctx, nul, content[], P }
//  fx     : { build(fctx, ev) }                 one plan event
//  trans  : { build(tctx), plan(rng, st) }      tctx = { comp, A, B, t0, dur, P, ... }
var JZ_GROUPS = ['layout', 'enter', 'hold', 'exit', 'decor', 'treat', 'bg', 'cam', 'fx', 'trans'];
var JZ_REG = { layout: {}, enter: {}, hold: {}, exit: {}, decor: {}, treat: {}, bg: {}, cam: {}, fx: {}, trans: {} };
function jzReg(g, k, def) {
    if (!JZ_REG[g]) throw new Error('JIZURA: unknown group ' + g);
    def.key = k; def.group = g;
    JZ_REG[g][k] = def;
    return def;
}
function jzMeta(g, k) { var m = JZ_DATA.meta && JZ_DATA.meta[g] ? JZ_DATA.meta[g][k] : null; return m || {}; }
function jzName(g, k) { var m = jzMeta(g, k); return m.name || k; }
function jzHas(g, k) { return !!(k && JZ_REG[g] && JZ_REG[g][k]); }
// implemented keys in the web order (anything registered but unknown to the web goes last)
function jzOrder(g) {
    var o = (JZ_DATA.orders && JZ_DATA.orders[g]) || [], out = [], seen = {}, i, k;
    for (i = 0; i < o.length; i++) if (JZ_REG[g][o[i]] && !seen[o[i]]) { out.push(o[i]); seen[o[i]] = 1; }
    for (k in JZ_REG[g]) if (JZ_REG[g].hasOwnProperty(k) && !seen[k]) out.push(k);
    return out;
}
// key the panel can actually build: itself, else the web's declared counterpart, else a default
var JZ_FALLBACKS = 0;
var JZ_FALLBACK_KEYS = [];
function jzFallback(g, k, dflt) {
    if (jzHas(g, k)) return k;
    if (k && k !== 'none') { JZ_FALLBACKS++; if (jzIndexOf(JZ_FALLBACK_KEYS, g + '.' + k) < 0 && JZ_FALLBACK_KEYS.length < 60) JZ_FALLBACK_KEYS.push(g + '.' + k); }
    var m = jzMeta(g, k);
    if (m.ae && jzHas(g, m.ae)) return m.ae;
    return dflt;
}
// may random picks use this entry?  (追加分 first, then 和風 — same rule as the browser)
function jzRandomOk(o, g, k) {
    var m = g === 'style' ? JZ_DATA.styles[k] : (g === 'font' ? JZ_DATA.fonts[k] : jzMeta(g, k));
    if (!m) return false;
    if (m.extra && !(o && o.extra === true)) return false;
    if (m.wa && o && o.wa === false) return false;
    if (m.set && !(o && o[m.set] === true)) return false;   // part sets (horror / typo / kinetic) are browser-only for now
    return true;
}
// inDur / outDur tables exported from the web (duration grid 0.2..4.0 s, optional glyph-count rows)
function jzTab(tb, dur, n) {
    if (!tb) return null;
    var G = JZ_DATA.durGrid, row = tb.d, i;
    if (tb.n) { var best = 0; for (i = 0; i < tb.n.length; i++) if (Math.abs(tb.n[i] - n) < Math.abs(tb.n[best] - n)) best = i; row = tb.d[best]; }
    if (dur <= G[0]) return row[0];
    if (dur >= G[G.length - 1]) return row[row.length - 1];
    var f = (dur - G[0]) / (G[1] - G[0]), j = Math.floor(f), u = f - j;
    return row[j] + (row[j + 1] - row[j]) * u;
}
function jzFitsN(k, n) { var m = jzMeta('layout', k); if (!m.fits) return true; n = jzClamp(Math.round(n), 1, 60); return m.fits.charAt(n - 1) === '1'; }
