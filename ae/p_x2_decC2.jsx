// ================================================================ 追加分2 decor C part 2 (AE port of src/11p_x2_decC.js, pack x2decC)
// Meters / media (xnLevelMeter … xnBattery), widgets (xnSliders … xnTyping), calendar / clock / ticker.
// Uses the shared helpers of part 1 (p_x2_decC1.jsx, prefix axn_): axn_S / axn_add / axn_done display list -> one shape layer,
// axn_T small text, axn_H expression header (t = time - 0.04, K = exit fade), axn_e eases, axn_spot / axn_band placement.

// ================================================================ meters / media

/* ---- xnLevelMeter — レベルメーター: stereo L / R segment meters with a dB scale and peak-hold ticks.
   Each row is a thick dashed line (dash = one segment) cut by Trim Paths in whole segments. There is no audio level in AE:
   the level is the browser's no-audio fallback (smooth noise + a fast wobble). */
axn_reg('xnLevelMeter', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.8, N = 16, sw = 12 * u, sg = 4 * u, shh = 12 * u, rg = 8 * u, lab = fs * 1.4, pit = sw + sg;
    var w = lab + N * pit, h = shh * 2 + rg + fs * 1.6, sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3, ac = axn_acc(sc), x0 = sp.x + lab, ch, y, yc, PRE;
    var LV = 'function nz(x,s){var i=Math.floor(x),f=x-i,w=f*f*(3-2*f),a=hh(i*1.31+s*7.7)*2-1,b=hh((i+1)*1.31+s*7.7)*2-1;return a+(b-a)*w;}' +
        'var E=oe(t/0.45);function lv(c,tt){return cl((0.52+0.36*nz(tt*3.1+c*7.3,' + (p.seed % 997) + '+c)+0.1*Math.sin(tt*9+c))*E);}';
    var S = axn_S(ctx, 'level meter', A), sc4 = [['-24', 0.2], ['-12', 0.5], ['-6', 0.75], ['0', 1]], i, ys = sp.y + shh * 2 + rg + fs * 0.95;
    for (ch = 0; ch < 2; ch++) {
        y = sp.y + ch * (shh + rg); yc = y + shh / 2;
        PRE = LV + 'var c=' + ch + ',L=lv(c,time),k=Math.round(L*16),pk=L,j;for(j=1;j<=6;j++)pk=Math.max(pk,lv(c,time-j*0.07)-j*0.02);var pi=Math.min(15,Math.round(pk*16));';
        axn_seg(S, [[x0, yc, x0 + N * pit, yc]], axn_sub(sc), shh, 0.22, { dash: [sw, sg], trimE: 'Math.ceil(16*oe(t/0.45))/16' });
        axn_seg(S, [[x0, yc, x0 + 12 * pit, yc]], sc.fg, shh, 1, { dash: [sw, sg], pre: PRE, trimE: 'Math.min(k,12)/12' });
        axn_seg(S, [[x0 + 12 * pit, yc, x0 + 16 * pit, yc]], ac, shh, 1, { dash: [sw, sg], pre: PRE, trimE: 'Math.max(0,k-12)/4' });
        axn_box(S, x0, y, sw, shh, sc.fg, 0.9, { pre: PRE, posEx: '[pi*' + jzN(pit) + ',0]', opEx: 'pi>=k?1:0', fillEx: 'pi>=12?' + axn_cx(ac) + ':' + axn_cx(sc.fg) });
    }
    axn_done(S);
    for (ch = 0; ch < 2; ch++) axn_T(ctx, ch ? 'R' : 'L', sp.x, sp.y + ch * (shh + rg) + shh / 2, fs, { a: A, c: sc.fg, e: 'oe(t/0.45)' });
    for (i = 0; i < 4; i++) axn_T(ctx, sc4[i][0], x0 + (N * pit - sg) * sc4[i][1], ys, fs * 0.85, { al: sc4[i][1] === 1 ? 'right' : 'center', a: A * 0.8, e: 'oe(t/0.45)', num: 1 });
    if (axn_noNo(ctx)) axn_T(ctx, 'dB', x0, ys, fs * 0.85, { a: A * 0.8, e: 'oe(t/0.45)' });
});

/* ---- xnTimeline — タイムライン: an editor's mini timeline: tracks of clips, the current clip lit, a playhead crossing it.
   The ruler ticks are the dashes of two dashed lines (minor / every fifth), revealed by Trim Paths. */
axn_reg('xnTimeline', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.72, nT = 2 + (p.n > 1 ? 1 : 0), th = 15 * u, tg = 6 * u, lab = fs * 2, w = 340 * u, ruler = 13 * u;
    var h = ruler + nT * (th + tg), sp = axn_spot(ctx, bb, w + lab, h, p, 22 * u), A = sp.ok ? 1 : 0.3, x0 = sp.x + lab, ac = axn_acc(sc), E = 'oe(t/0.5)', tw = Math.max(1, u);
    var S = axn_S(ctx, 'timeline', A), c0 = 0.3, c1 = 0.7, k, i, x, y, len, cur, ee;
    axn_seg(S, [[x0 - tw / 2, sp.y + ruler - 4.5 * u, x0 + w + tw / 2, sp.y + ruler - 4.5 * u]], axn_sub(sc), 3 * u, 0.6, { dash: [tw, w / 30 - tw], trimE: E });
    axn_seg(S, [[x0 - tw / 2, sp.y + ruler - 6.5 * u, x0 + w + tw / 2, sp.y + ruler - 6.5 * u]], axn_sub(sc), 7 * u, 0.6, { dash: [tw, w / 6 - tw], trimE: E });
    for (k = 0; k < nT; k++) {
        y = sp.y + ruler + k * (th + tg); x = axn_r(p.seed, k, 1) * 0.08; i = 0;
        while (x < 0.98 && i < 6) {
            len = Math.min(1 - x, 0.14 + axn_r(p.seed, k, i, 2) * 0.26); cur = k === 0 && i === 1; ee = axn_e(0.45, 0.05 + i * 0.05 + k * 0.04);
            if (cur) { c0 = x; c1 = x + len; }
            axn_rr(S, x0 + x * w, y, Math.max(2, len * w - 3 * u), th, 2.5 * u, cur ? ac : (k ? axn_sub(sc) : sc.fg), cur ? 0.95 : (k ? 0.3 : 0.38), null, 0,
                { pre: 'var e=' + ee + ';', posEx: '[' + jzN(40 * u) + '*(1-e),0]', opEx: 'e' });
            x += len + 0.012; i++;
        }
    }
    var PH = 'var e=' + E + ',px=' + jzN(w) + '*(' + jzN(c0) + '+' + jzN(c1 - c0) + '*cl(time/' + jzN(Math.max(0.2, ctx.cut.dur || 1)) + '))*e;';
    axn_seg(S, [[x0, sp.y + ruler - 2 * u, x0, sp.y + h - tg]], sc.fg, Math.max(1.2, 1.6 * u), 1, { pre: PH, posEx: '[px,0]' });
    axn_poly(S, [[x0 - 5 * u, sp.y], [x0 + 5 * u, sp.y], [x0 + 5 * u, sp.y + 5 * u], [x0, sp.y + ruler - 2 * u], [x0 - 5 * u, sp.y + 5 * u]], sc.fg, 1, { pre: PH, posEx: '[px,0]', opEx: 'e' });
    axn_done(S);
    for (k = 0; k < nT; k++) axn_T(ctx, ['V1', 'A1', 'A2'][k], sp.x, sp.y + ruler + k * (th + tg) + th / 2, fs, { a: A * 0.8, e: E, num: 1 });
});

/* ---- xnTrackList — 曲順リスト: a playlist: skeleton rows, the current row carrying the lyric line and bouncing now-playing bars */
axn_reg('xnTrackList', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.9, bf = jzBodyF(ctx), rows = 3 + (p.n > 2 ? 1 : 0), rh = fs * 1.9, w = 290 * u, h = rows * rh, cur = 1;
    var sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3, ac = axn_acc(sc), base = (ctx.cut.line | 0) + 1, nx = fs * 1.9, lt = axn_lineText(ctx), i, k, e, y, x, SL;
    var S = axn_S(ctx, 'track list', A);
    for (i = 0; i < rows; i++) {
        e = axn_e(0.4, i * 0.08); y = sp.y + rh * (i + 0.5);
        if (i > 0) axn_seg(S, [[sp.x, sp.y + rh * i, sp.x + w, sp.y + rh * i]], axn_sub(sc), Math.max(1, 0.8 * u), 0.3, { trimE: e });
        if (i === cur) {
            for (k = 0; k < 3; k++) {          // now-playing bars: full-height lines trimmed to the bouncing level
                x = sp.x + k * 5 * u + 1.5 * u;
                axn_seg(S, [[x, y + fs * 0.45, x, y - fs * 0.4]], ac, 3 * u, 1, { trimE: '(0.25+0.6*Math.abs(Math.sin(time*' + jzN(5 + k * 1.7) + '+' + (k * 2) + ')))/0.85*' + e });
            }
        } else axn_rr(S, sp.x + nx, y - fs * 0.22, w * (0.25 + 0.3 * axn_r(p.seed, i, 5)), fs * 0.44, fs * 0.22, axn_sub(sc), 0.32, null, 0, { gx: e });
    }
    axn_done(S);
    for (i = 0; i < rows; i++) {
        e = axn_e(0.4, i * 0.08); y = sp.y + rh * (i + 0.5); SL = '[' + jzN(18 * u) + '*(1-' + e + '),0]';
        if (i === cur) axn_T(ctx, axn_clip(lt, axn_hasCJK(lt) ? 11 : 20), sp.x + nx, y, fs, { f: bf, c: sc.fg, a: A * 0.95, tr: 0.04, e: e, posEx: SL });
        else axn_T(ctx, axn_pad(Math.max(1, base - cur + i)), sp.x, y, fs * 0.85, { a: A * 0.7, e: e, posEx: SL, num: 1 });
        axn_T(ctx, (2 + (axn_h(p.seed, i, 7) % 3)) + ':' + axn_pad(axn_h(p.seed, i, 8) % 60), sp.x + w, y, fs * 0.82, { al: 'right', a: A * (i === cur ? 0.9 : 0.55), e: e, time: 1 });
    }
});

/* ---- xnStars — 星評価: a five-star rating whose stars fill one by one (half stars included) with its score.
   Per star: an outline, the left half (the browser's clipped half fill) and the full fill, switched on in turn. */
var AXN_STAR = (function () { var a = [], i, an, r; for (i = 0; i < 10; i++) { an = -90 * AXN_D + i * Math.PI / 5; r = i % 2 ? 0.42 : 1; a.push([Math.cos(an) * r, Math.sin(an) * r]); } return a; })();
axn_reg('xnStars', function (ctx, bb, p, u) {
    var sc = ctx.sc, R = 13 * u + 3 * u * p.n, gap = R * 2.35, fs = axn_fs(ctx), rating = 3.5 + (axn_h(p.seed, 3) % 4) * 0.5, nn = axn_noNo(ctx);
    var w = gap * 4 + R * 2 + (nn ? 0 : fs * 2.4), h = R * 2.1, sp = axn_spot(ctx, bb, w, h, p, 20 * u), A = sp.ok ? 1 : 0.3, ac = axn_acc(sc), su = axn_sub(sc), i, j, ft, d, pts, sub;
    var S = axn_S(ctx, 'star rating', A);
    for (i = 0; i < 5; i++) {
        ft = 0.45 + i * 0.16; d = rating - i; pts = [];
        for (j = 0; j < 10; j++) pts.push([AXN_STAR[j][0] * R, AXN_STAR[j][1] * R]);
        sub = [];
        if (d > 0) sub.push({ shapes: [{ k: 'p', pts: [pts[0], pts[9], pts[8], pts[7], pts[6], pts[5]], closed: true }], fill: ac, opEx: 't>' + jzN(ft) + '?1:0' });
        if (d >= 1) sub.push({ shapes: [{ k: 'p', pts: pts, closed: true }], fill: ac, opEx: 't>=' + jzN(ft + 0.12) + '?1:0' });
        sub.push({ shapes: [{ k: 'p', pts: pts, closed: true }], stroke: su, lw: Math.max(1.2, 1.6 * u), join: 2, strokeEx: d > 0 ? 't>' + jzN(ft) + '?' + axn_cx(ac) + ':' + axn_cx(su) : null });
        axn_add(S, { name: 'star ' + (i + 1), sub: sub, at: [sp.x + R + i * gap, sp.y + h / 2 + R * 0.06], scEx: '[s,s]',
            pre: 'var s=ob((t-' + jzN(i * 0.06) + ')/0.35,1.6)*(1+0.35*Math.sin(Math.PI*cl((t-' + jzN(ft) + ')/0.3)));' });
    }
    axn_done(S);
    axn_T(ctx, rating.toFixed(1), sp.x + w, sp.y + h / 2, fs * 1.15, { al: 'right', c: sc.fg, a: A, e: axn_e(0.3, 0.3), num: 1, src: '(' + jzN(rating) + '*cl((t-0.4)/0.55)).toFixed(1)' });
});

/* ---- xnBattery — 電池残量: phone status icons: signal bars lighting up, a clock, a battery that drains over the cut */
axn_reg('xnBattery', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.9, hh = fs * 1.05, nn = axn_noNo(ctx), nt = axn_noTime(ctx);
    var sigW = 26 * u, batW = 34 * u, pcW = nn ? 0 : fs * 2.5, tmW = nt ? 0 : fs * 3.2, g = fs * 0.7, w = sigW + g + tmW + (tmW ? g : 0) + pcW + batW + 4 * u;
    var p2 = { right: p.right, low: p.low, corner: true }, sp = axn_spot(ctx, bb, w, hh, p2, 20 * u), A = sp.ok ? 1 : 0.3, c = sc.fg, cy = sp.y + hh / 2, x = sp.x, i, bhh;
    var LV = 'var lv=cl(1-0.85*cl(time/' + jzN(Math.max(0.3, ctx.cut.dur || 1)) + '))*oe((t-0.15)/0.5),low=lv<0.3;';
    var S = axn_S(ctx, 'status icons', A);
    for (i = 0; i < 4; i++) {
        bhh = hh * (0.3 + 0.23 * i);
        axn_box(S, x + i * 7 * u, sp.y + hh - bhh, 4.5 * u, bhh, c, 1, { pivot: [x + i * 7 * u, sp.y + hh], pre: 'var e=' + axn_e(0.25, 0.1 + i * 0.12, 'oc') + ';', scEx: '[1,0.4+0.6*e]', opEx: '0.25+0.75*e' });
    }
    x += sigW + g;
    var tx = x, mm = axn_h(p.seed, 2) % 60, hr = 1 + (axn_h(p.seed, 1) % 12);
    if (tmW) x += tmW + g;
    var px = x + pcW - fs * 0.4; x += pcW;
    axn_rr(S, x, sp.y + hh * 0.08, batW, hh * 0.84, 3 * u, null, 1, c, Math.max(1, 1.3 * u), { opEx: 'oe(t/0.3)' });
    axn_box(S, x + batW + 1.5 * u, cy - hh * 0.16, 2.5 * u, hh * 0.32, c, 1, { opEx: 'oe(t/0.3)' });
    axn_rr(S, x + 3 * u, sp.y + hh * 0.08 + 3 * u, batW - 6 * u, hh * 0.84 - 6 * u, 1.5 * u, c, 1, null, 0,
        { pre: LV, gx: 'lv', opEx: '(low&&Math.floor(time*4)%2===0)?0.45:1', fillEx: 'low?' + axn_cx(axn_acc(sc)) + ':' + axn_cx(c) });
    axn_done(S);
    if (tmW) axn_T(ctx, hr + ':' + axn_pad(mm), tx, cy, fs, { c: c, a: A, e: axn_e(0.3, 0.1), time: 1, src: '"' + hr + ':"+pd((' + mm + '+Math.floor(time/2))%60,2)' });
    axn_T(ctx, '100%', px, cy, fs * 0.9, { al: 'right', c: c, a: A, e: axn_e(0.3, 0.15), num: 1, pre: LV, src: 'Math.round(lv*100)+"%"' });
});

// ================================================================ widgets

/* ---- xnSliders — スライダー: labelled range sliders whose knobs glide to their values, with a readout each */
var AXN_SL = [['TEMPO', 'PITCH', 'REVERB'], ['GAIN', 'PAN', 'ECHO'], ['WARMTH', 'BLUR', 'GRAIN'], ['想い', '距離', '温度'], ['きもち', 'ことば', 'おと']];
axn_reg('xnSliders', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.85, bf = jzBodyF(ctx), n = Math.min(3, 1 + p.n), labs = AXN_SL[p.v % (axn_hasCJK(axn_cutText(ctx)) ? 5 : 3)], rh = fs * 2.1, tr = 150 * u, nn = axn_noNo(ctx);
    var lw0 = 0, i, e, y, x0, VV = [];
    for (i = 0; i < n; i++) lw0 = Math.max(lw0, axn_tw(ctx, labs[i], fs, bf, 0.1));
    lw0 += fs * 0.9;
    var w = lw0 + tr + (nn ? 8 * u : fs * 2.2), h = n * rh, sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3, ac = axn_acc(sc), S = axn_S(ctx, 'sliders', A);
    for (i = 0; i < n; i++) {
        e = axn_e(0.4, i * 0.08); y = sp.y + rh * (i + 0.5); x0 = sp.x + lw0;
        VV.push('var e=' + e + ',v=cl(' + jzN(0.2 + 0.7 * axn_r(p.seed, i, 4)) + '*ob((t-' + jzN(0.3 + i * 0.18) + ')/0.6,1.3)+0.03*Math.sin(time*1.7+' + (i * 2) + ')*' + jzN(ctx.fx.motion) + '*cl(t-1));');
        axn_seg(S, [[x0, y, x0 + tr, y]], axn_sub(sc), Math.max(2, 3 * u), 0.4, { cap: 2, trimE: e });
        axn_seg(S, [[x0, y, x0 + tr, y]], ac, Math.max(2, 3 * u), 1, { cap: 2, pre: VV[i], trimE: 'v*e' });
        axn_add(S, { name: 'knob', sub: [{ shapes: [{ k: 'e', x: 0, y: 0, rx: 7 * u, ry: 7 * u }], fill: sc.fg }, { shapes: [{ k: 'e', x: 0, y: 0, rx: 3 * u, ry: 3 * u }], fill: sc.bg }],
            at: [x0, y], pre: VV[i], posEx: '[' + jzN(tr) + '*v*e,0]', scEx: '[e,e]' });
    }
    axn_done(S);
    for (i = 0; i < n; i++) {
        y = sp.y + rh * (i + 0.5);
        axn_T(ctx, labs[i], sp.x, y, fs, { f: bf, tr: 0.1, a: A * 0.9, e: axn_e(0.4, i * 0.08) });
        axn_T(ctx, '00', sp.x + w, y, fs, { al: 'right', c: sc.fg, a: A, num: 1, pre: VV[i], e: 'e', src: 'pd(v*100,2)' });
    }
});

/* ---- xnDropdown — プルダウン: a select box that drops open, runs its highlight down the options, picks one and closes.
   The browser clips the list to its unfolding height; here the list box grows down and each row fades in as the edge passes it. */
var AXN_DD = [['Verse', 'Chorus', 'Bridge'], ['Soft', 'Normal', 'Loud'], ['Slow', 'Mid', 'Fast'], ['きのう', 'きょう', 'あした'], ['ひとり', 'ふたり', 'みんな']];
axn_reg('xnDropdown', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.92, bf = jzBodyF(ctx), opts = AXN_DD[p.v % (axn_hasCJK(axn_cutText(ctx)) ? 5 : 3)], rh = fs * 1.9, sel = 1 + (axn_h(p.seed, 2) % 2), mw = 0, i;
    for (i = 0; i < 3; i++) mw = Math.max(mw, axn_tw(ctx, opts[i], fs, bf));
    var w = mw + fs * 3.4, h = rh * 4 + 6 * u, sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3, ac = axn_acc(sc), c = sc.fg, lw = Math.max(1, 1.3 * u);
    var dur = Math.max(0.6, ctx.cut.dur || 1), tc = Math.min(1.45, dur * 0.62), ly = sp.y + rh + 6 * u, kx = sp.x + w - fs * 1.1, ky = sp.y + rh / 2, k = fs * 0.28;
    var PRE = 'var op=oe((t-0.3)/0.3)*(1-ioc((t-' + jzN(tc) + ')/0.25)),cd=t>' + jzN(tc + 0.1) + ',hl=' + sel + '*ioc((t-0.6)/0.45),RH=' + jzN(rh) + ',LH=3*RH*op;', COL = 'cd?' + axn_cx(ac) + ':' + axn_cx(c);
    var S = axn_S(ctx, 'dropdown', A);
    axn_rr(S, sp.x, sp.y, w, rh, 5 * u, null, 1, c, lw, { gx: 'oe(t/0.35)', pre: PRE, strokeEx: COL });
    axn_line(S, [[kx - k, ky - k * 0.5], [kx, ky + k * 0.5], [kx + k, ky - k * 0.5]], c, lw * 1.2, 1, { pivot: [kx, ky], pre: PRE, scEx: '[1,1-2*op]', opEx: 'oe(t/0.35)', strokeEx: COL });
    axn_rr(S, sp.x, ly, w, rh * 3, 5 * u, null, 1, axn_sub(sc), lw, { pre: PRE, gy: 'op', opEx: 'op>0.01?1:0' });
    axn_rr(S, sp.x + 3 * u, ly + 3 * u, w - 6 * u, rh - 6 * u, 3 * u, ac, 0.9, null, 0, { pre: PRE, posEx: '[0,RH*hl]', opEx: '(LH-RH*(hl+0.5))/(RH*0.4)' });
    axn_done(S);
    axn_T(ctx, opts[0], sp.x + fs * 0.8, sp.y + rh / 2, fs, { f: bf, c: c, a: A, e: axn_e(0.3, 0.1), pre: PRE, src: 'cd?' + axn_q(opts[sel]) + ':' + axn_q(opts[0]), name: 'dropdown value' });
    for (i = 0; i < 3; i++) axn_T(ctx, opts[i], sp.x + fs * 0.8, ly + rh * (i + 0.5), fs, { f: bf, c: axn_sub(sc), a: A, pre: PRE, e: '(LH-RH*' + jzN(i + 0.5) + ')/(RH*0.4)', colEx: 'Math.abs(hl-' + i + ')<0.5', col2: axn_on(sc, ac) });
});

/* ---- xnPager — ページ送り: pagination: ‹ 1 2 3 4 5 › with the active box sliding onto the current line's page */
axn_reg('xnPager', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.95, c = fs * 1.9, g = fs * 0.35, n = 5, ln = Math.max(0, ctx.cut.line | 0), base = Math.floor(ln / n) * n, act = ln % n, nn = axn_noNo(ctx);
    var w = (n + 2) * c + (n + 1) * g, sp = axn_band(ctx, bb, w, c, p, 24 * u + axn_bh(bb) * 0.05), A = sp.ok ? 1 : 0.3, ac = axn_acc(sc), su = axn_sub(sc), lw = Math.max(1, 1.3 * u);
    var cy = sp.y + c / 2, k = fs * 0.3, from = act === 0 ? 0 : act - 1, rd = p.big ? c / 2 : 4 * u, i, e, on, xl = sp.x + c / 2, xr = sp.x + w - c / 2, cxs = [], ons = [];
    var PRE = 'var q=ob((t-0.4)/0.4,1.5),pos=' + from + '+' + (act - from) + '*q;', S = axn_S(ctx, 'pager', A);
    for (i = 0; i < n; i++) { cxs.push(sp.x + (i + 1) * (c + g) + c / 2); ons.push(from !== act && (i === from || i === act) ? '(Math.abs(pos-' + i + ')<0.5)' : (i === act ? '1' : '0')); }
    axn_line(S, [[xl + k * 0.5, cy - k], [xl - k * 0.5, cy], [xl + k * 0.5, cy + k]], su, lw * 1.2, 1, { opEx: 'oe(t/0.3)' });
    axn_line(S, [[xr - k * 0.5, cy - k], [xr + k * 0.5, cy], [xr - k * 0.5, cy + k]], sc.fg, lw * 1.2, 1, { opEx: axn_e(0.3, 0.1) });
    axn_rr(S, cxs[from] - c / 2, sp.y, c, c, rd, ac, 1, null, 0, { pre: PRE, posEx: '[' + jzN(cxs[act] - cxs[from]) + '*q,0]', opEx: axn_e(0.3, 0.15) });
    for (i = 0; i < n; i++) {
        e = axn_e(0.3, 0.04 * i, 'oc'); on = ons[i];
        if (on !== '1') axn_rr(S, cxs[i] - c / 2, sp.y, c, c, rd, null, 0.5, su, lw, { pre: PRE, opEx: on === '0' ? e : '(' + on + '?0:1)*' + e });
        if (nn) axn_dot(S, cxs[i], cy, 3 * u, su, 1, { pre: PRE, opEx: e, fillEx: on === '0' ? null : on + '?' + axn_cx(axn_on(sc, ac)) + ':' + axn_cx(su) });
    }
    axn_done(S);
    if (!nn) for (i = 0; i < n; i++)
        axn_T(ctx, String(base + i + 1), cxs[i], cy, fs, { al: 'center', tr: 0, c: su, a: A, e: axn_e(0.3, 0.04 * i, 'oc'), pre: PRE, colEx: ons[i] === '0' ? null : ons[i], col2: axn_on(sc, ac) });
});

/* ---- xnSearch — 検索窓: a search field: magnifier, the cut typed in with a caret, then a hit count below */
axn_reg('xnSearch', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx), bf = jzBodyF(ctx), q = axn_clip(axn_cutText(ctx), 12), cj = axn_hasCJK(q), hgt = fs * 2.3, twq = axn_tw(ctx, q, fs, bf);
    var w = jzClamp(twq + fs * 4.2, 230 * u, 420 * u), h = hgt + fs * 1.7, sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3, c = sc.fg, lw = Math.max(1, 1.4 * u), E = 'oe(t/0.4)';
    var mx = sp.x + fs * 1.3, my = sp.y + hgt / 2, mr = fs * 0.36, cs = jzChars(q), n = cs.length, dT = Math.min(0.7, n * 0.07), tD = 0.3 + dT + 0.15, tx = sp.x + fs * 2.4;
    var KX = 'var k=Math.floor(' + n + '*cl((t-0.3)/' + jzN(Math.max(0.01, dT)) + ')+1e-6);', S = axn_S(ctx, 'search field', A);
    axn_rr(S, sp.x, sp.y, w, hgt, p.big ? 5 * u : hgt / 2, null, 1, c, lw, { gx: E, gc: true });
    axn_ring(S, mx, my - mr * 0.2, mr, axn_sub(sc), lw * 1.2, 1, { pivot: [mx, my - mr * 0.2], pre: 'var e=' + E + ';', scEx: '[e,e]' });
    axn_seg(S, [[mx + mr * 0.7, my + mr * 0.5, mx + mr * 1.35, my + mr * 1.15]], axn_sub(sc), lw * 1.4, 1, { cap: 2, opEx: E });
    axn_seg(S, [[tx + 3 * u, my - fs * 0.6, tx + 3 * u, my + fs * 0.6]], axn_acc(sc), Math.max(1.5, 2 * u), 1,
        { pre: KX, posEx: '[' + jzArrExpr(axn_cum(cs, twq)) + '[k],0]', opEx: '((t<=' + jzN(tD) + '||Math.floor(time*2.4)%2===0)?1:0)*cl((t-0.2)*5)' });
    axn_done(S);
    axn_T(ctx, q, tx, my, fs, { f: bf, c: c, a: A * 0.9, pre: KX, src: axn_q(q) + '.substr(0,k)' });
    var nres = 100 + axn_h(p.seed, 9) % 9000, ns = nres >= 1000 ? Math.floor(nres / 1000) + ',' + jzPad(nres % 1000, 3) : String(nres);
    axn_T(ctx, axn_noNo(ctx) ? (cj ? '検索結果' : 'results') : (cj ? '約 ' + ns + ' 件' : ns + ' results'), sp.x + fs, sp.y + hgt + fs, fs * 0.8, { f: bf, a: A * 0.85, e: axn_e(0.3, tD) });
});

/* ---- xnKeycaps — キーの列: keycaps spelling the cut's reading, pressed one after another, ending on Enter */
axn_reg('xnKeycaps', function (ctx, bb, p, u) {
    var sc = ctx.sc, toks = axn_syllables(axn_cutText(ctx)), rj = '', ks = [], i, up;
    for (i = 0; i < toks.length; i++) if (toks[i][1]) rj += toks[i][0];
    up = jzChars(rj.toUpperCase());
    for (i = 0; i < up.length && ks.length < 8; i++) if (/[A-Z]/.test(up[i])) ks.push(up[i]);
    if (!ks.length) ks = ['L', 'Y', 'R', 'I', 'C'];
    var fs = axn_fs(ctx) * 0.9, k = fs * 2, g = fs * 0.35, n = ks.length, ew = k * 1.8, w = n * (k + g) + ew, h = k + 5 * u;
    var sp = axn_band(ctx, bb, w, h, p, 22 * u + axn_bh(bb) * 0.05), A = sp.ok ? 1 : 0.3, ac = axn_acc(sc), c = sc.fg, lw = Math.max(1, 1.3 * u), y = sp.y, x, kw, ent, sub, PRE = [], SL = '[0,pr*' + jzN(4 * u) + '+(1-e)*' + jzN(8 * u) + ']';
    var S = axn_S(ctx, 'keycaps', A);
    for (i = 0; i <= n; i++) {
        ent = i === n; kw = ent ? ew : k; x = sp.x + i * (k + g);
        PRE.push('var e=ob((t-' + jzN(i * 0.035) + ')/0.3,1.5),dt=t-' + jzN(0.4 + i * 0.13) + ',pr=dt>0?Math.exp(-dt*9):0;');
        axn_rr(S, x, sp.y + 5 * u, kw, k, 5 * u, null, 0.6, axn_sub(sc), lw, { pre: PRE[i], opEx: 'e' });        // the key's base
        sub = [{ shapes: [{ k: 'r', x: x, y: y, w: kw, h: k, r: 5 * u }], fill: sc.bg },
            { shapes: [{ k: 'r', x: x, y: y, w: kw, h: k, r: 5 * u }], fill: ac, stroke: ent ? ac : c, lw: lw, pre: PRE[i], opEx: 'pr*0.9' }];      // lit while pressed
        if (ent) sub.push({ shapes: [{ k: 'p', pts: [[x + kw * 0.7, y + k * 0.3], [x + kw * 0.7, y + k * 0.58], [x + kw * 0.3, y + k * 0.58], [x + kw * 0.42, y + k * 0.45], [x + kw * 0.3, y + k * 0.58], [x + kw * 0.42, y + k * 0.71]] }],
            stroke: c, lw: lw * 1.2, cap: 2, join: 2, pre: PRE[i], strokeEx: 'pr>0.5?' + axn_cx(axn_on(sc, ac)) + ':' + axn_cx(c) });
        axn_add(S, { name: 'key', sub: sub, pre: PRE[i], posEx: SL, opEx: 'e' });
    }
    axn_done(S);
    for (i = 0; i < n; i++)
        axn_T(ctx, ks[i], sp.x + i * (k + g) + k / 2, y + k / 2, fs, { al: 'center', tr: 0, c: c, a: A, pre: PRE[i], e: 'e', posEx: SL, colEx: 'pr>0.5', col2: axn_on(sc, ac) });
});

/* ---- xnTyping — 入力中: a chat "typing" bubble: three dots rolling in a wave, with a small status caption */
axn_reg('xnTyping', function (ctx, bb, p, u) {
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.8, bf = jzBodyF(ctx), R = 5 * u + 1.5 * u * p.n, bwid = R * 11, bht = R * 5.4, cj = axn_hasCJK(axn_cutText(ctx));
    var h = bht + fs * 1.7, sp = axn_spot(ctx, bb, bwid + R, h, p, 22 * u), A = sp.ok ? 1 : 0.3, rt = p.right, x0 = sp.x + (rt ? 0 : R), ax = rt ? x0 + bwid : x0, ay = sp.y + bht;
    var fillC = p.accent ? axn_acc(sc) : sc.fg, i, S = axn_S(ctx, 'typing bubble', A);
    axn_rr(S, x0, sp.y, bwid, bht, bht / 2, fillC, p.accent ? 0.95 : 0.14, p.accent ? null : axn_sub(sc), Math.max(1, 1.2 * u));
    axn_dot(S, ax + (rt ? 1 : -1) * R * 0.3, ay - R * 0.2, R * 0.8, fillC, p.accent ? 0.95 : 0.3);
    for (i = 0; i < 3; i++)
        axn_dot(S, 0, 0, R * 0.85, p.accent ? axn_on(sc, fillC) : sc.fg, 1, { at: [x0 + bwid / 2 + (i - 1) * R * 2.6, sp.y + bht / 2],
            pre: 'var ph=(((time*1.5-' + jzN(i * 0.16) + ')%1)+1)%1,b=ph<0.4?Math.sin(ph/0.4*Math.PI):0;', posEx: '[0,-b*' + jzN(R * 1.3) + ']', scEx: '[1+0.176*b,1+0.176*b]', opEx: '0.55+0.45*b' });
    axn_done(S);
    axn_pivot(S.L, ax, ay);
    axn_lx(ctx, S.L, 'ob((t-0.05)/0.4,1.5)');
    axn_T(ctx, cj ? '入力中…' : 'typing…', rt ? x0 + bwid - R : x0 + R, sp.y + bht + fs, fs, { f: bf, al: rt ? 'right' : 'left', a: A * 0.85, e: axn_e(0.3, 0.3) });
});

// ================================================================ calendar / clock / ticker

/* ---- xnCalendar — カレンダー: a mini month grid whose days fill in row by row; the cut's day gets circled.
   The day grid is ONE monospaced text (3 characters per cell, tracking sets the cell width, leading the row height) with
   per-character animators for the row-by-row reveal and today's colour; single digits sit right-aligned in their cell. */
var AXN_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
axn_reg('xnCalendar', function (ctx, bb, p, u) {
    if (axn_noNo(ctx)) return;
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.72, cw = fs * 1.75, chh = fs * 1.5, mo = axn_h(p.seed, 1) % 12, off = axn_h(p.seed, 2) % 7, days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo];
    var rowsN = Math.ceil((off + days) / 7), w = cw * 7, h = fs * 1.9 + chh * (rowsN + 1), sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3, ac = axn_acc(sc);
    var today = 1 + ((ctx.cut.line | 0) * 7 + (ctx.cut.index | 0) * 3 + axn_h(p.seed, 3)) % days, y0 = sp.y + fs * 1.9, tk = off + today - 1, tc = tk % 7, trw = Math.floor(tk / 7);
    var S = axn_S(ctx, 'calendar marks', A);
    axn_seg(S, [[sp.x, sp.y + fs * 1.55, sp.x + w, sp.y + fs * 1.55]], axn_sub(sc), Math.max(1, u), 0.7, { trimE: 'oe(t/0.4)' });
    axn_ring(S, sp.x + cw * (tc + 0.5), y0 + chh * (trw + 1.5), chh * 0.62, ac, Math.max(1.2, 1.6 * u), 1, { trimE: 'ioc((t-0.65)/0.4)' });
    axn_done(S);
    axn_T(ctx, AXN_MONTHS[mo], sp.x + cw * 0.15, sp.y + fs * 0.6, fs * 1.25, { c: sc.fg, a: A, e: 'oe(t/0.4)', tr: 0.14 });
    var pa = cw / 3, fs2 = fs * 0.85, adv2 = axn_adv(ctx, fs2), adv = axn_adv(ctx, fs), rows = [], r, c, d, s, H = axn_H(ctx);
    axn_T(ctx, 'S  M  T  W  T  F  S', sp.x + cw / 2 - adv2 / 2, y0 + chh * 0.5, fs2, { tr: jzClamp((pa - adv2) / fs2, -0.3, 1), a: A * 0.75, e: axn_e(0.35, 0.05), colEx: 'textIndex===1', col2: ac, name: 'calendar week' });
    for (r = 0; r < rowsN; r++) {
        s = '';
        for (c = 0; c < 7; c++) { d = r * 7 + c - off + 1; s += (c ? ' ' : '') + (d >= 1 && d <= days ? (d < 10 ? ' ' : '') + d : '  '); }
        rows.push(s);
    }
    var RC = 'var i=textIndex-1,row=Math.floor(i/20),col=Math.floor((i%20)/3),td=(row===' + trw + '&&col===' + tc + ');';
    var G = axn_T(ctx, rows.join('\r'), sp.x + cw / 2 - (pa + adv) / 2, y0 + chh * (1 + rowsN / 2), fs, { tr: jzClamp((pa - adv) / fs, -0.3, 1), a: A, leading: chh, name: 'calendar days' });
    if (G) jzAnimator(G, 'JZ In', [['ADBE Text Opacity', 0], ['ADBE Text Position 3D', [0, 4 * u, 0]]], H + RC + '100*(1-oc((t-(0.12+row*0.07+col*0.012))/0.3))');
    if (G) jzAnimator(G, 'JZ Today', [['ADBE Text Fill Color', jzHex(sc.fg)]], H + RC + 'td?100:0');
    if (G) jzAnimator(G, 'JZ Others', [['ADBE Text Opacity', 72]], H + RC + 'td?0:100');
});

/* ---- xnClock — 時計: an analogue clock face: ticks draw on, the hands sweep to a time, the second hand ticks.
   The ticks are the dashes of thick dashed circles, drawn on by the same Trim Paths sweep as the rim. */
axn_reg('xnClock', function (ctx, bb, p, u) {
    if (axn_noTime(ctx)) return;
    var sc = ctx.sc, fs = axn_fs(ctx) * 0.85, R = 38 * u + 9 * u * p.n, w = R * 2.1, h = R * 2.1 + fs * 1.7, sp = axn_spot(ctx, bb, w, h, p, 22 * u), A = sp.ok ? 1 : 0.3;
    var cx = sp.x + w / 2, cy = sp.y + R * 1.05, c = sc.fg, ac = axn_acc(sc), lw = Math.max(1, 1.4 * u), E = 'ioc(t/0.55)', S = axn_S(ctx, 'clock face', A);
    var hr = 1 + axn_h(p.seed, 1) % 12, mm = (axn_h(p.seed, 2) % 12) * 5, SW = 'var sw=ob((t-0.2)/0.9,1.1);', rings, i, rm, wd;
    axn_ring(S, cx, cy, R, c, lw, 1, { trimE: E });
    rings = [[0.8, 4, c, lw, 0.9], [0.86, 12, c, lw, 0.9]];
    if (p.big) rings.push([0.93, 60, axn_sub(sc), Math.max(1, u), 0.5]);
    for (i = rings.length - 1; i >= 0; i--) {
        rm = R * (rings[i][0] + 0.96) / 2; wd = rings[i][3];
        axn_ring(S, cx, cy, rm, rings[i][2], R * (0.96 - rings[i][0]), rings[i][4], { dash: [wd, 2 * Math.PI * rm / rings[i][1] - wd], pivot: [cx, cy], rot: -(wd / 2) / rm / AXN_D, trimE: E });
    }
    axn_add(S, { name: 'hour hand', shapes: [{ k: 'p', pts: [[0, 0], [0, -R * 0.48]] }], stroke: c, lw: Math.max(2.4, 3.6 * u), cap: 2, at: [cx, cy], pre: SW, rotEx: jzN((hr % 12 + mm / 60) / 12 * 360) + '*sw', opEx: E });
    axn_add(S, { name: 'minute hand', shapes: [{ k: 'p', pts: [[0, 0], [0, -R * 0.74]] }], stroke: c, lw: Math.max(1.6, 2.4 * u), cap: 2, at: [cx, cy], pre: SW, rotEx: jzN(mm / 60 * 360) + '*sw', opEx: E });
    axn_add(S, { name: 'second hand', shapes: [{ k: 'p', pts: [[0, R * 0.16], [0, -R * 0.84]] }], stroke: ac, lw: Math.max(1, 1.3 * u), cap: 1, at: [cx, cy], rotEx: '(Math.floor(time)+ob((time%1)/0.2,2.2))*6', opEx: E });
    axn_dot(S, cx, cy, 3.5 * u, ac, 1, { opEx: E });
    axn_done(S);
    axn_T(ctx, axn_pad(hr) + ':' + axn_pad(mm), cx, sp.y + R * 2.1 + fs * 0.95, fs, { al: 'center', a: A * 0.9, e: axn_e(0.3, 0.5), time: 1, tr: 0.12 });
});

/* ---- xnTicker — ティッカー: a ticker tape along a screen edge: the lyric line scrolling between rules with up / down marks and deltas.
   The tape is built long enough for the whole cut (no wrap): ONE text with the line repeated, one shape layer with the
   triangles and ONE monospaced text with the deltas, all three moved by the same position expression. */
axn_reg('xnTicker', function (ctx, bb, p, u) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, fs = axn_fs(ctx), bf = jzBodyF(ctx), bhh = fs * 2.4, nn = axn_noNo(ctx), src = axn_clip(axn_lineText(ctx) || 'lyric', 30), top = !p.low;
    if ((top ? bb.y0 : H - bb.y1) < bhh + 14 * u) top = !top;
    var A = (top ? bb.y0 : H - bb.y1) < bhh + 4 * u ? 0.3 : 1, y0 = top ? 0 : H - bhh, cy = y0 + bhh / 2, ry = top ? y0 + bhh : y0, ac = axn_acc(sc), su = axn_sub(sc);
    var SLY = jzN(top ? -bhh : bhh) + '*(1-oe(t/0.45))', B = axn_S(ctx, 'ticker band', A);       // the band slides in from its edge
    axn_box(B, 0, y0, W, bhh, sc.fg, 0.07, { posEx: '[0,' + SLY + ']' });
    axn_seg(B, [p.right ? [W, ry, 0, ry] : [0, ry, W, ry]], p.accent ? ac : sc.fg, Math.max(1.2, 1.6 * u), 0.9, { trimE: 'ioc((t-0.05)/0.6)', posEx: '[0,' + SLY + ']' });
    axn_done(B);
    var wl = axn_tw(ctx, src, fs, bf, 0.05), g = fs * 1.1, tri = fs * 0.5, wd = nn ? 0 : fs * 3.2, per0 = wl + g + tri + (wd ? fs * 0.5 + wd : 0) + g * 1.6;
    var spw = Math.max(1, (axn_tw(ctx, 'a          a', fs, bf, 0.05) - axn_tw(ctx, 'a a', fs, bf, 0.05)) / 9), ns = Math.max(2, Math.round((per0 - wl) / spw)), unit = src, i, j;
    for (i = 0; i < ns; i++) unit += ' ';
    var per = axn_tw(ctx, unit + src, fs, bf, 0.05) - wl; if (!(per > wl)) per = per0;            // the measured period of the repeated line
    var dir = p.right ? 1 : -1, speed = (50 + 60 * ctx.fx.motion) * u, travel = speed * ((ctx.cut.dur || 1) + 0.5), cnt = Math.min(40, Math.ceil((W + travel) / per) + 2);
    var X0 = dir > 0 ? W - cnt * per : 0, MOVE = '[' + jzN(dir * speed) + '*time,' + SLY + ']', s = '', ups = [], triU = [], triD = [], txx, k, t3;
    for (j = 0; j < cnt; j++) {
        s += (j ? unit.substr(src.length) : '') + src;
        ups.push(axn_r(p.seed, j, 1) < 0.6 ? 1 : 0); txx = X0 + j * per + wl + g; k = ups[j] ? -1 : 1;
        t3 = { k: 'p', closed: true, pts: [[txx, cy - k * tri * 0.45], [txx + tri, cy - k * tri * 0.45], [txx + tri / 2, cy + k * tri * 0.45]] };
        if (ups[j]) triU.push(t3); else triD.push(t3);
    }
    var S = axn_S(ctx, 'ticker marks', A);
    if (triD.length) axn_add(S, { name: 'down', shapes: triD, fill: su });
    if (triU.length) axn_add(S, { name: 'up', shapes: triU, fill: ac });
    axn_done(S);
    axn_lx(ctx, S.L, null, MOVE);
    axn_op(ctx, S.L, 'oe(t/0.45)');
    axn_T(ctx, s, X0, cy, fs, { f: bf, tr: 0.05, c: sc.fg, a: A * 0.8, e: 'oe(t/0.45)', posEx: MOVE, name: 'ticker line' });
    if (wd) {
        var fs2 = fs * 0.88, adv = axn_adv(ctx, fs2), mc = Math.max(6, Math.round(per / adv)), ds = '';
        for (j = 0; j < cnt; j++) { ds += (ups[j] ? '+' : '-') + (0.1 + axn_r(p.seed, j, 2) * 4.8).toFixed(2); if (j < cnt - 1) for (i = 5; i < mc; i++) ds += ' '; }
        axn_T(ctx, ds, X0 + wl + g + tri + fs * 0.5, cy, fs2, { tr: jzClamp((per / mc - adv) / fs2, -0.3, 1), c: su, a: A, e: 'oe(t/0.45)', posEx: MOVE, name: 'ticker deltas',
            colEx: '[' + ups.join(',') + '][Math.floor((textIndex-1)/' + mc + ')]', col2: ac });
    }
});
