// ================================================================ pack x2layC part 2 (AE port of src/11p_x2_layC.js, entries 16-30)
// xcPaperCup, xcTshirt, xcHandheld, xcBlackboard, xcTruck, xcPlate, xcDropdown, xcSelect, xcRadio, xcFloppy, xcMegaphone,
// xcBunting, xcDrawers, xcPoll, xcAwning
// Uses the kit / colour / text helpers of ae/p_x2_layC1.jsx (axc_kit, axc_fitMain, …) — the two files belong together.

function axc_smallKana(ch) { return 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.indexOf(ch) >= 0; }
// rows of at most maxPer glyphs (Latin: whole words where possible)
function axc_chunkRows(t, maxPer) {
    var s = jzTrim(String(t || '')).replace(/[\s　]+/g, ' '), out = [], cur = [], i;
    if (jzIsLatinText(s) && s.indexOf(' ') >= 0) {
        var ws = s.split(' ');
        for (i = 0; i < ws.length; i++) {
            var a = jzChars(ws[i]);
            while (a.length > maxPer) { if (cur.length) { out.push(cur); cur = []; } out.push(a.slice(0, maxPer)); a = a.slice(maxPer); }
            if (cur.length && cur.length + 1 + a.length > maxPer) { out.push(cur); cur = []; }
            cur = cur.length ? cur.concat([' '], a) : a;
        }
        if (cur.length) out.push(cur);
        return out;
    }
    var a2 = jzChars(s.replace(/ /g, '')), n = a2.length, rows = Math.max(1, Math.ceil(n / maxPer)), st = 0;
    for (i = 1; i <= rows; i++) {
        var c = i === rows ? n : Math.round((i * n) / rows);
        if (c < n && c > st && (jzIsPunct(a2[c]) || axc_smallKana(a2[c]) || a2[c] === 'ー')) c++;
        if (c > st) out.push(a2.slice(st, c));
        st = c;
    }
    return out;
}

/* ================================================================== 16 xcPaperCup — 紙コップ */
axc_reg('xcPaperCup', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display', 'serif'])), c: rng.pick(['accent', 'ink']), steam: rng.int(2, 3), ring: rng.chance(0.5) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, port = b.port, txt = b.txt, lw = b.lw, i, k;
        var font = axc_font(ctx), steam = jzP(ctx, 'steam', 2), ring = !!jzP(ctx, 'ring', false);
        var chh = H * (port ? 0.56 : 0.7), tw = Math.min(W * 0.8, chh * (port ? 1.1 : 1.02)), bwd = tw * 0.74, cx = W / 2, y0 = H * (port ? 0.26 : 0.2), y1 = y0 + chh;
        var paper = axc_paper(sc), pin = axc_on(sc, paper), sl = axc_pick(sc, jzP(ctx, 'c', 'accent'));
        if (jzContrast(sl, paper) < 1.5) sl = jzMixHex(paper, pin, 0.85);
        var ink = axc_on(sc, sl), lid = jzMixHex(paper, pin, 0.2);
        var g = axc_kit(ctx, 'paper cup', { cx: cx, cy: y1, a: 'inC(0.2)*K', X: 'var e=inE(0.5);', pose: { dy: '(1-e)*' + jzN(H * 0.07), sy: '0.9+0.1*e' } });
        // steam (a fixed curl that rises and sways; the browser's travelling wave needs a per-frame path)
        for (i = 0; i < steam; i++) {
            var sx = cx + (i - (steam - 1) / 2) * tw * 0.2, pts = [];
            for (k = 0; k <= 12; k++) { var f = k / 12; pts.push([sx + Math.sin(f * 5 + i * 1.7) * tw * 0.025 * (0.3 + f), y0 - chh * 0.1 - f * chh * 0.2]); }
            g.pl(pts, sc.sub, lw * 3, 0.6, { org: [sx, y0 - chh * 0.1], X: 'var se=inE(0.8,' + jzN(0.3 + i * 0.1) + ');', sy: 'se', a: 'se', dx: 'Math.sin(time*2.2+' + jzN(i * 1.7) + ')*' + jzN(tw * 0.012) });
        }
        g.p([[cx - tw / 2, y0], [cx + tw / 2, y0], [cx + bwd / 2, y1], [cx - bwd / 2, y1]], paper);
        var f0 = 0.2, f1 = 0.82, ys0 = y0 + chh * f0, ys1 = y0 + chh * f1, w0 = (tw + (bwd - tw) * f0) * 1.03, w1 = (tw + (bwd - tw) * f1) * 1.03, se2 = 'inE(0.5,0.12)';
        g.p([[cx - w0 / 2, ys0], [cx + w0 / 2, ys0], [cx + w1 / 2, ys1], [cx - w1 / 2, ys1]], sl, 1, { org: [cx - (w0 + w1) / 4, (ys0 + ys1) / 2], sx: se2 });
        if (ring) for (i = 0; i < 2; i++) { var fr = i ? 0.94 : 0.06, yy = ys0 + (ys1 - ys0) * fr, wr = w0 + (w1 - w0) * fr; g.l(cx - wr / 2, yy, cx + wr / 2, yy, ink, lw * 1.5, 0.5, { org: [cx, yy], sx: se2 }); }
        g.rr(cx - tw * 0.54, y0 - chh * 0.055, tw * 1.08, chh * 0.075, chh * 0.025, lid); g.rr(cx - tw * 0.45, y0 - chh * 0.095, tw * 0.9, chh * 0.055, chh * 0.02, lid);
        g.rr(cx + tw * 0.2, y0 - chh * 0.082, tw * 0.1, chh * 0.018, chh * 0.009, pin, 0.6);
        g.done();
        return axc_fitMain(ctx, g, txt, font, cx, (ys0 + ys1) / 2, w1 * 0.84, (ys1 - ys0) * (ring ? 0.72 : 0.8), ink, null, 4, chh * 0.3);
    }
});

/* ================================================================== 17 xcTshirt — Tシャツ */
axc_reg('xcTshirt', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), c: rng.pick(['paper', 'ink', 'accent']), neck: rng.pick(['round', 'v']), stripe: rng.chance(0.5), hang: rng.chance(0.5) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, txt = b.txt, lw = b.lw, q, s;
        var font = axc_font(ctx), hang = !!jzP(ctx, 'hang', false), dm = axc_boxIn(W, H, 1.18, 0.92, 0.8), sw = dm[0], sh = dm[1], cx = W / 2, y0 = (H - sh) / 2 + (hang ? sh * 0.03 : 0);
        var shirt = axc_pick(sc, jzP(ctx, 'c', 'paper')), ink = axc_on(sc, shirt), ac = axc_acc(sc, shirt), rib = jzMixHex(shirt, ink, 0.25);
        var X = function (f) { return cx + f * sw; }, Y = function (f) { return y0 + f * sh; };
        // drops in swinging
        var g = axc_kit(ctx, 't-shirt', { cx: cx, cy: y0 - sh * 0.08, a: 'inC(0.15)*K', X: 'var k=cl(time/0.9);', pose: { rot: 'Math.sin(k*9)*(1-k)*(1-k)*9', dy: '-(1-inE(0.45))*' + jzN(H * 0.2) } });
        if (hang) {
            var hc = jzMixHex(sc.bg, sc.fg, 0.5);
            g.arc(cx, Y(-0.07), sh * 0.025, 180, 450, hc, lw * 3);
            g.ml([[[cx, Y(-0.045)], [cx, Y(-0.01)]], [[X(-0.3), Y(0.09)], [cx, Y(-0.01)], [X(0.3), Y(0.09)]]], hc, lw * 3);
        }
        var neck = [], rb = [];
        if (jzP(ctx, 'neck', 'round') === 'round') for (q = 0; q <= 10; q++) { var a = Math.PI * (1 - q / 10); neck.push([cx + Math.cos(a) * sw * 0.13, Y(0) + Math.sin(a) * sw * 0.085]); }
        else neck = [[X(-0.13), Y(0)], [cx, Y(0.15)], [X(0.13), Y(0)]];
        for (q = 0; q < neck.length; q++) rb.push([neck[q][0], neck[q][1] + sh * 0.014]);
        g.p(neck.concat([[X(0.5), Y(0.2)], [X(0.42), Y(0.4)], [X(0.31), Y(0.31)], [X(0.31), Y(1)], [X(-0.31), Y(1)], [X(-0.31), Y(0.31)], [X(-0.42), Y(0.4)], [X(-0.5), Y(0.2)]]), shirt);
        g.pl(rb, rib, sh * 0.028);
        if (jzP(ctx, 'stripe', false)) for (s = -1; s <= 1; s += 2) g.pl([[X(s * 0.455), Y(0.24)], [X(s * 0.385), Y(0.345)]], ac, sh * 0.03);
        g.r(X(-0.31) + sw * 0.03, Y(0.93), sw * 0.07, sh * 0.03, ac, 1, { a: 'inC(0.3,0.4)' });
        g.done();
        return axc_fitMain(ctx, g, txt, font, cx, Y(0.6), sw * 0.53, sh * 0.5, ink, null, 4, sh * 0.3);
    }
});

/* ================================================================== 18 xcHandheld — 携帯ゲーム機 */
axc_reg('xcHandheld', {
    plan: function (rng, cut, st) { return { font: rng.chance(0.5) ? 'dot' : rng.pick(jzFontsOf(st, ['display', 'body'])), c: rng.pick(['paper', 'accent', 'ink']), lines: rng.chance(0.5) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, port = b.port, txt = b.txt, lw = b.lw, i, s;
        var font = axc_font(ctx), bw = W * (port ? 0.86 : 0.9), bh = H * (port ? 0.8 : 0.76), x0 = (W - bw) / 2, y0 = (H - bh) / 2, m = Math.min(bw, bh);
        var body = axc_pick(sc, jzP(ctx, 'c', 'paper')), on = axc_on(sc, body), dk = jzMixHex(body, on, 0.78), mid = jzMixHex(body, on, 0.3), ac = axc_acc(sc, body);
        var sw = port ? bw * 0.84 : bw * 0.5, shh = port ? bh * 0.44 : bh * 0.72, sx = W / 2 - sw / 2, sy = port ? y0 + bh * 0.07 : H / 2 - shh / 2;
        var g = axc_kit(ctx, 'handheld console', { a: 'inC(0.2)*K', X: 'var e=inE(0.5),hot=(ST>>1)%4,on2=cl((time-0.15)/0.2)*((time<0.5&&ST%2)?0.5:1);', pose: { dy: '(1-e)*' + jzN(H * 0.06), s: '0.95+0.05*e' } });
        g.rr(x0, y0, bw, bh, m * (port ? 0.08 : 0.16), body);
        g.rr(sx - m * 0.03, sy - m * 0.03, sw + m * 0.06, shh + m * 0.06, m * 0.03, dk);
        g.r(sx, sy, sw, shh, sc.bg, 1, { a: 'on2' });
        if (jzP(ctx, 'lines', false)) { var sl = []; for (i = 1; i < 14; i++) sl.push([[sx, sy + shh * i / 14], [sx + sw, sy + shh * i / 14]]); g.ml(sl, sc.fg, lw, 0.06, { a: 'on2' }); }
        // pad and buttons being pressed
        var dx = port ? x0 + bw * 0.25 : x0 + bw * 0.125, dy = port ? y0 + bh * 0.74 : H / 2, al = m * (port ? 0.26 : 0.3), aw = al * 0.34;
        g.rr(dx - al / 2, dy - aw / 2, al, aw, aw * 0.2, dk); g.rr(dx - aw / 2, dy - al / 2, aw, al, aw * 0.2, dk);
        g.c(dx, dy, aw * 0.26, ac, 1, { X: 'var dd=[[1,0],[0,1],[-1,0],[0,-1]][hot];', dx: 'dd[0]*' + jzN(al * 0.33), dy: 'dd[1]*' + jzN(al * 0.33), a: '(time-0.4)/0.1' });
        var br = m * (port ? 0.065 : 0.075), ax = port ? x0 + bw * 0.82 : x0 + bw * 0.915, ay = port ? y0 + bh * 0.7 : H / 2 - br * 0.9, bx = port ? x0 + bw * 0.64 : x0 + bw * 0.815, by = port ? y0 + bh * 0.76 : H / 2 + br * 0.9;
        g.c(ax, ay, br, dk, 1, { s: 'inB(0.3,0.2)' }); g.c(ax, ay, br, ac, 1, { s: 'inB(0.3,0.2)', a: 'hot==1?1:0' });
        g.c(bx, by, br, dk, 1, { s: 'inB(0.3,0.27)' }); g.c(bx, by, br, ac, 1, { s: 'inB(0.3,0.27)', a: 'hot==3?1:0' });
        g.t('A', ax, ay, { color: body, align: 'center', size: br * 0.8, track: 0 }); g.t('B', bx, by, { color: body, align: 'center', size: br * 0.8, track: 0 });
        var py = y0 + bh * 0.9, px = port ? W / 2 : x0 + bw * 0.125;
        for (s = -1; s <= 1; s += 2) g.rr(px + s * m * 0.07 - m * 0.045, py - m * 0.012, m * 0.09, m * 0.024, m * 0.012, mid, 1, { org: [px + s * m * 0.07, py], rotv: -25 });
        var spx = port ? x0 + bw * 0.8 : x0 + bw * 0.865, spy = port ? y0 + bh * 0.9 : y0 + bh * 0.84;
        for (i = 0; i < 4; i++) g.rr(spx - m * 0.05 + i * m * 0.03, spy - m * 0.04, m * 0.012, m * 0.08, m * 0.006, mid, 1, { org: [spx, spy], rotv: -25 });
        g.c(sx - m * 0.012, sy + shh + m * 0.05, m * 0.008, ac, 1, { a: 'ST%6<5?1:0.3' });
        g.done();
        return axc_fitMain(ctx, g, txt, font, W / 2, sy + shh / 2, sw * 0.88, shh * 0.8, sc.fg, null, port ? 4 : 3, shh * 0.46);
    }
});

/* ================================================================== 19 xcBlackboard — 黒板 */
axc_reg('xcBlackboard', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['serif', 'body', 'display'])), ul: rng.pick(['wave', 'double', 'circle']), doodle: rng.pick(['star', 'arrow', 'none']), tilt: rng.pick([0, 0, -1.5]) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, ls = b.ls, seed = b.seed, i, k, pts;
        var font = axc_font(ctx), ul = jzP(ctx, 'ul', 'wave'), doodle = jzP(ctx, 'doodle', 'none');
        var bw = W * 0.86, bh = H * (port ? 0.56 : 0.7), x0 = (W - bw) / 2, y0 = (H - bh) / 2 - H * 0.025;
        var board = axc_pick(sc, 'ink'), ink = axc_on(sc, board), ac = axc_acc(sc, board), ac2 = axc_acc2(sc, board), wood = jzMixHex(sc.bg, sc.fg, 0.5), fr = M * 0.014, A = 'inC(0.2)*K';
        var g = axc_kit(ctx, 'chalkboard', { a: A, rotv: jzP(ctx, 'tilt', 0), pose: { dy: '(1-inE(0.5))*' + jzN(H * 0.05) } });
        g.r(x0, y0, bw, bh, board); g.rs(x0 - fr / 2, y0 - fr / 2, bw + fr, bh + fr, 0, wood, fr);
        g.r(x0 - fr, y0 + bh + fr * 0.9, bw + fr * 2, fr * 1.2, wood);
        var ty = y0 + bh + fr * 0.9, chalk = [[0.1, ink, 0.07], [0.19, ac, 0.05], [0.26, ac2, 0.04]];
        for (i = 0; i < 3; i++) g.rr(x0 + bw * chalk[i][0], ty - fr * 0.7, bw * chalk[i][2], fr * 0.7, fr * 0.2, chalk[i][1], 1, { from: 'l', sx: axc_inE(0.4, 0.2 + i * 0.06) });
        g.r(x0 + bw * 0.8, ty - fr * 1.9, bw * 0.11, fr * 1.9, wood); g.r(x0 + bw * 0.8, ty - fr * 0.8, bw * 0.11, fr * 0.8, jzMixHex(wood, ink, 0.5));
        g.t('No.' + jzPad(b.no, 2), x0 + bw * 0.04, y0 + bh * 0.09, { color: ink, size: ls * 1.2, alpha: 0.7, a: 'inC(0.3,0.25)' });
        g.done();
        var L = axc_fitText(ctx, txt, font, W / 2, y0 + bh * 0.47, bw * 0.8, bh * 0.52, ink, { lead: 1.25, track: 0.03 }, port ? 4 : 3, bh * 0.3);
        var size = jzFontSize(L), nl = axc_textOf(L).split('\r').length, mw = jzSize(L)[0], mh = size * (1 + (nl - 1) * 1.25), ity = y0 + bh * 0.47;
        var bb = axc_lyric(ctx, g, L, 0);
        // chalk underline / circle and a doodle are drawn after the lyric
        var gc = axc_kit(ctx, 'chalk marks', { parent: g, a: '0.9*K' });
        var uy = ity + mh / 2 + size * 0.2, ux = W / 2 - mw / 2, cw2 = Math.max(3, size * 0.045);
        var wav = function (yy, amp, sd) { var p = []; for (var q = 0; q <= 24; q++) p.push([ux + mw * q / 24, yy + (ul === 'wave' ? Math.sin(q * 0.9) * amp : 0) + axc_rs(seed, q, sd) * cw2 * 0.4]); return p; };
        if (ul === 'circle') {
            pts = [];
            for (k = 0; k <= 40; k++) { var a = -1.9 + (k / 40) * Math.PI * 2 * 1.06; pts.push([W / 2 + Math.cos(a) * (mw / 2 + size * 0.45) * (1 + 0.02 * axc_rs(seed, k, 2)), ity + Math.sin(a) * (mh / 2 + size * 0.3)]); }
            gc.pl(pts, ac, cw2, 1, { trim: 'inC(0.5,0.35)' });
        } else {
            gc.pl(wav(uy, size * 0.05, 1), ac, cw2, 1, { trim: 'inC(0.5,0.35)' });
            if (ul === 'double') gc.pl(wav(uy + cw2 * 2.4, 0, 3), ac, cw2 * 0.7, 1, { trim: 'inC(0.5,0.55)' });
        }
        var qx = x0 + bw * 0.9, qy = y0 + bh * 0.87, u = bh * 0.05;
        if (doodle === 'star') { pts = []; for (k = 0; k <= 5; k++) { var a2 = -Math.PI / 2 + k * Math.PI * 4 / 5; pts.push([qx + Math.cos(a2) * u, qy + Math.sin(a2) * u]); } gc.pl(pts, ac2, cw2 * 0.7, 1, { trim: 'inC(0.5,0.5)' }); }
        else if (doodle === 'arrow') gc.pl([[qx - u * 2.4, qy + u * 0.4], [qx - u, qy - u * 0.3], [qx + u * 0.6, qy], [qx + u * 0.1, qy - u * 0.6], [qx + u * 0.6, qy], [qx, qy + u * 0.55]], ac2, cw2 * 0.7, 1, { trim: 'inC(0.5,0.5)' });
        gc.done();
        return bb;
    }
});

/* ================================================================== 20 xcTruck — トラック */
axc_reg('xcTruck', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), dir: rng.pick([1, 1, -1]), band: rng.chance(0.6), c: rng.pick(['paper', 'paper', 'ink']) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, i, s;
        var font = axc_font(ctx), dir = jzP(ctx, 'dir', 1) < 0 ? -1 : 1, band = !!jzP(ctx, 'band', true), mot = axc_mot(ctx);
        var cw = W * (port ? 0.66 : 0.6), chh = port ? W * 0.52 : H * 0.52, cabW = W * (port ? 0.2 : 0.15), cabH = chh * 0.66, r = M * (port ? 0.062 : 0.075), gap = W * 0.012;
        var total = cw + gap + cabW, xl = (W - total) / 2, yt = port ? H / 2 - (chh + r * 1.9) / 2 : H * 0.14, yb = yt + chh, gy = yb + r * 1.9;
        var box = axc_pick(sc, jzP(ctx, 'c', 'paper')), ink = axc_on(sc, box), cab = axc_pick(sc, 'accent'), dk = jzMixHex(sc.bg, sc.fg, 0.55), ac = axc_acc(sc, box), road = jzMixHex(sc.bg, sc.fg, 0.3);
        var XE = 'var k=cl(time/0.8),e=oe(k);';
        var mx = function (x, w) { return dir > 0 ? x : W - x - (w || 0); };
        // the road slides by
        var g0 = axc_kit(ctx, 'road', { a: 'inC(0.3)*K', X: XE });
        g0.l(0, gy, W, gy, road, lw * 2);
        for (i = 0; i < 9; i++) g0.r(-W * 0.05, gy + r * 0.35, W * 0.045, lw * 3, road, 1, { org: [0, gy + r * 0.35], dx: 'fr(' + jzN(i / 9) + '-time*0.35*' + dir + '-(1-e)*2*' + dir + ')*' + jzN(W * 1.1) });
        g0.done();
        // the truck drives in
        var g = axc_kit(ctx, 'truck', { cx: W / 2, cy: gy, a: 'cl(time/0.1)*K', X: XE, pose: { dx: jzN(-dir * W * 1.05) + '*(1-e)', dy: 'Math.sin(time*11)*' + jzN(M * 0.0015 * mot), rot: jzN(-dir * 2.5) + '*(1-k)*(1-k)*Math.sin(k*14)' } });
        for (i = 0; i < 3; i++) g.r(mx(xl - W * (0.05 + 0.02 * i), W * 0.04), yt + chh * (0.25 + i * 0.25), W * 0.04, lw * 2.5, sc.sub, 0.7, { a: '(ST+' + i + ')%3?1:0' });
        g.r(mx(xl + cw * 0.04, total - cw * 0.06), yb, total - cw * 0.06, r * 0.5, dk);
        g.rr(mx(xl, cw), yt, cw, chh, M * 0.012, box);
        if (band) g.r(mx(xl, cw), yb - chh * 0.1, cw, chh * 0.05, ac);
        var cx0 = xl + cw + gap, cy0 = yb - cabH;
        g.rr(mx(cx0, cabW), cy0, cabW, cabH, M * 0.02, cab);
        g.rr(mx(cx0 + cabW * 0.36, cabW * 0.52), cy0 + cabH * 0.12, cabW * 0.52, cabH * 0.38, M * 0.01, sc.bg);
        g.r(mx(cx0 + cabW * 0.9, cabW * 0.14), yb - cabH * 0.12, cabW * 0.14, cabH * 0.1, dk); g.c(mx(cx0 + cabW * 0.93), yb - cabH * 0.26, cabH * 0.045, axc_on(sc, cab));
        var wxs = [xl + cw * 0.2, xl + cw * 0.38, cx0 + cabW * 0.5];
        for (i = 0; i < 3; i++) {
            var x = mx(wxs[i]), y = gy - r, sp = [];
            g.c(x, y, r, dk); g.c(x, y, r * 0.5, sc.bg); g.c(x, y, r * 0.16, dk);
            for (s = 0; s < 3; s++) { var a = s * Math.PI * 2 / 3; sp.push([[x, y], [x + Math.cos(a) * r * 0.48, y + Math.sin(a) * r * 0.48]]); }
            g.ml(sp, dk, lw * 3, 1, { org: [x, y], rot: '(time*3.2+(1-e)*12)*' + jzN(dir * 57.2958) });        // wheels keep turning
        }
        g.done();
        return axc_fitMain(ctx, g, txt, font, mx(xl + cw / 2), yt + chh * (band ? 0.44 : 0.5), cw * 0.86, chh * (band ? 0.66 : 0.76), ink, null, port ? 4 : 3, chh * 0.42);
    }
});

/* ================================================================== 21 xcPlate — ナンバー */
axc_reg('xcPlate', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), style: rng.pick(['eu', 'us', 'two']), c: rng.pick(['paper', 'paper', 'accent', 'ink']), side: rng.pick([-1, 1]) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, port = b.port, txt = b.txt, lw = b.lw, c = b.c, i;
        var font = axc_font(ctx), style = jzP(ctx, 'style', 'eu'), side = jzP(ctx, 'side', 1) < 0 ? -1 : 1;
        var dm = axc_boxIn(W, H, port ? 1.3 : 2.15, 0.88, 0.7), pw = dm[0], ph = dm[1], x0 = (W - pw) / 2, y0 = (H - ph) / 2, r = ph * 0.07;
        var plate = axc_pick(sc, jzP(ctx, 'c', 'paper')), ink = axc_on(sc, plate), ac = axc_acc(sc, plate), bolt = jzMixHex(plate, ink, 0.45);
        var bxs = [x0 + pw * 0.14, x0 + pw * 0.86], byb = y0 + ph * 0.1, pv = side < 0 ? bxs[0] : bxs[1];
        // swings down on one bolt and settles
        var g = axc_kit(ctx, 'number plate', { cx: pv, cy: byb, a: 'cl(time/0.12)*K', X: 'var k=cl(time/0.75);', pose: { rot: '(k>=1?0:Math.cos(k*10)*(1-k)*(1-k)*' + jzN(16 * side) + ')', dy: '-(1-oe(time/0.3))*' + jzN(H * 0.12) } });
        g.rr(x0, y0, pw, ph, r, plate); g.rs(x0 + ph * 0.035, y0 + ph * 0.035, pw - ph * 0.07, ph - ph * 0.07, r * 0.7, ink, Math.max(lw * 2, ph * 0.012));
        var us = style === 'us', eu = style === 'eu';
        if (!eu) for (i = 0; i < 2; i++) { g.c(bxs[i], byb, ph * 0.028, bolt); g.l(bxs[i] - ph * 0.016, byb, bxs[i] + ph * 0.016, byb, plate, lw * 1.5); }
        var bx0 = x0 + pw * 0.06, bx1 = x0 + pw * 0.94, by0 = y0 + ph * 0.1, by1 = y0 + ph * 0.9;
        if (eu) {
            var bwd = pw * (port ? 0.13 : 0.09), on = axc_on(sc, ac), stars = [], scx = x0 + ph * 0.07 + bwd / 2, scy = y0 + ph * 0.32;
            g.rr(x0 + ph * 0.07, y0 + ph * 0.07, bwd, ph * 0.86, r * 0.5, ac);
            for (i = 0; i < 10; i++) { var a = i * Math.PI / 5; stars.push([scx + Math.cos(a) * bwd * 0.26, scy + Math.sin(a) * bwd * 0.26, bwd * 0.035]); }
            g.mc(stars, on, 1, { org: [scx, scy], rot: 'time*0.3*57.2958' });
            g.t('JZ', scx, y0 + ph * 0.74, { color: on, align: 'center', size: bwd * 0.36, track: 0.05 });
            bx0 = x0 + ph * 0.07 + bwd + pw * 0.03;
        } else if (us) {
            g.t(axc_cut(String(c.lineText || txt).toUpperCase(), port ? 10 : 18), W / 2, y0 + ph * 0.13, { color: ac, align: 'center', size: ph * 0.07, font: jzBodyF(ctx), track: 0.2 });
            g.t('· LINE ' + jzPad(b.no, 2) + ' ·', W / 2, y0 + ph * 0.88, { color: ink, align: 'center', size: ph * 0.055, track: 0.3, alpha: 0.8 });
            g.rr(x0 + pw * 0.9 - ph * 0.05, y0 + ph * 0.8, ph * 0.1, ph * 0.1, ph * 0.02, ac, 1, { a: 'inB(0.3,0.5)' });
            by0 = y0 + ph * 0.2; by1 = y0 + ph * 0.8;
        } else {
            g.t(axc_cut(c.lineText || txt, 4) + '  ' + (300 + axc_h(b.seed, 3) % 500), W / 2, y0 + ph * 0.17, { color: ink, align: 'center', size: ph * 0.1, font: jzBodyF(ctx), track: 0.1 });
            g.t(jzPad(b.no, 2), x0 + pw * 0.1, y0 + ph * 0.6, { color: ink, align: 'center', size: ph * 0.11, track: 0 });
            g.c(x0 + pw * 0.9, y0 + ph * 0.6, ph * 0.02, ink);
            bx0 = x0 + pw * 0.16; bx1 = x0 + pw * 0.86; by0 = y0 + ph * 0.28;
        }
        g.done();
        return axc_fitMain(ctx, g, txt, font, (bx0 + bx1) / 2, (by0 + by1) / 2, (bx1 - bx0) * 0.94, (by1 - by0) * 0.86, ink, { lead: 1.12, track: 0.04 }, port ? 3 : 2, ph * 0.6);
    }
});

/* ================================================================== 22 xcDropdown — プルダウン */
axc_reg('xcDropdown', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display'])), rows: rng.int(3, 4), hi: rng.int(0, 3), check: rng.chance(0.5) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, c = b.c, i, j;
        var font = axc_font(ctx), nr = jzClamp(jzP(ctx, 'rows', 3), 1, 6), hi = Math.min(jzP(ctx, 'hi', 0), nr - 1);
        var mw = W * (port ? 0.88 : 0.72), x0 = (W - mw) / 2, u = M * 0.082, sbh = M * 0.095, gap = M * 0.016;
        var hh = Math.min(H * (port ? 0.3 : 0.42), H * 0.84 - sbh - gap - (nr - 1) * u), toth = sbh + gap + (nr - 1) * u + hh, y0 = (H - toth) / 2;
        var win = axc_paper(sc), ink = axc_on(sc, win), faint = jzMixHex(win, ink, 0.22), ac = axc_acc(sc, win), on = axc_on(sc, ac);
        var my = y0 + sbh + gap, mh = toth - sbh - gap, A = 'inC(0.2)*K';
        var X = 'var e=inE(0.32,0.04),sl=oc((time-0.22)/0.25),mb=' + jzN(my) + '+' + jzN(mh) + '*e;';
        var g = axc_kit(ctx, 'dropdown', { a: A, X: X });
        g.rr(x0, y0, mw, sbh, M * 0.014, win); g.rs(x0, y0, mw, sbh, M * 0.014, ac, lw * 3);
        g.t(axc_cut(c.lineText || txt, port ? 12 : 26), x0 + sbh * 0.4, y0 + sbh / 2, { color: ink, font: jzBodyF(ctx), size: sbh * 0.34, track: 0.04, alpha: 0.75 });
        var cx = x0 + mw - sbh * 0.5, cu = sbh * 0.13;
        for (j = 0; j < 2; j++) { var fl = j ? -1 : 1; g.pl([[cx - cu, y0 + sbh / 2 - cu * 0.5 * fl], [cx, y0 + sbh / 2 + cu * 0.5 * fl], [cx + cu, y0 + sbh / 2 - cu * 0.5 * fl]], ink, lw * 3, 1, { a: j ? 'e>0.5?1:0' : 'e>0.5?0:1' }); }
        // the menu drops open
        g.rr(x0 + M * 0.01, my + M * 0.012, mw, mh, M * 0.014, sc.dim, 0.6, { from: 't', sy: 'e' });
        g.rr(x0, my, mw, mh, M * 0.014, win, 1, { from: 't', sy: 'e' });
        var rowY = function (q) { return my + q * u + (q > hi ? hh - u : 0); }, hy = rowY(hi);
        for (i = 0; i < nr; i++) {
            var ry = rowY(i), rh = i === hi ? hh : u, vis = '(' + jzN(ry + rh) + '<=mb+1)?1:0';
            if (i === hi) continue;
            g.r(x0 + mw * 0.08, ry + rh / 2 - u * 0.1, mw * (0.22 + 0.3 * axc_r01(b.seed, i, 4)), u * 0.2, faint, 1, { a: vis });
            if (i < nr - 1 && i + 1 !== hi) g.l(x0 + mw * 0.03, ry + rh, x0 + mw * 0.97, ry + rh, faint, lw, 1, { a: vis });
        }
        // the highlight slides open on the row that holds the lyric
        g.rr(x0 + M * 0.008, hy + M * 0.006, mw - M * 0.016, hh - M * 0.012, M * 0.01, ac, 1, { from: 'l', sx: '0.3+0.7*sl', a: 'sl*((' + jzN(hy + hh * 0.6) + '<mb)?1:0)' });
        if (jzP(ctx, 'check', false)) { var kx = x0 + mw * 0.045, ky = hy + hh / 2, ku = M * 0.014; g.pl([[kx - ku, ky], [kx - ku * 0.2, ky + ku * 0.8], [kx + ku * 1.1, ky - ku * 0.9]], on, lw * 3.5, 1, { a: 'sl>=1?1:0' }); }
        g.done();
        // a pointer comes in and clicks
        var pu = M * 0.07, px = x0 + mw * 0.9, py = hy + hh * 0.7, shp = [[0, 0], [0, 1], [0.27, 0.77], [0.45, 1.17], [0.6, 1.1], [0.42, 0.71], [0.72, 0.71]];
        var arrow = function (s) { var o = []; for (var q = 0; q < shp.length; q++) o.push([px + shp[q][0] * pu * s - (s - 1) * pu * 0.12, py + shp[q][1] * pu * s - (s - 1) * pu * 0.2]); return o; };
        var gp = axc_kit(ctx, 'pointer', { cx: px, cy: py, a: '(time>0.35?1:0)*' + A, X: 'var pe=inE(0.6,0.35);', pose: { dx: '(1-pe)*' + jzN(W * 0.12), dy: '(1-pe)*' + jzN(H * 0.2), s: '(time>0.95&&time<1.07)?0.85:1' } });
        gp.p(arrow(1.28), win); gp.p(arrow(1), ink);
        gp.done();
        var L = axc_fitText(ctx, txt, font, W / 2 - mw * 0.02, hy + hh / 2, mw * 0.74, hh * 0.76, on, null, port ? 4 : 3, hh * 0.5);
        // the lyric starts in the menu's ink and takes the highlight's text colour as the highlight arrives
        jzAnimator(L, 'JZ Menu Ink', [['ADBE Text Fill Color', jzHex(ink)]], jzTH(ctx) + '(1-oc((time-0.22)/0.25))*100');
        return axc_lyric(ctx, null, L, 0);
    }
});

/* ================================================================== 23 xcSelect — 範囲選択 */
axc_reg('xcSelect', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'serif', 'display'])), ui: rng.pick(['mobile', 'mobile', 'desktop']), align: rng.pick(['center', 'center', 'left']) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, i;
        var font = axc_font(ctx), mob = jzP(ctx, 'ui', 'mobile') === 'mobile', left = jzP(ctx, 'align', 'center') === 'left', cy = H * (mob ? 0.55 : 0.45), ac = axc_acc(sc, sc.bg);
        var L = axc_fitText(ctx, txt, font, W / 2, cy, W * 0.8, H * (port ? 0.4 : 0.46), sc.fg, { lead: 1.34, track: 0.03 }, port ? 4 : 3, M * 0.22, { align: left ? 'left' : 'center' });
        var size = jzFontSize(L), lines = axc_textOf(L).split('\r'), Ln = lines.length, ws = [], mwid = 1, pitch = size * 1.34, pdx = size * 0.08, lxs = [], wws = [], lys = [];
        for (i = 0; i < Ln; i++) { ws.push(axc_measW(ctx, lines[i] || ' ', font, 0.03) * size / 100); mwid = Math.max(mwid, ws[i]); }
        var xl = W / 2 - mwid / 2;
        if (left) jzXf(L, 'ADBE Position').setValue([xl, cy]);
        for (i = 0; i < Ln; i++) { lxs.push((left ? xl : W / 2 - ws[i] / 2) - pdx); wws.push(ws[i] + pdx * 2); lys.push(cy + (i - (Ln - 1) / 2) * pitch); }
        var XS = 'var sp=inC(' + jzN(0.3 + 0.18 * Ln) + ',0.2)*' + Ln + ';';
        // the highlight sweeps line by line (behind the lyric)
        var gh = axc_kit(ctx, 'selection', { a: 'K', X: XS });
        for (i = 0; i < Ln; i++) gh.r(lxs[i], lys[i] - pitch / 2, wws[i], pitch, ac, 0.36, { from: 'l', sx: 'cl(sp-' + i + ')' });
        gh.done();
        try { gh.S.moveAfter(L); } catch (e0) {}
        var bb = axc_lyric(ctx, null, L, 0);
        var XH = XS + 'var LX=' + jzArrExpr(lxs) + ',WW=' + jzArrExpr(wws) + ',LY=' + jzArrExpr(lys) + ',ii=Math.min(' + (Ln - 1) + ',Math.floor(sp)),kk=cl(sp-ii),ex=LX[ii]+WW[ii]*kk,ey=LY[ii],ha=cl((time-0.15)/0.1);';
        var g = axc_kit(ctx, mob ? 'selection handles' : 'text cursor', { a: 'K', X: XH }), hr = size * 0.1, hw = Math.max(lw * 2, size * 0.035), mv = { org: [0, 0], dx: 'ex', dy: 'ey', a: 'ha' };
        var latin = jzIsLatinText(txt), d2, labs, exF = lxs[Ln - 1] + wws[Ln - 1];
        if (mob) {
            var sx = lxs[0], sy = lys[0];
            g.r(sx - hw / 2, sy - pitch / 2, hw, pitch + hr, ac, 1, { a: 'ha' }); g.c(sx, sy + pitch / 2 + hr * 1.5, hr, ac, 1, { a: 'ha' });
            g.r(-hw / 2, -pitch / 2, hw, pitch + hr, ac, 1, mv); g.c(0, pitch / 2 + hr * 1.5, hr, ac, 1, mv);
            g.done();
            // copy / share bar pops up
            var bar = axc_paper(sc), bin = axc_on(sc, bar), bw = Math.min(W * 0.8, M * 0.62), bh = M * 0.08, by = lys[0] - pitch / 2 - bh - M * 0.035;
            d2 = 0.5 + 0.12 * Ln;
            var gb = axc_kit(ctx, 'selection bar', { cx: W / 2, cy: by + bh, a: 'cl((time-' + jzN(d2) + ')/0.1)*K', pose: { s: axc_inB(0.35, d2, 1.5) } });
            gb.rr(W / 2 - bw / 2, by, bw, bh, bh * 0.25, bar); gb.p([[W / 2 - bh * 0.22, by + bh - 1], [W / 2 + bh * 0.22, by + bh - 1], [W / 2, by + bh * 1.26]], bar);
            labs = latin ? ['Copy', 'Share', 'Search'] : ['コピー', '共有', '検索'];
            for (i = 0; i < 3; i++) {
                gb.t(labs[i], W / 2 + (i - 1) * bw / 3, by + bh / 2, { color: bin, align: 'center', font: jzBodyF(ctx), size: bh * 0.36, track: 0.04 });
                if (i) gb.l(W / 2 + (i - 1.5) * bw / 3, by + bh * 0.25, W / 2 + (i - 1.5) * bw / 3, by + bh * 0.75, bin, lw, 0.35);
            }
            gb.done();
        } else {
            var blink = { org: [0, 0], dx: 'ex', dy: 'ey', a: 'ha*((ST%4<3||sp<' + Ln + ')?1:0)' };
            g.r(-hw / 2, -pitch * 0.46, hw, pitch * 0.92, sc.fg, 1, blink); g.r(-hw * 2, -pitch * 0.46, hw * 4, hw * 0.8, sc.fg, 1, blink); g.r(-hw * 2, pitch * 0.46 - hw * 0.8, hw * 4, hw * 0.8, sc.fg, 1, blink);
            g.done();
            // context menu, its highlight stepping down the rows
            var menu = axc_paper(sc), min = axc_on(sc, menu), mac = axc_acc(sc, menu), mon = axc_on(sc, mac), mw2 = M * 0.34, rh = M * 0.058, mh = rh * 3 + M * 0.016;
            var mx = Math.min(Math.max(exF + M * 0.02, W * 0.08), W * 0.94 - mw2), my = Math.min(lys[Ln - 1] + pitch / 2 + M * 0.03, H * 0.95 - mh), keys = ['Ctrl+C', 'Ctrl+X', ''];
            d2 = 0.55 + 0.12 * Ln;
            var gm = axc_kit(ctx, 'context menu', { cx: mx, cy: my, a: 'cl((time-' + jzN(d2) + ')/0.1)*K', X: 'var hot=Math.min(2,Math.floor(Math.max(0,time-' + jzN(0.8 + 0.12 * Ln) + ')/0.35));', pose: { s: axc_inB(0.3, d2, 1.4) } });
            gm.r(mx + M * 0.008, my + M * 0.01, mw2, mh, sc.dim, 0.7); gm.r(mx, my, mw2, mh, menu); gm.rs(mx, my, mw2, mh, 0, min, lw * 1.5);
            gm.r(mx + lw * 2, my + M * 0.008, mw2 - lw * 4, rh, mac, 1, { dy: 'hot*' + jzN(rh) });
            labs = latin ? ['Copy', 'Cut', 'Search…'] : ['コピー', '切り取り', '検索…'];
            for (i = 0; i < 3; i++) {
                var ry = my + M * 0.008 + i * rh, j;
                for (j = 0; j < 2; j++) {
                    var col = j ? mon : min, av = j ? 'hot==' + i + '?1:0' : 'hot==' + i + '?0:1';
                    gm.t(labs[i], mx + rh * 0.5, ry + rh / 2, { color: col, font: jzBodyF(ctx), size: rh * 0.44, track: 0.04, a: av });
                    gm.t(keys[i], mx + mw2 - rh * 0.4, ry + rh / 2, { color: col, align: 'right', size: rh * 0.34, alpha: 0.7, a: av });
                }
            }
            gm.done();
        }
        return bb;
    }
});

/* ================================================================== 24 xcRadio — ラジオ */
axc_reg('xcRadio', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'serif', 'display'])), c: rng.pick(['paper', 'accent', 'ink']), f: rng.range(0.2, 0.85), ant: rng.pick([-1, 1]), flip: rng.chance(0.4) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, i, j;
        var font = axc_font(ctx), ant = jzP(ctx, 'ant', 1) < 0 ? -1 : 1, pf = jzP(ctx, 'f', 0.5);
        var bw = W * 0.88, bh = H * (port ? 0.66 : 0.72), x0 = (W - bw) / 2, y0 = (H - bh) / 2 + H * 0.035, m = Math.min(bw, bh);
        var body = axc_pick(sc, jzP(ctx, 'c', 'paper')), on = axc_on(sc, body), dk = jzMixHex(body, on, 0.8), mid = jzMixHex(body, on, 0.3), ac = axc_acc(sc, dk), don = axc_on(sc, dk);
        var fl = !!jzP(ctx, 'flip', false) && !port, spw = bw * 0.27, rx0 = port ? x0 + bw * 0.06 : (fl ? x0 + bw * 0.04 : x0 + bw * 0.3), rw = port ? bw * 0.88 : bw * 0.66;
        var ty = y0 + bh * (port ? 0.06 : 0.09), thh = bh * (port ? 0.09 : 0.15), wy = ty + thh + bh * 0.04, wh = port ? bh * 0.42 : bh * 0.5;
        // the tuner needle slides along the dial, overshoots and settles
        var X = 'var tk=cl((time-0.15)/0.9),nf=0.02+(' + jzN(pf) + '-0.02)*ioc(tk)+(tk<1?Math.sin(tk*30)*0.03*(1-tk):n1(time*1.5,SD)*0.004);';
        var g = axc_kit(ctx, 'radio', { a: 'inC(0.2)*K', X: X, pose: { dy: '(1-inE(0.5))*' + jzN(H * 0.06) } });
        var axp = x0 + bw * (ant > 0 ? 0.88 : 0.12), atx = axp + ant * bw * 0.06, aty = y0 - H * 0.085;
        g.l(axp, y0 + 2, atx, aty, mid, lw * 3, 1, { trim: 'inE(0.6,0.25)' }); g.c(atx, aty, lw * 4, mid, 1, { s: 'inE(0.6,0.55)' });
        g.rr(x0, y0, bw, bh, m * 0.06, body);
        g.rr(rx0, ty, rw, thh, thh * 0.12, dk);
        var maj = [], mnr = [];
        for (i = 0; i <= 32; i++) {
            var x = rx0 + rw * (0.04 + 0.92 * i / 32), mj = i % 4 === 0;
            (mj ? maj : mnr).push([[x, ty + thh * (mj ? 0.42 : 0.56)], [x, ty + thh * 0.8]]);
            if (mj && (!port || i % 8 === 0)) g.t(String(76 + i), x, ty + thh * 0.24, { color: don, align: 'center', size: Math.min(ls * 0.85, thh * 0.24), track: 0, alpha: 0.8 });
        }
        g.ml(maj, don, lw * 1.6, 0.9); g.ml(mnr, don, lw, 0.5);
        g.r(rx0 + rw * 0.04 - lw * 1.5, ty + thh * 0.06, lw * 3, thh * 0.88, ac, 1, { dx: jzN(rw * 0.92) + '*cl(nf)' });
        // window
        g.rr(rx0, wy, rw, wh, m * 0.02, dk); g.r(rx0 + lw * 4, wy + lw * 4, rw - lw * 8, wh - lw * 8, sc.bg, 1, { a: '(time-0.15)/0.2' });
        // speaker + knobs
        var scx = port ? x0 + bw * 0.27 : (fl ? x0 + bw * 0.84 : x0 + bw * 0.16), scy = port ? y0 + bh * 0.8 : y0 + bh * 0.5, sr = port ? Math.min(bh * 0.14, bw * 0.2) : Math.min(spw * 0.42, bh * 0.36), nd = 9, dp = sr * 2 / nd;
        var rings = [[], [], []];
        for (i = 0; i < nd; i++) for (j = 0; j < nd; j++) { var ddx = (i - (nd - 1) / 2) * dp, ddy = (j - (nd - 1) / 2) * dp, d = Math.sqrt(ddx * ddx + ddy * ddy); if (d > sr) continue; rings[Math.min(2, Math.floor(d / sr * 3))].push([scx + ddx, scy + ddy, dp * 0.26]); }
        for (i = 0; i < 3; i++) g.mc(rings[i], dk, 1, { a: 'time>=' + jzN(0.15 + (i + 0.5) / 3 * 0.25) + '?1:0' });
        var ky = port ? y0 + bh * 0.8 : wy + wh + (y0 + bh - wy - wh) / 2, kr = port ? bh * 0.055 : Math.min((y0 + bh - wy - wh) * 0.3, bh * 0.07);
        var knobs = [[port ? x0 + bw * 0.62 : rx0 + rw * 0.72, 'nf*5*57.2958', 'TUNE'], [port ? x0 + bw * 0.84 : rx0 + rw * 0.92, '(0.8+Math.sin(time*0.7)*0.2)*57.2958', 'VOL']];
        for (i = 0; i < 2; i++) {
            var kx = knobs[i][0];
            g.c(kx, ky, kr, dk, 1, { s: axc_inB(0.3, 0.2 + i * 0.08) });
            g.l(kx, ky, kx + kr * 0.85, ky, don, lw * 2.5, 1, { org: [kx, ky], rot: knobs[i][1] });
            g.t(knobs[i][2], kx - kr * 1.4, ky, { color: on, align: 'right', size: Math.min(ls * 0.85, kr * 0.5), alpha: 0.75 });
        }
        if (!port) {
            var sx = rx0 + rw * 0.02, swd = rw * 0.16;
            g.rr(sx, ky - kr * 0.42, swd, kr * 0.84, kr * 0.42, mid); g.rr(sx, ky - kr * 0.42, swd * 0.5, kr * 0.84, kr * 0.42, dk, 1, { dx: '(PO>0?0:' + jzN(swd * 0.5) + ')' });
            g.t('AM  FM', sx + swd + kr * 0.4, ky, { color: on, size: Math.min(ls * 0.85, kr * 0.5), alpha: 0.75 });
        }
        g.done();
        return axc_fitMain(ctx, g, txt, font, rx0 + rw / 2, wy + wh / 2, rw * 0.88, wh * 0.76, sc.fg, null, port ? 4 : 3, wh * 0.5);
    }
});

/* ================================================================== 25 xcFloppy — フロッピー */
axc_reg('xcFloppy', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display'])), c: rng.pick(['ink', 'accent', 'ink']), tilt: rng.pick([0, -3, 3, 0]), from: rng.pick([-1, 1]), ruled: rng.chance(0.6) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, txt = b.txt, lw = b.lw, i;
        var font = axc_font(ctx), from = jzP(ctx, 'from', 1) < 0 ? -1 : 1, s = Math.min(W * 0.86, H * 0.84), x0 = (W - s) / 2, y0 = (H - s) / 2, cc = s * 0.07;
        var body = axc_pick(sc, jzP(ctx, 'c', 'ink')), on = axc_on(sc, body), dk = jzMixHex(body, on, 0.22), metal = jzMixHex(body, on, 0.62), lab = jzMixHex(on, body, 0.06), ink = axc_on(sc, lab), ac = axc_acc(sc, lab), faint = jzMixHex(lab, ink, 0.2);
        // slides in, the metal shutter snaps across
        var g = axc_kit(ctx, 'floppy disk', { a: 'cl(time/0.12)*K', X: 'var e=inE(0.5),sh=ioc((time-0.4)/0.3);', rotv: jzP(ctx, 'tilt', 0), pose: { dx: jzN(from * W * 0.7) + '*(1-e)', rot: jzN(from * 8) + '*(1-e)' } });
        g.p([[x0, y0], [x0 + s - cc, y0], [x0 + s, y0 + cc], [x0 + s, y0 + s], [x0, y0 + s]], body);
        var shx = x0 + s * 0.2, shw = s * 0.5, shh = s * 0.3, sd = 'sh*' + jzN(s * 0.1);
        g.r(x0 + s * 0.18, y0, s * 0.64, shh * 1.02, dk);
        g.r(shx, y0, shw, shh, metal, 1, { dx: sd });
        g.r(shx + shw * 0.62, y0 + shh * 0.14, shw * 0.2, shh * 0.7, body, 1, { dx: sd, a: 'sh<1?1:0' });
        g.r(shx + shw * 0.62, y0 + shh * 0.14, shw * 0.2, shh * 0.7, dk, 1, { dx: sd, a: 'sh<1?0:1' });
        g.r(x0 + s * 0.04, y0 + s * 0.9, s * 0.045, s * 0.055, dk); g.r(x0 + s * 0.915, y0 + s * 0.9, s * 0.045, s * 0.055, sc.bg, 0.9);
        var lx = x0 + s * 0.1, ly0 = y0 + s * 0.4, lw2 = s * 0.8, lh = s * 0.6;
        g.rr(lx, ly0, lw2, lh, s * 0.015, lab); g.r(lx, ly0, lw2, lh * 0.12, ac);
        g.t('DISK ' + jzPad(b.no, 2), lx + lw2 * 0.04, ly0 + lh * 0.06, { color: axc_on(sc, ac), size: lh * 0.05, track: 0.2 });
        g.t('1.44MB', lx + lw2 * 0.96, ly0 + lh * 0.06, { color: axc_on(sc, ac), align: 'right', size: lh * 0.05 });
        if (jzP(ctx, 'ruled', true)) for (i = 1; i <= 4; i++) g.l(lx + lw2 * 0.04, ly0 + lh * (0.12 + i * 0.2), lx + lw2 * 0.96, ly0 + lh * (0.12 + i * 0.2), faint, lw, 1, { trim: axc_inE(0.5, 0.2 + i * 0.05) });
        g.done();
        return axc_fitMain(ctx, g, txt, font, W / 2, ly0 + lh * 0.55, lw2 * 0.88, lh * 0.72, ink, null, 3, lh * 0.42);
    }
});

/* ================================================================== 26 xcMegaphone — 拡声器 */
axc_reg('xcMegaphone', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'display', 'body'])), side: rng.pick([-1, 1]), rot: rng.pick([0, -3, -5]), arcs: rng.int(3, 4), marks: rng.chance(0.6) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, i;
        var font = axc_font(ctx), sd = jzP(ctx, 'side', 1) < 0 ? -1 : 1, arcs = jzP(ctx, 'arcs', 3), DEG = Math.PI / 180;
        var u = M * 0.135, mx = W / 2 - sd * W * (port ? 0.3 : 0.37), my = H * (port ? 0.82 : 0.8), ang = sd > 0 ? -32 : -148, ca = Math.cos(ang * DEG), sa = Math.sin(ang * DEG);
        var cone = axc_paper(sc), ac = axc_acc(sc, sc.bg), dk = jzMixHex(sc.bg, sc.fg, 0.5), A = 'cl(time/0.1)*K';
        // the megaphone pops in and shakes while it shouts
        var g = axc_kit(ctx, 'megaphone', { cx: mx, cy: my, a: A, rotv: sd > 0 ? -32 : 32, sxv: sd, pose: { s: 'inB(0.4,0,1.6)', rot: 'Math.sin(time*26)*' + jzN(2.2 * axc_mot(ctx)) + '*(ST%6<2?1:0.2)' } });
        g.r(mx - u * 0.32, my + u * 0.1, u * 0.2, u * 0.62, dk); g.rr(mx - u * 0.84, my - u * 0.27, u * 0.4, u * 0.54, u * 0.08, ac);
        g.p([[mx - u * 0.5, my - u * 0.22], [mx + u * 0.72, my - u * 0.62], [mx + u * 0.72, my + u * 0.62], [mx - u * 0.5, my + u * 0.22]], cone);
        g.rr(mx + u * 0.68, my - u * 0.72, u * 0.16, u * 1.44, u * 0.06, ac);
        g.done();
        // sound arcs pulse out towards the text
        var ox = mx + ca * u * 0.95, oy = my + sa * u * 0.95, gs = axc_kit(ctx, 'megaphone sound', { a: A });
        for (i = 0; i < arcs; i++) gs.arc(ox, oy, u, ang - 30, ang + 30, ac, u * 0.09, 1, { X: 'var k=fr(time*0.9+' + jzN(i / arcs) + ');', rE: jzN(u) + '*(0.5+k*1.9)', swE: jzN(u * 0.09) + '*(1-k*0.5)', a: 'Math.sin(k*Math.PI)*cl((time-0.2)/0.2)' });
        gs.done();
        var tcx = W / 2 + sd * W * (port ? 0 : 0.045), tcy = H * (port ? 0.4 : 0.37), tw = W * (port ? 0.86 : 0.78), thh = H * (port ? 0.46 : (W < H * 1.5 ? 0.4 : 0.46));
        var L = axc_fitText(ctx, txt, font, tcx, tcy, tw, thh, sc.fg, { lead: 1.16, track: 0.02 }, port ? 4 : 3, M * 0.34, { rot: jzP(ctx, 'rot', 0) * sd });
        var size = jzFontSize(L), nl = axc_textOf(L).split('\r').length, mw = jzSize(L)[0], mh = size * (1 + (nl - 1) * 1.16);
        if (jzP(ctx, 'marks', false)) {
            var gm = axc_kit(ctx, 'shout marks', { a: A }), qx = tcx + sd * (mw / 2 + size * 0.12), qy = tcy - mh / 2 - size * 0.02;
            for (i = 0; i < 3; i++) {
                var a = (-90 + sd * (10 + i * 28)) * DEG, r0 = size * 0.1, r1 = size * 0.32;
                if (Math.abs(qx + Math.cos(a) * r1 - W / 2) < W * 0.48 && qy + Math.sin(a) * r1 > H * 0.03) gm.l(qx + Math.cos(a) * r0, qy + Math.sin(a) * r0, qx + Math.cos(a) * r1, qy + Math.sin(a) * r1, ac, Math.max(lw * 3, size * 0.035), 1, { trim: axc_inE(0.3, 0.3 + i * 0.05) });
            }
            gm.done();
        }
        return axc_lyric(ctx, null, L, 0);
    }
});

/* ================================================================== 27 xcBunting — ガーランド */
axc_reg('xcBunting', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'body'])), shape: rng.pick(['tri', 'tri', 'tail', 'sq']), c: rng.int(0, 2), mono: rng.chance(0.25) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, i, r, k, bb = null, gi = 0;
        var font = axc_font(ctx), shape = jzP(ctx, 'shape', 'tri'), pc = jzP(ctx, 'c', 0), mono = !!jzP(ctx, 'mono', false), mot = axc_mot(ctx);
        var n = jzCount(txt), maxPer = port ? 5 : 8, rows = Math.max(1, Math.ceil(n / maxPer)), tl = axc_toLines(txt, rows), lines = [], over = false, maxC = 1;
        for (i = 0; i < tl.length; i++) { lines.push(jzChars(jzTrim(tl[i]))); if (lines[i].length > maxPer + 1) over = true; }
        if (over) lines = axc_chunkRows(txt, maxPer);
        if (!lines.length) lines = [jzChars(txt)];
        for (i = 0; i < lines.length; i++) maxC = Math.max(maxC, lines[i].length);
        var R2 = lines.length, rowH = (H * 0.84) / R2, pitch = Math.min((W * 0.88) / (maxC + 0.4), rowH * 0.8 / 1.55, M * 0.3), fw = pitch * 0.88, tri = shape === 'tri', fh = pitch * (tri ? 1.25 : 1.12), sag = pitch * 0.3;
        var plates = [axc_paper(sc), axc_pick(sc, 'accent'), axc_pick(sc, 'ink')], strc = jzMixHex(sc.bg, sc.fg, 0.55);
        // sagging strings
        var g0 = axc_kit(ctx, 'bunting strings', { a: 'K' }), rowsG = [];
        for (r = 0; r < R2; r++) {
            var c = lines[r].length, half = (c * pitch) / 2 + pitch * 0.45, yT = H * 0.08 + r * rowH + (rowH - (sag + fh)) / 2, pts = [];
            for (k = 0; k <= 24; k++) { var px = W / 2 - half + (2 * half * k) / 24; pts.push([px, yT + sag * (1 - Math.pow((px - W / 2) / half, 2))]); }
            g0.pl(pts, strc, lw * 2.5, 1, { trim: axc_inE(0.5, r * 0.08) });
            rowsG.push([c, half, yT]);
        }
        g0.done();
        // every glyph on its own pennant, swaying
        for (r = 0; r < R2; r++) for (i = 0; i < lines[r].length; i++) {
            var ch = lines[r][i];
            if (ch === ' ' || ch === '　') continue;
            var cN = rowsG[r][0], hf = rowsG[r][1], y0 = rowsG[r][2], x = W / 2 + (i - (cN - 1) / 2) * pitch;
            var ya = y0 + sag * (1 - Math.pow((x - W / 2) / hf, 2)), ya1 = y0 + sag * (1 - Math.pow((x + 1 - W / 2) / hf, 2)), ya0 = y0 + sag * (1 - Math.pow((x - 1 - W / 2) / hf, 2));
            var d = 0.1 + r * 0.08 + i * 0.035, plate = plates[mono ? pc % 3 : (gi + pc) % 3], ink = axc_on(sc, plate), slope = Math.atan2(ya1 - ya0, 2) * 180 / Math.PI;
            var g = axc_kit(ctx, 'pennant ' + (gi + 1), { cx: x, cy: ya, a: 'cl((time-' + jzN(d) + ')/0.08)*K',
                pose: { rot: jzN(slope * 0.6) + '+Math.sin(time*1.7+' + jzN(i * 0.8 + r) + ')*' + jzN(3.5 * mot), sy: 'Math.max(0.02,' + axc_inB(0.4, d, 1.6) + ')' } });
            if (tri) g.p([[x - fw / 2, ya], [x + fw / 2, ya], [x, ya + fh]], plate);
            else if (shape === 'tail') g.p([[x - fw / 2, ya], [x + fw / 2, ya], [x + fw / 2, ya + fh], [x, ya + fh * 0.8], [x - fw / 2, ya + fh]], plate);
            else g.r(x - fw / 2, ya, fw, fh * 0.92, plate);
            g.done();
            var T = jzText(ctx, ch, { font: font, size: Math.max(4, fw * (tri ? 0.5 : 0.66)), color: ink, x: x, y: ya + fh * (tri ? 0.31 : 0.42) });
            bb = jzUnion(bb, axc_lyric(ctx, g, T, gi));
            gi++;
        }
        return bb;
    }
});

/* ================================================================== 28 xcDrawers — 引き出し */
axc_reg('xcDrawers', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'serif', 'display'])), c: rng.pick(['ink', 'accent', 'paper']), handle: rng.pick(['bar', 'cup']), pull: rng.int(0, 2) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, i, bb = null;
        var font = axc_font(ctx), n = jzCount(txt), L = port ? (n <= 3 ? 1 : (n <= 8 ? 2 : (n <= 12 ? 3 : 4))) : (n <= 6 ? 1 : (n <= 11 ? 2 : 3));
        var lines = axc_toLines(txt, L), k = lines.length, T = Math.max(3, k), first = Math.floor((T - k) / 2), ws = [];
        var cw = W * (port ? 0.86 : 0.72), ch = H * 0.86, x0 = (W - cw) / 2, y0 = (H - ch) / 2, pd = M * 0.022, dh = (ch - pd * (T + 1)) / T, dwd = cw - pd * 2;
        var body = axc_pick(sc, jzP(ctx, 'c', 'ink')), on = axc_on(sc, body), front = jzMixHex(body, on, 0.1), metal = jzMixHex(body, on, 0.55), lab = jzMixHex(on, body, 0.05), ink = axc_on(sc, lab), faint = jzMixHex(lab, ink, 0.25);
        var size = dh * 0.5, pull = jzP(ctx, 'pull', 0), bar = jzP(ctx, 'handle', 'bar') === 'bar';
        for (i = 0; i < k; i++) { ws.push(axc_measW(ctx, lines[i], font, 0.03)); size = Math.min(size, dwd * 0.78 / ws[i] * 100); }
        size = Math.max(4, size);
        var g0 = axc_kit(ctx, 'cabinet', { a: 'inC(0.2)*K' });
        g0.rr(x0, y0, cw, ch, M * 0.015, body);
        g0.done();
        // drawers slide shut one by one
        for (i = 0; i < T; i++) {
            var li = i - first, has = li >= 0 && li < k, d = 0.08 + i * 0.09, dy0 = y0 + pd + i * (dh + pd), cx = W / 2, cy = dy0 + dh / 2, pulled = has && (li === pull % k), E = axc_inE(0.45, d);
            var g = axc_kit(ctx, 'drawer ' + (i + 1), { cx: cx, cy: cy, a: 'cl((time-' + jzN(d) + ')/0.1)*K', pose: { s: '1+(1-' + E + ')*0.12+' + (pulled ? '0.025' : '0') } });
            g.r(x0 + pd + M * 0.006, dy0 + M * 0.01, dwd, dh, sc.dim, 0.7, pulled ? null : { a: E + '<1?1:0' });
            g.r(x0 + pd, dy0, dwd, dh, front); g.rs(x0 + pd, dy0, dwd, dh, 0, on, lw, 0.35);
            var tw = has ? ws[li] * size / 100 : dwd * 0.2, hw = Math.max(tw + size * 1.1, dwd * 0.24), hh = Math.max(size * 1.5, dh * 0.3), hy = dy0 + dh * 0.42 - hh / 2;
            g.r(cx - hw / 2, hy, hw, hh, lab); g.rs(cx - hw / 2, hy, hw, hh, 0, metal, Math.max(lw * 2, dh * 0.02));
            var ky = dy0 + dh * 0.86, kw = Math.min(dwd * 0.16, dh * 0.9);
            if (bar) g.rr(cx - kw / 2, ky - dh * 0.03, kw, dh * 0.06, dh * 0.03, metal); else g.arc(cx, ky - dh * 0.05, kw * 0.3, 10, 170, metal, dh * 0.05);
            if (!has) { g.r(cx - hw * 0.3, hy + hh / 2 - hh * 0.08, hw * 0.6, hh * 0.16, faint); g.done(); continue; }
            g.done();
            var Tx = jzText(ctx, lines[li], { font: font, size: size, color: ink, x: cx, y: hy + hh / 2, track: 0.03 });
            bb = jzUnion(bb, axc_lyric(ctx, g, Tx, li));
        }
        return bb;
    }
});

/* ================================================================== 29 xcPoll — アンケート */
axc_reg('xcPoll', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['body', 'display'])), n: rng.int(2, 3), card: rng.chance(0.65), p: [rng.range(0.2, 1), rng.range(0.2, 1), rng.range(0.2, 1)], votes: rng.int(120, 9800) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, i;
        var font = axc_font(ctx), card = !!jzP(ctx, 'card', true), no = jzClamp(jzP(ctx, 'n', 2), 1, 3), pp = jzP(ctx, 'p', [0.6, 0.4, 0.3]), ps = [], tot = 0, win2 = 0;
        var cw = W * 0.86, ch = H * (port ? 0.76 : 0.84), x0 = (W - cw) / 2, y0 = (H - ch) / 2;
        var win = card ? axc_paper(sc) : sc.bg, ink = card ? axc_on(sc, win) : sc.fg, faint = jzMixHex(win, ink, 0.14), ac = axc_acc(sc, win), mid = jzMixHex(win, ink, 0.4);
        for (i = 0; i < no; i++) { ps.push(pp[i] == null ? 0.5 : pp[i]); tot += ps[i]; if (ps[i] > ps[win2]) win2 = i; }
        var g = axc_kit(ctx, 'poll card', { a: 'inC(0.2)*K' });
        if (card) g.rr(x0, y0, cw, ch, M * 0.035, win, 1, { dy: '(1-inE(0.45))*' + jzN(M * 0.04) });
        // option bars fill, their percentages count up, the winner lights
        var oy0 = y0 + ch * (port ? 0.48 : 0.5), oh = (ch * (port ? 0.4 : 0.38)) / no, bx = x0 + cw * 0.07, bw = cw * 0.86, bh = Math.min(oh * 0.7, M * 0.11);
        for (i = 0; i < no; i++) {
            var by = oy0 + i * oh, d = 0.3 + i * 0.1, pct = ps[i] / Math.max(0.001, tot), isW = i === win2, fc = isW ? ac : mid, be = axc_inE(0.4, 0.15 + i * 0.07);
            var X = 'var fe=oc((time-' + jzN(d) + ')/0.7);', lbw = bw * (0.12 + 0.1 * axc_r01(b.seed, i, 3));
            g.rr(bx, by, bw, bh, bh * 0.22, faint, 1, { from: 'l', sx: be });
            g.rr(bx, by, bw * pct, bh, bh * 0.22, fc, 1, { from: 'l', X: X, sx: 'Math.max(' + jzN(Math.min(1, bh * 0.44 / (bw * pct))) + ',fe)', a: '(time-' + jzN(d) + ')/0.1' });
            g.r(bx + bh * 0.4, by + bh / 2 - bh * 0.09, lbw, bh * 0.18, ink, 0.85, { from: 'l', X: X, sx: be, a: jzN(pct) + '*fe>0.3?0:1' });
            g.r(bx + bh * 0.4, by + bh / 2 - bh * 0.09, lbw, bh * 0.18, axc_on(sc, fc), 0.85, { from: 'l', X: X, sx: be, a: jzN(pct) + '*fe>0.3?1:0' });
            g.t(Math.round(pct * 100) + '%', bx + bw - bh * 0.35, by + bh / 2, { color: ink, align: 'right', size: bh * 0.36, track: 0.02, X: X, a: '(time-' + jzN(d) + ')/0.15', src: 'Math.round(' + jzN(pct * 100) + '*fe)+"%"' });
            if (isW && pct > 0.34) { var kx = bx + bw * pct - bh * 0.5, ku = bh * 0.15; g.pl([[kx - ku, by + bh / 2], [kx - ku * 0.2, by + bh / 2 + ku * 0.8], [kx + ku * 1.1, by + bh / 2 - ku * 0.9]], axc_on(sc, fc), lw * 3, 1, { X: X, a: 'fe>=1?1:0' }); }
        }
        var votes = jzP(ctx, 'votes', 1200);
        g.t(votes + ' VOTES', bx, y0 + ch * 0.94, { color: ink, size: ls, alpha: 0.7, a: 'inC(0.3,0.3)', src: 'var v=String(Math.round(' + jzN(votes) + '*oc((time-0.3)/0.9)));(v.length>3?v.substr(0,v.length-3)+","+v.substr(v.length-3):v)+" VOTES"' });
        g.t((1 + axc_h(b.seed, 2) % 23) + 'H LEFT', bx + bw, y0 + ch * 0.94, { color: ink, align: 'right', size: ls, alpha: 0.7, a: 'inC(0.3,0.3)' });
        g.t('Q.', bx, y0 + ch * 0.075, { color: ac, size: ls * 1.5, track: 0, a: 'inC(0.3,0.2)' });
        g.done();
        return axc_fitMain(ctx, null, txt, font, W / 2, y0 + ch * (port ? 0.27 : 0.28), bw, ch * (port ? 0.3 : 0.32), ink, null, port ? 4 : 2, ch * 0.2);
    }
});

/* ================================================================== 30 xcAwning — 店先テント */
axc_reg('xcAwning', {
    plan: function (rng, cut, st) { return { font: rng.pick(jzFontsOf(st, ['display', 'serif', 'body'])), ns: rng.pick([7, 9, 11]), sign: rng.pick(['OPEN', 'OPEN', 'CLOSED']), glass: rng.chance(0.6), c: rng.int(0, 1) }; },
    build: function (ctx) {
        var b = axc_base(ctx), W = b.W, H = b.H, sc = b.sc, M = b.M, port = b.port, txt = b.txt, lw = b.lw, ls = b.ls, i;
        var font = axc_font(ctx), sw = W * (port ? 0.9 : 0.84), x0 = (W - sw) / 2, y0 = H * (port ? 0.12 : 0.08), ah = H * (port ? 0.1 : 0.17), ns = port ? Math.min(7, jzP(ctx, 'ns', 9)) : jzP(ctx, 'ns', 9);
        var ca = axc_pick(sc, 'accent'), cb = axc_paper(sc), alt = jzContrast(ca, cb) < 1.4 ? jzMixHex(cb, axc_on(sc, cb), 0.8) : cb, cols = jzP(ctx, 'c', 0) ? [ca, alt] : [alt, ca];
        var wood = jzMixHex(sc.bg, sc.fg, 0.5);
        var g = axc_kit(ctx, 'shop front', { a: 'inC(0.2)*K', X: 'var ae=inE(0.6,0.05),we=inE(0.5);' });
        // window
        var wx = x0 + sw * 0.04, ww = sw * 0.92, wy = y0 + ah * 0.55, wb = H * (port ? 0.88 : 0.92), wh = wb - wy, fr = M * 0.012;
        g.rs(wx, wy, ww, wh, 0, wood, fr, 1, { from: 't', sy: 'we' }); g.r(wx - fr * 1.5, wy + wh, ww + fr * 3, fr * 1.6, wood, 1, { dy: '-(1-we)*' + jzN(wh) });
        if (jzP(ctx, 'glass', true)) for (i = 0; i < 2; i++) { var gx = wx + ww * (0.06 + i * 0.035), gy = wy + ah * 0.75 + wh * 0.05; g.l(gx + wh * 0.1, gy, gx, gy + wh * 0.1, sc.sub, lw * 2, 0.5, { a: 'inC(0.4,0.4)' }); }
        var fy = wy + wh * 0.9, la = 'inC(0.3,0.45)';
        g.l(wx + ww * 0.04, wy + wh * 0.82, wx + ww * 0.96, wy + wh * 0.82, sc.sub, lw, 0.6, { trim: 'inE(0.5,0.3)' });
        var tg = axc_acc(sc, sc.bg), tw2 = Math.min(ww * 0.2, M * 0.2), th2 = wh * 0.085, sign = jzP(ctx, 'sign', 'OPEN');
        g.rr(wx + ww * 0.04, fy - th2 / 2, tw2, th2, th2 * 0.2, tg, 1, { a: la });
        g.t(sign, wx + ww * 0.04 + tw2 / 2, fy, { color: axc_on(sc, tg), align: 'center', size: Math.min(th2 * 0.5, tw2 * 0.16), track: 0.2, a: la });
        g.t((10 + axc_h(b.seed, 2) % 3) + ':00 - ' + (19 + axc_h(b.seed, 3) % 4) + ':00', wx + ww * 0.96, fy, { color: sc.sub, align: 'right', size: ls, a: la });
        // the striped awning rolls out
        var tw = sw * 0.9, st = sw / ns;
        for (i = 0; i < ns; i++) {
            var col = cols[i % 2], xt0 = x0 + (sw - tw) / 2 + (tw / ns) * i, xt1 = xt0 + tw / ns, xb0 = x0 + st * i, xb1 = xb0 + st;
            g.p([[xt0, y0], [xt1 + 0.5, y0], [xb1 + 0.5, y0 + ah], [xb0, y0 + ah]], col, 1, { org: [xt0, y0], sy: 'ae' });
            g.c((xb0 + xb1) / 2, y0 + ah - 0.5, st / 2, col, 1, { dy: '-(1-ae)*' + jzN(ah), s: 'Math.min(1,ae*1.5)' });
        }
        g.r(x0 + (sw - tw) / 2 - fr, y0 - fr * 1.2, tw + fr * 2, fr * 1.4, wood);
        g.done();
        var ty0 = y0 + ah + st / 2 + wh * 0.02, ty1 = wy + wh * 0.8;
        return axc_fitMain(ctx, null, txt, font, W / 2, (ty0 + ty1) / 2, ww * 0.86, (ty1 - ty0) * 0.86, sc.fg, null, port ? 4 : 3, wh * 0.36);
    }
});
