// ================================================================ 追加分2 backgrounds part 2 (AE port of src/11p_x2_bg.js, pack x2bg: xpPlexus … xpLoadBars)
// Same conventions as p_x2_bg1.jsx, which also holds the shared helpers (axp_h / axp_r / axp_hd / axp_fill / axp_rep / AXP_BEAD …):
// colours keep the browser's alpha as fill / stroke opacity, the first group of a layer is drawn on top, and every shape / group
// is finished before its next sibling is added.

/* ================================================================ DOT / PARTICLE FIELDS (continued) */

/* ---- xpPlexus — 点と線の網: 20–26 nodes drifting on small loops; nodes closer than a limit are joined by a line that gets stronger as they approach.
   AE: the node positions are one (unpainted) path computed by an expression; the lines of each of the browser's three strength
   steps are ONE filled path (a thin quad per link, strung together along bridges that are walked there and back, so the bridges
   enclose no area), and so are the node dots (AXP_BEAD) — five expressions for the whole network */
jzReg('bg', 'xpPlexus', {
    plan: function (rng, st) { return { seed: axp_seed(rng), n: rng.int(20, 26), k: rng.range(0.2, 0.25) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), n = Math.min(28, P.n || 24), D = Math.max(W, H) * 0.24, k = P.k || 0.13, i, bk, A = [], base = [];
        for (i = 0; i < n; i++) {
            var bx = W * (axp_r(s, i, 1) * 1.1 - 0.05), by = H * (axp_r(s, i, 2) * 1.1 - 0.05);
            base.push([bx, by]);
            A.push('[' + jzN(bx) + ',' + jzN(by) + ',' + jzN(0.15 + 0.2 * axp_r(s, i, 3)) + ',' + jzN(axp_r(s, i, 4) * AXP_TAU) + ',' + jzN(0.13 + 0.2 * axp_r(s, i, 5)) + ',' + jzN(axp_r(s, i, 6) * AXP_TAU) + ']');
        }
        var S = jzShapeLayer(b, 'bg xpPlexus', 0, 0), hd = axp_hd(b), get = 'var P=thisLayer.content("nodes").content(1).path.points();';
        var g = jzGrp(S, 'dots'), p = jzAddPath(g, [[0, 0], [1, 0], [1, 1]], true);
        jzSetExpr(p.property('ADBE Vector Shape'), get + 'var Q=[],n;for(n=0;n<P.length;n++)Q.push([P[n][0],P[n][1],' + jzN(U * 0.005) + ']);' + AXP_BEAD);
        axp_fill(g, sc.fg, k * 1.5);
        for (bk = 2; bk >= 0; bk--) {
            g = jzGrp(S, 'links ' + (bk + 1)); p = jzAddPath(g, [[0, 0], [1, 0], [1, 1]], true);
            jzSetExpr(p.property('ADBE Vector Shape'), get + 'var D=' + jzN(D) + ',h=' + jzN(axp_lw(b, 0.0018) / 2) + ',V=[],F=[],i,j,a,c,d,nx,ny,f;' +
                'for(i=0;i<P.length;i++)for(j=i+1;j<P.length;j++){a=P[i];c=P[j];d=length(a,c);if(d>=D||d<0.01)continue;if(Math.min(2,Math.floor((1-d/D)*3))!=' + bk + ')continue;' +
                'nx=-(c[1]-a[1])/d*h;ny=(c[0]-a[0])/d*h;f=[a[0]+nx,a[1]+ny];V.push(f,[c[0]+nx,c[1]+ny],[c[0]-nx,c[1]-ny],[a[0]-nx,a[1]-ny],f);F.push(f);}' +
                'for(i=F.length-2;i>=0;i--)V.push(F[i]);if(V.length<3)V=[[0,0],[0,0],[0,0]];createPath(V,[],[],true)');
            axp_fill(g, sc.fg, k * (bk + 1) / 3);
        }
        g = jzGrp(S, 'nodes');       // no fill / stroke: only read by the expressions above
        p = jzAddPath(g, base, false);
        jzSetExpr(p.property('ADBE Vector Shape'), hd + 'var A=[' + A.join(',') + '],R=' + jzN(U * 0.07) + ',o=[],i,a;for(i=0;i<A.length;i++){a=A[i];o.push([a[0]+R*Math.sin(T*a[2]+a[3]),a[1]+R*Math.cos(T*a[4]+a[5])]);}createPath(o,[],[],false)');
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpPhyllo — 螺旋の点: 380 dots in a sunflower (golden angle) spiral turning slowly; a pulse of dot size runs outwards; the spiral grows from the centre.
   AE: dots are tiny round-capped strokes sorted into 24 rings; the size pulse is the stroke width of a ring (one expression per ring) */
jzReg('bg', 'xpPhyllo', {
    plan: function (rng, st) { return { seed: axp_seed(rng), cx: rng.pick([0.5, 0.5, 0.2, 0.8]), cy: rng.pick([0.5, 0.5, 0.7]), spd: rng.range(1.2, 2.4) * rng.pick([1, -1]), k: rng.range(0.13, 0.16) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), N = 380, NB = 24, GA = 137.508 * Math.PI / 180, c = Math.sqrt(W * W + H * H) * 0.72 / Math.sqrt(N), i, bi, B = [];
        var S = jzShapeLayer(b, 'bg xpPhyllo', W * (P.cx || 0.5), H * (P.cy || 0.5)), hd = axp_hd(b) + 'var e=oc(BT/0.9);', eps = 0.1 * axp_px(b), qMax = Math.sqrt(N - 1);
        for (bi = 0; bi < NB; bi++) B.push({ pts: [], i0: N, i1: 0, q: 0 });
        for (i = 1; i < N; i++) {
            var q = Math.sqrt(i), o = B[Math.min(NB - 1, Math.floor((q - 1) / (qMax - 1) * NB))];
            o.pts.push([Math.cos(i * GA) * c * q, Math.sin(i * GA) * c * q]); o.q += q; o.i0 = Math.min(o.i0, i); o.i1 = Math.max(o.i1, i);
        }
        for (bi = 0; bi < NB; bi++) {
            var R = B[bi]; if (!R.pts.length) continue;
            var g = jzGrp(S, 'ring ' + (bi + 1));
            for (i = 0; i < R.pts.length; i++) jzAddPath(g, [[R.pts[i][0] - eps / 2, R.pts[i][1]], [R.pts[i][0] + eps / 2, R.pts[i][1]]], false);
            var st = axp_round(axp_stroke(g, sc.fg, U * 0.0095 * 1.5, P.k || 0.14));
            jzSetExpr(st.property('ADBE Vector Stroke Width'), hd + jzN(U * 0.019) + '*(0.75+0.45*Math.sin(T*0.8-' + jzN(R.q / R.pts.length * 0.6) + '))*cl((e*' + N + '-' + R.i0 + ')/' + (R.i1 - R.i0 + 1) + ')');
        }
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), hd + 'T*' + jzN(P.spd || 1.6));
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpBlinkCells — 明滅タイル: a tile grid in which scattered cells light up softly and go out again, in three steps of brightness.
   AE: the cells are dealt at random into 32 sets that blink together (browser: every cell has its own noise) */
jzReg('bg', 'xpBlinkCells', {
    plan: function (rng, st) { return { seed: axp_seed(rng), cell: rng.range(0.085, 0.11), k: rng.range(0.08, 0.1) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), cell = U * (P.cell || 0.095), gap = cell * 0.06, k = P.k || 0.09, K = 32, i, j, c, z, C = [];
        var nx = Math.min(28, Math.ceil(W / cell)), ny = Math.min(28, Math.ceil(H / cell)), ox = (W - nx * cell) / 2, oy = (H - ny * cell) / 2;
        for (c = 0; c < K; c++) C.push([]);
        for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) C[Math.min(K - 1, Math.floor(axp_r(s, i, j, 9) * K))].push([ox + (i + 0.5) * cell, oy + (j + 0.5) * cell]);
        var S = jzShapeLayer(b, 'bg xpBlinkCells', 0, 0), hd = axp_hd(b);
        for (c = 0; c < K; c++) {
            if (!C[c].length) continue;
            var g = jzGrp(S, 'cells ' + (c + 1));
            for (z = 0; z < C[c].length; z++) jzAddRect(g, cell - gap * 2, cell - gap * 2, 0, C[c][z][0], C[c][z][1]);
            axp_fill(g, sc.fg, k);
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), hd + 'var v=n1(T*0.45+' + jzN(axp_r(s, c, 77) * 60) + ',' + ((s + c * 31) % 997) + ')-0.3;v>0?100*(Math.min(2,Math.floor(v*6))+1)/3:0');
        }
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpDriftMarks — 漂う記号: small outline marks (circle, plus, triangle, square) floating slowly in all directions and turning */
jzReg('bg', 'xpDriftMarks', {
    plan: function (rng, st) { return { seed: axp_seed(rng), n: rng.int(14, 20), k: rng.range(0.16, 0.2) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), n = Math.min(24, P.n || 16), M = U * 0.1, i;
        var S = jzShapeLayer(b, 'bg xpDriftMarks', 0, 0), hd = axp_hd(b), G = jzGrp(S, 'marks');
        for (i = 0; i < n; i++) {
            var r = U * (0.018 + 0.03 * axp_r(s, i, 1)), ty = axp_h(s, i, 8) % 4, q = axp_sub(G, 'mark ' + (i + 1));
            if (ty === 0) jzAddEllipse(q, r * 2, r * 2);
            else if (ty === 1) { jzAddPath(q, [[-r, 0], [r, 0]], false); jzAddPath(q, [[0, -r], [0, r]], false); }
            else axp_poly(q, r * 1.15, ty === 2 ? 3 : 4, 0);
            jzSetExpr(jzGX(q).property('ADBE Vector Position'), hd + '[wr(' + jzN(axp_r(s, i, 2) * (W + M * 2)) + '+T*' + jzN(U * 0.02 * axp_rs(s, i, 3)) + ',' + jzN(W + M * 2) + ')-' + jzN(M) +
                ',wr(' + jzN(axp_r(s, i, 4) * (H + M * 2)) + '+T*' + jzN(U * 0.014 * axp_rs(s, i, 5)) + ',' + jzN(H + M * 2) + ')-' + jzN(M) + ']');
            if (ty !== 0) jzSetExpr(jzGX(q).property('ADBE Vector Rotation'), hd + '(T*' + jzN(0.3 * axp_rs(s, i, 6)) + '+' + jzN(axp_r(s, i, 7) * AXP_TAU) + ')*180/Math.PI');
        }
        axp_round(axp_stroke(G, sc.fg, axp_lw(b, 0.003), P.k || 0.13));
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpRingDots — 巡る点の輪: concentric rings of dots (every fourth one bigger), neighbouring rings circling in opposite directions, outer rings slower */
jzReg('bg', 'xpRingDots', {
    plan: function (rng, st) { return { seed: axp_seed(rng), spd: rng.range(5, 9) * rng.pick([1, -1]), cy: rng.pick([0.5, 0.5, 0.6]), k: rng.range(0.14, 0.17) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), rings = Math.min(9, Math.ceil(Math.sqrt(W * W + H * H) / 2 / (U * 0.135))), k = P.k || 0.15, r, m;
        var S = jzShapeLayer(b, 'bg xpRingDots', W / 2, H * (P.cy || 0.5)), hd = axp_hd(b) + 'var e=oc(BT/0.9);';
        for (r = 0; r < rings; r++) {
            var R = U * (0.16 + 0.135 * r), N = 8 + r * 8, da = AXP_TAU / N, g = jzGrp(S, 'ring ' + (r + 1));
            var q = axp_sub(g, 'small');
            for (m = 1; m < 4; m++) jzAddEllipse(q, U * 0.011, U * 0.011, Math.cos(m * da) * R, Math.sin(m * da) * R);
            axp_fill(q, sc.fg, k); axp_rep(q, N / 4, 0, 0, { rot: 1440 / N });
            q = axp_sub(g, 'big');
            jzAddEllipse(q, U * 0.02, U * 0.02, R, 0);
            axp_fill(q, sc.fg, k); axp_rep(q, N / 4, 0, 0, { rot: 1440 / N });
            jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hd + 'T*' + jzN((P.spd || 6) / (1 + r * 0.6) * (r % 2 ? -1 : 1)));
        }
        jzSetExpr(jzXf(S, 'ADBE Scale'), hd + 'var q=80+20*e;[q,q]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ================================================================ BIG SOFT SHAPES */

/* ---- xpTwinDiscs — 重なる円: two very large discs (foreground tone and accent) overlapping in the middle, drifting slowly towards and away from each other */
jzReg('bg', 'xpTwinDiscs', {
    plan: function (rng, st) { return { seed: axp_seed(rng), k: rng.range(0.04, 0.055), ph: rng.range(0, 6) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), k = P.k || 0.045, R = U * 0.56, v = H > W;
        var hd = axp_hd(b) + 'var W=' + jzN(W) + ',H=' + jzN(H) + ',a=0.2+0.07*Math.sin(T*0.21+' + jzN(P.ph || 0) + '),c=0.09*Math.cos(T*0.17+' + jzN(P.ph || 0) + '),e=oc(BT/0.9),q=80+20*e;';
        var S = jzShapeLayer(b, 'bg xpTwinDiscs', 0, 0);
        var g = jzGrp(S, 'accent disc'); jzAddEllipse(g, R * 1.8, R * 1.8); axp_fill(g, sc.accent, k * 1.3);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + (v ? '[W*(0.5+c),H*(0.5+a)]' : '[W*(0.5+a),H*(0.5+c)]'));
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), hd + '[q,q]');
        g = jzGrp(S, 'disc'); jzAddEllipse(g, R * 2, R * 2); axp_fill(g, sc.fg, k);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + (v ? '[W*(0.5-c),H*(0.5-a)]' : '[W*(0.5-a),H*(0.5-c)]'));
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), hd + '[q,q]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpLeanVignette — 傾く周辺の影: a dark vignette whose clear centre circles slowly round the frame, with a faint light at that centre.
   AE: black solid with an inverted feathered circle mask + a light solid with a feathered circle mask, both following the moving centre */
jzReg('bg', 'xpLeanVignette', {
    plan: function (rng, st) { return { seed: axp_seed(rng), spd: rng.range(0.18, 0.3) * rng.pick([1, -1]), k: rng.range(0.8, 1.1) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), dk = jzLum(sc.bg) < 0.45, R = Math.sqrt(W * W + H * H) * 0.86, k = (P.k || 1) * (dk ? 0.5 : 0.16);
        var hd = axp_hd(b) + 'var e=oc(BT/0.9),a=T*' + jzN(P.spd || 0.22) + '+' + ((P.seed || 1) % 6) + ';', pos = hd + '[' + jzN(W) + '*(0.5+0.24*Math.cos(a)),' + jzN(H) + '*(0.5+0.24*Math.sin(a))]';
        var sw = Math.round(W * 1.52), sh = Math.round(H * 1.52), V = axp_solid(b, '#000000', 'bg xpLeanVignette shade', sw, sh);
        axp_cmask(V, sw / 2, sh / 2, (U * 0.3 + R) / 2, { f: [R - U * 0.3, R - U * 0.3], inv: true });      // clear at 0.3 U from the centre, full at R
        jzSetExpr(jzXf(V, 'ADBE Position'), pos);
        jzSetExpr(jzXf(V, 'ADBE Opacity'), hd + jzN(jzClamp(k, 0, 1) * 100) + '*e');
        var ls = Math.round(U * 1.3), Lt = axp_solid(b, axp_light(sc), 'bg xpLeanVignette light', ls, ls);
        axp_cmask(Lt, ls / 2, ls / 2, U * 0.3, { f: [U * 0.6, U * 0.6] });                                    // full at the centre, gone at 0.6 U
        jzSetExpr(jzXf(Lt, 'ADBE Position'), pos);
        jzSetExpr(jzXf(Lt, 'ADBE Opacity'), hd + '7*e');
    }
});

/* ---- xpCapsules — 滑るカプセル: slanted rows of long capsules sliding along their row, filled and outlined rows alternating (the middle row in the accent) */
jzReg('bg', 'xpCapsules', {
    plan: function (rng, st) { return { seed: axp_seed(rng), ang: rng.pick([-32, -20, 20, 32]), spd: rng.range(0.02, 0.035), k: rng.range(0.04, 0.055) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), k = P.k || 0.045, D = Math.sqrt(W * W + H * H), hh = U * 0.17, gapY = U * 0.27, Lp = U * 1.7, j;
        var nl = Math.min(6, Math.ceil(D / 2 / gapY)), nc = Math.min(5, Math.ceil((D + Lp) / Lp));
        var S = jzShapeLayer(b, 'bg xpCapsules', W / 2, H / 2), hd = axp_hd(b);
        jzXf(S, 'ADBE Rotate Z').setValue(P.ang || 20);
        for (j = nl; j >= -nl; j--) {
            var odd = (j % 2) !== 0, len = U * (0.55 + 0.75 * axp_r(s, j + 9)), g = jzGrp(S, 'row ' + (j + nl + 1));
            jzAddRect(g, len, hh, hh / 2, len / 2, 0);
            if (odd) axp_stroke(g, sc.fg, axp_lw(b, 0.003), k * 2); else axp_fill(g, j === 0 ? sc.accent : sc.fg, k * (j === 0 ? 1.3 : 1));
            axp_rep(g, nc, Lp, 0);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[wr(T*' + jzN(U * (P.spd || 0.025) * (odd ? 1 : -1) * (0.5 + 1.5 * axp_r(s, j + 9, 2))) + '+' + jzN(axp_r(s, j + 9, 3) * Lp) + ',' + jzN(Lp) + ')-' + jzN(D / 2 + Lp) + ',' + jzN(j * gapY) + ']');
        }
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpSlitLight — ブラインドの光: light falling through a blind — a slanted set of soft bright slats wandering slowly over the frame, the slats breathing.
   AE: the slats are sheared parallelograms; the browser's left-to-right gradient is a feathered layer mask */
jzReg('bg', 'xpSlitLight', {
    plan: function (rng, st) { return { seed: axp_seed(rng), sk: rng.pick([-0.5, -0.35, 0.35, 0.5]), n: rng.int(5, 7), k: rng.range(0.07, 0.095) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), ph = (P.seed || 1) % 7, n = P.n || 6, sk = P.sk || -0.4, i;
        var sh = U * 0.062, gp = U * 0.04, wd = U * 0.95, tot = n * sh + (n - 1) * gp, hd = axp_hd(b);
        var S = jzShapeLayer(b, 'bg xpSlitLight', W / 2, H / 2);
        for (i = 0; i < n; i++) {
            var yc = -tot / 2 + i * (sh + gp) + sh / 2, d = sk * sh / 2, g = jzGrp(S, 'slat ' + (i + 1));
            jzAddPath(g, [[-wd / 2 - d, -sh / 2], [wd / 2 - d, -sh / 2], [wd / 2 + d, sh / 2], [-wd / 2 + d, sh / 2]], true);
            axp_fill(g, axp_light(sc), P.k || 0.08);
            jzGX(g).property('ADBE Vector Position').setValue([sk * yc, yc]);
            jzSetExpr(jzGX(g).property('ADBE Vector Scale'), hd + '[100,100*(0.75+0.25*Math.sin(T*0.3+' + jzN(i * 0.5) + '))]');
        }
        // gradient along the slats: 0 at the left end, full from 22 %, falling off towards the right end
        var xa = -wd / 2 + wd * 0.11, xb = -wd / 2 + wd * 0.85, ya = -tot / 2 - U * 0.05, yb = tot / 2 + U * 0.05;
        axp_mask(S, [[xb + sk * ya, ya], [xb + sk * yb, yb], [xa + sk * yb, yb], [xa + sk * ya, ya]], { f: [wd * 0.24, 0] });
        jzSetExpr(jzXf(S, 'ADBE Position'), hd + '[' + jzN(W) + '*(0.5+0.2*Math.sin(T*0.14+' + ph + ')),' + jzN(H) + '*(0.5+0.1*Math.sin(T*0.11+' + (ph * 2) + '))]');
        axp_fade(b, S, 1);
    }
});

/* ---- xpPosterGrad — 階段グラデ: a gradient in 5–7 flat steps (each step one very faint layer on top of the last), the whole thing swaying, the step edges breathing */
jzReg('bg', 'xpPosterGrad', {
    plan: function (rng, st) { return { seed: axp_seed(rng), ang: rng.pick([0, 30, 60, 90, 120, 150, 180, 210, 270, 330]), acc: rng.chance(0.5), n: rng.int(5, 7), k: rng.range(0.018, 0.025) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, L = Math.sqrt(W * W + H * H), n = P.n || 6, ph = (P.seed || 1) % 5, i;
        var S = jzShapeLayer(b, 'bg xpPosterGrad', W / 2, H / 2), hd = axp_hd(b);
        for (i = 1; i <= n; i++) {
            var g = jzGrp(S, 'step ' + i);
            jzAddRect(g, L, L, 0, L / 2, 0); axp_fill(g, P.acc ? sc.accent : sc.fg, P.k || 0.02);
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[' + jzN(L) + '*(' + jzN(i / (n + 1) - 0.5) + '+0.035*Math.sin(T*0.3+' + jzN(i * 1.1 + ph) + ')),0]');
        }
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), hd + jzN(P.ang || 0) + '+9*Math.sin(T*0.13+' + ph + ')');
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpBigRing — 大きな輪: one very thick ring drifting slowly, its width breathing; a fine dashed circle around it with a small accent dot travelling on it */
jzReg('bg', 'xpBigRing', {
    plan: function (rng, st) { return { seed: axp_seed(rng), cx: rng.pick([0.3, 0.7, 0.5]), cy: rng.pick([0.4, 0.6, 0.5]), k: rng.range(0.05, 0.065) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), ph = (P.seed || 1) % 7, k = P.k || 0.055, R = U * 0.6, R2 = R * 1.32;
        var S = jzShapeLayer(b, 'bg xpBigRing', W * (P.cx || 0.5), H * (P.cy || 0.5)), hd = axp_hd(b) + 'var e=oc(BT/1);';
        var g = jzGrp(S, 'dot'); jzAddEllipse(g, U * 0.024, U * 0.024, R2, 0); axp_fill(g, sc.accent, 0.4);
        jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hd + '(T*0.22+' + ph + ')*180/Math.PI');
        g = jzGrp(S, 'dashed circle'); jzAddEllipse(g, R2 * 2, R2 * 2);
        var st = axp_stroke(g, sc.fg, axp_lw(b, 0.002), k * 2);
        axp_dash(st, U * 0.012, U * 0.018, hd + '-T*' + jzN(U * 0.01));
        g = jzGrp(S, 'ring'); jzAddEllipse(g, R * 2, R * 2);
        st = axp_stroke(g, sc.fg, U * 0.11, k);
        jzSetExpr(st.property('ADBE Vector Stroke Width'), hd + jzN(U) + '*(0.11+0.035*Math.sin(T*0.4))');
        jzSetExpr(jzXf(S, 'ADBE Position'), hd + '[' + jzN(W) + '*(' + jzN(P.cx || 0.5) + '+0.05*Math.sin(T*0.16+' + ph + ')),' + jzN(H) + '*(' + jzN(P.cy || 0.5) + '+0.05*Math.cos(T*0.13+' + ph + '))]');
        jzSetExpr(jzXf(S, 'ADBE Scale'), hd + 'var q=80+20*e;[q,q]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpCurtain — カーテンのひだ: soft vertical folds of light and shade swaying sideways like a curtain, fading out towards the top.
   AE: one bar per fold, softened by a horizontal Gaussian blur (browser: a multi-stop gradient); the top is covered by a feathered
   solid in the background colour */
jzReg('bg', 'xpCurtain', {
    plan: function (rng, st) { return { seed: axp_seed(rng), n: rng.int(7, 11), k: rng.range(0.07, 0.09) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, n = P.n || 9, ph = (P.seed || 1) % 9, k = P.k || 0.08, hw = W / (2 * n), i;
        var S = jzShapeLayer(b, 'bg xpCurtain', 0, 0), hd = axp_hd(b);
        for (i = 0; i <= n; i++) {
            var g = jzGrp(S, 'fold ' + (i + 1));
            jzAddRect(g, hw, H * 1.2, 0, 0, H / 2); axp_fill(g, sc.fg, k * (0.6 + 0.4 * Math.sin(i * 2.1 + ph)));
            jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[' + jzN(W) + '*cl((' + i + '+0.3*Math.sin(T*0.45+' + jzN(i * 1.3 + ph) + '))/' + n + '),0]');
        }
        var bl = jzEffect(S, 'ADBE Gaussian Blur 2', 'JZ Soft Folds'); jzEP(bl, 1, hw * 0.5); jzEP(bl, 2, 2); jzEP(bl, 3, 0);
        axp_fade(b, S, 0.6);
        var Tp = axp_solid(b, sc.bg, 'bg xpCurtain top', W, H);
        axp_rmask(Tp, -W, -H, W * 2, H * 0.175, { f: [0, H * 0.35] });      // 60 % at the top edge -> 0 at 35 % of the height
        jzXf(Tp, 'ADBE Opacity').setValue(60);
    }
});

/* ================================================================ RULES & TYPE-LIKE TEXTURE */

/* ---- xpRuler — 定規の目盛り: a ruler along the top or bottom edge and one along a side, their tick marks (5s and 10s longer) sliding by; an accent pointer wanders along the horizontal one */
jzReg('bg', 'xpRuler', {
    plan: function (rng, st) { return { seed: axp_seed(rng), top: rng.chance(0.4), right: rng.chance(0.5), k: rng.range(0.24, 0.3) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), sp = U * 0.016, per = sp * 10, k = P.k || 0.16, lw = axp_lw(b, 0.0018), i;
        var y0 = H * (P.top ? 0.085 : 0.915), dy = P.top ? 1 : -1, x0 = W * (P.right ? 0.945 : 0.055), dx = P.right ? -1 : 1, ps = U * 0.014;
        var hd = axp_hd(b) + 'var e=oc(BT/0.6),off=wr(T*' + jzN(U * 0.02) + ',' + jzN(per) + ');';
        var S = jzShapeLayer(b, 'bg xpRuler', 0, 0);
        var g = jzGrp(S, 'pointer');
        jzAddPath(g, [[0, -dy * ps * 0.3], [-ps, -dy * ps * 1.9], [ps, -dy * ps * 1.9]], true); axp_fill(g, sc.accent, 0.5);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[' + jzN(W) + '*(0.5+0.3*Math.sin(T*0.3)),' + jzN(y0) + ']');
        g = jzGrp(S, 'base lines');
        jzAddPath(g, [[0, y0], [W, y0]], false); jzAddPath(g, [[x0, 0], [x0, H]], false); axp_stroke(g, sc.fg, lw, k);
        g = jzGrp(S, 'ticks x');      // one period of ten ticks, repeated along the edge
        for (i = 0; i < 10; i++) jzAddPath(g, [[i * sp, 0], [i * sp, dy * U * (i === 0 ? 0.042 : (i === 5 ? 0.028 : 0.015))]], false);
        axp_stroke(g, sc.fg, lw, k); axp_rep(g, Math.ceil((W + per) / per) + 1, per, 0);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[off-' + jzN(per) + ',' + jzN(y0) + ']');
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), hd + '[100,100*e]');
        g = jzGrp(S, 'ticks y');
        for (i = 0; i < 10; i++) jzAddPath(g, [[0, i * sp], [dx * U * (i === 0 ? 0.042 : (i === 5 ? 0.028 : 0.015)), i * sp]], false);
        axp_stroke(g, sc.fg, lw, k); axp_rep(g, Math.ceil((H + per) / per) + 1, 0, per);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[' + jzN(x0) + ',-off]');
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), hd + '[100*e,100]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpGreekText — ダミー組版: two or three columns of grey bars standing for lines of body text (paragraph gaps, short last lines, indents), scrolling up very slowly.
   AE: the rows this cut can show are baked from the browser's own random numbers; one group slides them */
jzReg('bg', 'xpGreekText', {
    plan: function (rng, st) { return { seed: axp_seed(rng), spd: rng.range(0.01, 0.018), k: rng.range(0.055, 0.07) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), lh = U * 0.037, bh = U * 0.012, cols = W > H ? 3 : 2, gut = W * 0.04, cw = (W * 0.86 - gut * (cols - 1)) / cols;
        var v = U * (P.spd || 0.013), T0 = b.cut.start || 0, T1 = T0 + b.comp.duration, rows = Math.min(70, Math.ceil(H / lh) + 1), c, r;
        var rA = Math.floor(T0 * v / lh), rB = Math.floor(T1 * v / lh) + rows;
        var S = jzShapeLayer(b, 'bg xpGreekText', 0, 0), g = jzGrp(S, 'lines');
        for (c = 0; c < cols; c++) for (r = rA; r < rB; r++) {
            var id = r + c * 11, m = axp_wrap(id, 7); if (m === 6) continue;
            var len = m === 5 ? 0.25 + 0.5 * axp_r(s, id, c) : 0.86 + 0.14 * axp_r(s, id, c), ind = m === 0 ? cw * 0.06 : 0, w = cw * len - ind;
            jzAddRect(g, w, bh, 0, W * 0.07 + c * (cw + gut) + ind + w / 2, (r - rA) * lh + bh / 2);
        }
        axp_fill(g, sc.fg, P.k || 0.06);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), axp_hd(b) + '[0,' + jzN(rA * lh) + '-T*' + jzN(v) + ']');
        axp_fade(b, S, 0.6);
    }
});

// one segment (i: 0..6 = a b c d e f g) of a seven-segment digit in the box x, y, w, h — the browser's segPath
function axp_seg(x, y, w, h, i) {
    var th = w * 0.17, g = th * 0.14, hl = w - th, vl = h / 2 - th / 2, q = th / 2, L = x + q, R = x + w - q, T = y + q, M = y + h / 2, B = y + h - q;
    function hz(sx, sy) { return [[sx + g, sy], [sx + q + g, sy - q], [sx + hl - q - g, sy - q], [sx + hl - g, sy], [sx + hl - q - g, sy + q], [sx + q + g, sy + q]]; }
    function vt(sx, sy) { return [[sx, sy + g], [sx + q, sy + q + g], [sx + q, sy + vl - q - g], [sx, sy + vl - g], [sx - q, sy + vl - q - g], [sx - q, sy + q + g]]; }
    return i === 0 ? hz(L, T) : (i === 1 ? vt(R, T) : (i === 2 ? vt(R, M) : (i === 3 ? hz(L, B) : (i === 4 ? vt(L, M) : (i === 5 ? vt(L, T) : hz(L, M))))));
}
/* ---- xpSevenSeg — 巨大7セグ: a giant, slightly slanted seven-segment counter (2–3 digits) counting up; unlit segments stay faintly visible, changing ones cross-fade */
jzReg('bg', 'xpSevenSeg', {
    plan: function (rng, st) { return { seed: axp_seed(rng), rate: rng.range(0.6, 1.1), k: rng.range(0.07, 0.09) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, nd = W > H * 1.2 ? 3 : 2, k = P.k || 0.08, gap = 0.24, d, i, z;
        var dw = Math.min(W * 0.84 / (nd + (nd - 1) * gap), H * 0.66 / 1.85), dh = dw * 1.85, x0 = (W - dw * (nd + (nd - 1) * gap)) / 2, y0 = (H - dh) / 2;
        var S = jzShapeLayer(b, 'bg xpSevenSeg', 0, 0);
        var hd = axp_hd(b) + 'var tt=T*' + jzN(P.rate || 0.8) + ',n0=Math.floor(tt),m=sm(0,0.22,tt-n0),cur=' + (s % 500) + '+n0,SG=[63,6,91,79,102,109,125,7,127,111];';
        for (d = 0; d < nd; d++) for (i = 0; i < 7; i++) {
            var pts = axp_seg(x0 + d * dw * (1 + gap), y0, dw, dh, i), g = jzGrp(S, 'digit ' + (d + 1) + ' segment ' + 'abcdefg'.charAt(i));
            for (z = 0; z < pts.length; z++) pts[z][0] -= 0.07 * (pts[z][1] - H / 2);      // the browser's slant about the frame centre
            jzAddPath(g, pts, true); axp_fill(g, sc.fg, k);
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), hd + 'function on(n){return (SG[Math.floor(n/' + Math.pow(10, nd - 1 - d) + ')%10]>>' + i + ')&1;}' +
                'var a=on(cur),c=on(cur-1),v=(a&&c)?1:((!a&&!c)?0:(a?m:1-m));100*(0.22+0.78*v)');
        }
        axp_fade(b, S, 0.6);
    }
});

/* ---- xpCropMarks — 見当マーク: a loose lattice of printers' register marks (circle + cross, the crosses turning slowly, alternately left and right) drifting diagonally; crop marks in the four corners */
jzReg('bg', 'xpCropMarks', {
    plan: function (rng, st) { return { seed: axp_seed(rng), sp: rng.range(0.32, 0.4), k: rng.range(0.19, 0.23) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), sp = U * (P.sp || 0.36), r = U * 0.02, arm = U * 0.038, k = P.k || 0.14, lw = axp_lw(b, 0.002), pi, pj, z;
        var nxT = Math.min(12, Math.ceil((W + 1.5 * sp) / sp)), nyT = Math.min(12, Math.ceil((H + 1.5 * sp) / sp)), hd = axp_hd(b);
        var S = jzShapeLayer(b, 'bg xpCropMarks', 0, 0);
        var g = jzGrp(S, 'crop marks'), m = U * 0.05, l = U * 0.05, CS = [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]];
        for (z = 0; z < 4; z++) {
            jzAddPath(g, [[CS[z][0], CS[z][1] - CS[z][3] * l * 0.2], [CS[z][0], CS[z][1] + CS[z][3] * l]], false);
            jzAddPath(g, [[CS[z][0] - CS[z][2] * l * 0.2, CS[z][1]], [CS[z][0] + CS[z][2] * l, CS[z][1]]], false);
        }
        axp_stroke(g, sc.fg, lw, k);
        var G = jzGrp(S, 'register marks');
        // the lattice as four interleaved sets (even / odd columns x rows): one mark each, repeated two cells apart
        for (pj = 0; pj < 2; pj++) for (pi = 0; pi < 2; pi++) {
            var q = axp_sub(G, 'set ' + (pi + 1) + '-' + (pj + 1)), c = axp_sub(q, 'cross');
            jzAddPath(c, [[-arm, 0], [arm, 0]], false); jzAddPath(c, [[0, -arm], [0, arm]], false);
            jzSetExpr(jzGX(c).property('ADBE Vector Rotation'), hd + 'T*' + jzN(0.25 * ((pi + pj) % 2 ? 1 : -1) * 180 / Math.PI));
            jzAddEllipse(q, r * 2, r * 2);
            axp_stroke(q, sc.fg, lw, k);
            axp_rep(q, Math.ceil((nxT - pi) / 2), sp * 2, 0);
            axp_rep(q, Math.ceil((nyT - pj) / 2), 0, sp * 2);
            jzGX(q).property('ADBE Vector Position').setValue([pi * sp, pj * sp]);
        }
        jzSetExpr(jzGX(G).property('ADBE Vector Position'), hd + '[wr(T*' + jzN(U * 0.012) + ',' + jzN(sp) + ')-' + jzN(sp / 2) + ',wr(T*' + jzN(U * 0.007) + ',' + jzN(sp) + ')-' + jzN(sp / 2) + ']');
        axp_fade(b, S, 0.6);
    }
});

/* ================================================================ SCREEN-LIKE FIELDS */

/* ---- xpScanner — スキャナーの光: a soft bar of light sweeping to and fro across the frame (down and up on a tall frame), with a bright core line; the part already scanned is tinted a little */
jzReg('bg', 'xpScanner', {
    plan: function (rng, st) { return { seed: axp_seed(rng), spd: rng.range(0.35, 0.55), k: rng.range(0.1, 0.13) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), hz = H > W, L = hz ? H : W, X = hz ? W : H, lc = axp_light(sc), k = P.k || 0.11, bw = U * 0.11, lw = axp_lw(b, 0.0015);
        var hd = axp_hd(b) + 'var e=oc(BT/0.6),x=' + jzN(L) + '*(0.5-0.56*Math.cos(T*' + jzN(P.spd || 0.45) + '+' + ((P.seed || 1) % 6) + '));';
        // glow: 0 at ±bw, full on the beam
        var Gl = hz ? axp_solid(b, lc, 'bg xpScanner glow', X, bw * 2) : axp_solid(b, lc, 'bg xpScanner glow', bw * 2, X);
        if (hz) axp_rmask(Gl, -X, bw / 2, X * 2, bw * 1.5, { f: [0, bw] }); else axp_rmask(Gl, bw / 2, -X, bw * 1.5, X * 2, { f: [bw, 0] });
        jzSetExpr(jzXf(Gl, 'ADBE Position'), hd + (hz ? '[' + jzN(X / 2) + ',x]' : '[x,' + jzN(X / 2) + ']'));
        jzSetExpr(jzXf(Gl, 'ADBE Opacity'), hd + jzN(k * 100) + '*e');
        var S = jzShapeLayer(b, 'bg xpScanner beam', 0, 0);
        var g = jzGrp(S, 'core');
        if (hz) jzAddRect(g, X, lw, 0, X / 2, 0); else jzAddRect(g, lw, X, 0, 0, X / 2);
        axp_fill(g, lc, k * 2.2);
        g = jzGrp(S, 'scanned');
        if (hz) jzAddRect(g, X, L * 1.2, 0, X / 2, -L * 0.6); else jzAddRect(g, L * 1.2, X, 0, -L * 0.6, X / 2);
        axp_fill(g, sc.fg, 0.035);
        jzSetExpr(jzXf(S, 'ADBE Position'), hd + (hz ? '[0,x]' : '[x,0]'));
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpStepBlocks — 階段ブロック: a staircase of columns along the bottom and an upside-down one (accent) along the top, each shifting sideways one column at a time */
jzReg('bg', 'xpStepBlocks', {
    plan: function (rng, st) { return { seed: axp_seed(rng), per: rng.int(5, 8), spd: rng.range(0.45, 0.7), k: rng.range(0.04, 0.055) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, U = jzU(b), cell = U * 0.11, per = P.per || 6, k = P.k || 0.045, n = Math.min(40, Math.ceil(W / cell) + per + 1), nr = Math.ceil(n / per), ov = 0.5 * axp_px(b), i, h;
        var hd = axp_hd(b) + 'var e=oc(BT/0.8),fr=T*' + jzN(P.spd || 0.55) + ',fl=Math.floor(fr),sh=wr((fl+ioc((fr-fl)*2.2))*' + jzN(cell) + ',' + jzN(cell * per) + ');';
        var S = jzShapeLayer(b, 'bg xpStepBlocks', 0, 0);
        var g = jzGrp(S, 'top stairs');
        for (i = 0; i < per; i++) { h = cell * 0.6 * (per - i); jzAddRect(g, cell + ov, h, 0, i * cell + (cell + ov) / 2, h / 2); }
        axp_fill(g, sc.accent, k * 1.1); axp_rep(g, nr, cell * per, 0);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[-sh,0]');
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), hd + '[100,100*e]');
        g = jzGrp(S, 'bottom stairs');
        for (i = 0; i < per; i++) { h = cell * 0.6 * (1 + i); jzAddRect(g, cell + ov, h, 0, i * cell + (cell + ov) / 2, -h / 2); }
        axp_fill(g, sc.fg, k); axp_rep(g, nr, cell * per, 0);
        jzSetExpr(jzGX(g).property('ADBE Vector Position'), hd + '[sh-' + jzN(cell * per) + ',' + jzN(H) + ']');
        jzSetExpr(jzGX(g).property('ADBE Vector Scale'), hd + '[100,100*e]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpRadar — レーダー: range rings and cross hairs with a sweep (a fan of 18 fading slices) going round; six accent blips light up as the sweep passes and die away */
jzReg('bg', 'xpRadar', {
    plan: function (rng, st) { return { seed: axp_seed(rng), cx: rng.pick([0.5, 0.5, 0.25, 0.75]), cy: rng.pick([0.5, 0.56]), spd: rng.range(0.45, 0.7) * rng.pick([1, -1]), k: rng.range(0.09, 0.11) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), cx = W * (P.cx || 0.5), cy = H * (P.cy || 0.5), R = Math.sqrt(W * W + H * H), k = P.k || 0.08, i, q;
        var sp = P.spd || 0.55, dir = sp < 0 ? -1 : 1, NS = 18, da = 4.5 * Math.PI / 180;
        var hd = axp_hd(b) + 'var e=oc(BT/0.8),ang=T*' + jzN(sp) + ';';
        var S = jzShapeLayer(b, 'bg xpRadar', cx, cy);
        var g = jzGrp(S, 'blips');
        for (i = 5; i >= 0; i--) {
            var a = axp_r(s, i, 1) * AXP_TAU, r = U * (0.15 + 0.6 * axp_r(s, i, 2));
            q = axp_sub(g, 'blip ' + (i + 1));
            jzAddEllipse(q, U * 0.018, U * 0.018, Math.cos(a) * r, Math.sin(a) * r); axp_fill(q, sc.accent, 0.5);
            jzSetExpr(jzGX(q).property('ADBE Vector Group Opacity'), hd + '100*Math.pow(1-wr(' + dir + '*(ang-' + jzN(a) + '),Math.PI*2)/(Math.PI*2),3)');
        }
        g = jzGrp(S, 'scope');
        q = axp_sub(g, 'rings');
        for (i = 1; i <= 5; i++) jzAddEllipse(q, U * 0.4 * i, U * 0.4 * i);
        jzSetExpr(jzGX(q).property('ADBE Vector Scale'), hd + 'var q=80+20*e;[q,q]');
        jzAddPath(g, [[-cx, 0], [W - cx, 0]], false); jzAddPath(g, [[0, -cy], [0, H - cy]], false);
        axp_stroke(g, sc.fg, axp_lw(b, 0.0018), k * 1.3);
        g = jzGrp(S, 'sweep');
        for (i = NS - 1; i >= 0; i--) {
            var a0 = -dir * i * da, a1 = -dir * (i + 1.04) * da;
            q = axp_sub(g, 'slice ' + (i + 1));
            jzAddPath(q, [[0, 0], [Math.cos(a0) * R, Math.sin(a0) * R], [Math.cos(a1) * R, Math.sin(a1) * R]], true);
            axp_fill(q, sc.fg, k * Math.pow(1 - i / NS, 1.6));
        }
        jzSetExpr(jzGX(g).property('ADBE Vector Rotation'), hd + 'ang*180/Math.PI');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), hd + '100*e');
    }
});

/* ---- xpLoadBars — 進む横棒: 6–8 thin outlined progress bars left and right, each filling up at its own pace, fading out when full and starting again (one in the accent) */
jzReg('bg', 'xpLoadBars', {
    plan: function (rng, st) { return { seed: axp_seed(rng), n: rng.int(6, 8), k: rng.range(0.07, 0.09) }; },
    build: function (b, P) {
        var W = b.W, H = b.H, sc = b.sc, s = P.seed || 1, U = jzU(b), n = P.n || 7, k = P.k || 0.08, bh = U * 0.02, hi = s % n, i;
        var S = jzShapeLayer(b, 'bg xpLoadBars', 0, 0);
        for (i = n - 1; i >= 0; i--) {
            var w = W * (0.3 + 0.55 * axp_r(s, i, 1)), x = axp_r(s, i, 2) < 0.5 ? W * 0.06 : W * 0.94 - w, y = H * (i + 0.5 + 0.25 * axp_rs(s, i, 3)) / n - bh / 2;
            var hd = axp_hd(b) + 'var p=wr(T*' + jzN(0.05 + 0.07 * axp_r(s, i, 4)) + '+' + jzN(axp_r(s, i, 5)) + ',1);';
            var g = jzGrp(S, 'bar ' + (i + 1)), q = axp_sub(g, 'tag');
            jzAddRect(q, w * 0.12, bh * 0.3, 0, w * 0.06, bh * 1.95); axp_fill(q, sc.fg, k * 1.5);
            q = axp_sub(g, 'progress');
            jzAddRect(q, w, bh, 0, w / 2, bh / 2); axp_fill(q, i === hi ? sc.accent : sc.fg, i === hi ? k * 2.4 : k);
            jzSetExpr(jzGX(q).property('ADBE Vector Scale'), hd + '[100*ioc(p/0.82),100]');
            q = axp_sub(g, 'frame');
            jzAddRect(q, w, bh, 0, w / 2, bh / 2); axp_stroke(q, sc.fg, axp_lw(b, 0.0018), k * 1.5);
            jzGX(g).property('ADBE Vector Position').setValue([x, y]);
            jzSetExpr(jzGX(g).property('ADBE Vector Group Opacity'), hd + '100*oc(BT/0.6)*sm(0,0.04,p)*(1-sm(0.9,1,p))');
        }
    }
});
