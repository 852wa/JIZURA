// ================================================================ おまかせ + random accent / ghost colours (ES3 port of the web engine)
function jzToHex(r, g, b) {  // 0..255 -> #RRGGBB
    function h2(v) { v = Math.round(jzClamp(v, 0, 255)); var s = v.toString(16).toUpperCase(); return s.length < 2 ? '0' + s : s; }
    return '#' + h2(r) + h2(g) + h2(b);
}
function jzHsl(h, s, l) {    // h 0..360, s/l 0..1 -> hex
    h = ((h % 360) + 360) % 360 / 360;
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    return jzToHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
}
function jzToHsl(hex) {
    var c = jzHex(hex), r = c[0], g = c[1], b = c[2];
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    var d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    var h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
    return [h * 60, s, l];
}
function jzRelLum(hex) {
    var c = jzHex(hex), o = [], k, v;
    for (k = 0; k < 3; k++) { v = c[k]; o.push(v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); }
    return 0.2126 * o[0] + 0.7152 * o[1] + 0.0722 * o[2];
}
function jzContrast(a, b) { var x = jzRelLum(a), y = jzRelLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
// nudge lightness away from the background until the colour reads
function jzFitContrast(hex, bg, min) {
    if (jzContrast(hex, bg) >= min) return String(hex).toUpperCase();
    var hsl = jzToHsl(hex), l = hsl[2], dark = jzLum(bg) < 0.5, i, c;
    for (i = 0; i < 24; i++) {
        l = dark ? Math.min(0.96, l + 0.035) : Math.max(0.04, l - 0.035);
        c = jzHsl(hsl[0], hsl[1], l);
        if (jzContrast(c, bg) >= min) return c;
    }
    return dark ? '#FFFFFF' : '#111111';
}
function jzMixHex(h1, h2, t) { var a = jzHex(h1), b = jzHex(h2); return jzToHex((a[0] + (b[0] - a[0]) * t) * 255, (a[1] + (b[1] - a[1]) * t) * 255, (a[2] + (b[2] - a[2]) * t) * 255); }
function jzCleanHex(s) {     // '#abc123' / 'abc123' -> '#ABC123', anything else -> null
    s = jzTrim(s || '').replace(/^#/, '');
    if (/^[0-9A-Fa-f]{3}$/.test(s)) s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2);
    return /^[0-9A-Fa-f]{6}$/.test(s) ? '#' + s.toUpperCase() : null;
}
// accent + chromatic ghost pair that works on the given background
function jzRandomPalette(bg, rnd) {
    rnd = rnd || Math.random;
    var dark = jzLum(bg) < 0.5, a, b, t;
    if (rnd() < 0.4) {
        var pr = JZ_DATA.ghostPairs[Math.floor(rnd() * JZ_DATA.ghostPairs.length) % JZ_DATA.ghostPairs.length];
        a = pr[0]; b = pr[1];
        if (rnd() < 0.5) { t = a; a = b; b = t; }
        if (!dark) { a = jzHsl(jzToHsl(a)[0], 0.95, 0.47); b = jzHsl(jzToHsl(b)[0], 0.95, 0.47); }
    } else {
        var h = rnd() * 360, gap = [180, 165, 150, 135][Math.floor(rnd() * 4) % 4] * (rnd() < 0.5 ? 1 : -1);
        var s = 0.82 + rnd() * 0.18, l = dark ? 0.52 + rnd() * 0.1 : 0.44 + rnd() * 0.08;
        a = jzHsl(h, s, l); b = jzHsl(h + gap, s, l);
    }
    var r = rnd(), ha = jzToHsl(a)[0], hb = jzToHsl(b)[0];
    var acc = r < 0.35 ? a : (r < 0.6 ? b : jzHsl((ha + hb) / 2 + (rnd() < 0.5 ? 0 : 180), 0.9, dark ? 0.6 : 0.45));
    return { accent: jzFitContrast(acc, bg, 3), ghostA: a, ghostB: b };
}
// copy of a style pack with the accent / ghost colours replaced in every scheme (the shared data is never mutated)
function jzStyleWithPalette(st, pal) {
    var o = jzCopy(st), out = [], i, s, acc;
    for (i = 0; i < st.schemes.length; i++) {
        s = jzCopy(st.schemes[i]);
        if (pal.accent) {
            acc = jzFitContrast(pal.accent, s.bg, 2.4);
            if (s.ink === s.accent) s.ink = acc;
            s.accent = acc;
            if (s.grad) s.grad = [acc, jzMixHex(pal.accent, '#000000', 0.7)];
        }
        if (pal.ghostA) s.ghostA = jzFitContrast(pal.ghostA, s.bg, 1.35);
        if (pal.ghostB) s.ghostB = jzFitContrast(pal.ghostB, s.bg, 1.35);
        out.push(s);
    }
    o.schemes = out;
    return o;
}
// technique on/off map for a mood — deterministic from the seed so a rebuild reproduces it
function jzAllEnabled() {
    var en = { layout: {}, enter: {}, exit: {}, hold: {}, decor: {} }, groups = [['layout', JZ_DATA.layoutOrder], ['enter', JZ_DATA.enterOrder], ['exit', JZ_DATA.exitOrder], ['hold', JZ_DATA.holdOrder], ['decor', JZ_DATA.decorOrder]], k, j;
    for (k = 0; k < groups.length; k++) for (j = 0; j < groups[k][1].length; j++) en[groups[k][0]][groups[k][1][j]] = true;
    return en;
}
function jzMoodEnabled(moodKey, seed) {
    var M = moodKey ? JZ_DATA.moods[moodKey] : null;
    if (!M) return jzAllEnabled();
    var rng = new JzRng((jzHash(seed || 1, 4242) % 2147483646) + 1), en = jzAllEnabled(), k;
    function subset(group, order, prefer, min) {
        var on = {}, n = 0, i;
        for (i = 0; i < order.length; i++) { on[order[i]] = prefer ? (jzIndexOf(prefer, order[i]) >= 0 || rng.chance(0.22)) : rng.chance(0.8); if (on[order[i]]) n++; }
        for (i = 0; i < order.length && n < min; i++) if (!on[order[i]]) { on[order[i]] = true; n++; }
        en[group] = on;
    }
    subset('layout', JZ_DATA.layoutOrder, M.layout, 4);
    subset('enter', JZ_DATA.enterOrder, M.enter, 3);
    subset('exit', JZ_DATA.exitOrder, M.exit, 3);
    en.enter.cut = true; en.exit.cut = true;
    for (k = 0; k < JZ_DATA.holdOrder.length; k++) en.hold[JZ_DATA.holdOrder[k]] = jzIndexOf(M.noHold || [], JZ_DATA.holdOrder[k]) < 0;
    subset('decor', JZ_DATA.decorOrder, null, 4);
    return en;
}
// roll a whole new look: mood, style, effect strengths, switches, seed, maybe a palette
function jzOmakase(curMood, curStyle, rnd) {
    rnd = rnd || Math.random;
    function pick(a) { return a[Math.floor(rnd() * a.length) % a.length]; }
    function range(r) { return r[0] + (r[1] - r[0]) * rnd(); }
    var moods = [], i, k;
    for (i = 0; i < JZ_DATA.moodOrder.length; i++) if (JZ_DATA.moodOrder[i] !== curMood) moods.push(JZ_DATA.moodOrder[i]);
    var mood = pick(moods), M = JZ_DATA.moods[mood];
    var base = (M.styles && rnd() < 0.72) ? M.styles : JZ_DATA.styleOrder, pool = [];
    for (i = 0; i < base.length; i++) if (base[i] !== curStyle && JZ_DATA.styles[base[i]]) pool.push(base[i]);
    if (!pool.length) for (i = 0; i < JZ_DATA.styleOrder.length; i++) if (JZ_DATA.styleOrder[i] !== curStyle) pool.push(JZ_DATA.styleOrder[i]);
    var style = pick(pool), fx = {};
    for (k in M.fx) if (M.fx.hasOwnProperty(k)) fx[k] = range(M.fx[k]);
    var r = { mood: mood, style: style, fx: fx, onTwos: rnd() < 0.75, flash: rnd() < 0.65, hud: pick([0, 0, 1, 2]), seed: Math.floor(rnd() * 999999999), palette: null };
    if (rnd() < 0.38) r.palette = jzRandomPalette(JZ_DATA.styles[style].schemes[0].bg, rnd);
    return r;
}
