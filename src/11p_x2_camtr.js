/* JIZURA pack: x2camtr — 追加分2: camera moves that settle (20) + cut-to-cut transitions (17) */
(() => {
'use strict';
const E = J.E;
const P = 'x2camtr';
const reg = (g, k, d) => J.register(g, k, d, P);
const DEG = J.DEG, TAU = J.TAU, clamp = J.clamp, lerp = J.lerp;
const wrap = (x, m) => ((x % m) + m) % m;
const ioc = E.inOutCubic;

/* ================================================================ CAMERA */
const KM = env => clamp((env.fx.motion ?? 0.7) * 1.25, 0, 1.25);
const K1 = env => Math.min(1, KM(env));
const cuOf = env => clamp(env.lt / Math.max(0.3, env.cut.dur));
const lagOf = env => Math.max(0, (env.ltb ?? env.lt) - env.lt);
const seedOf = env => (env.cut.seed | 0);
// phase 0..1 over TWO beats for this (time-lagged) pass; without beats a fixed period on the cut clock
const beat2 = (env, per) => {
  if (env.beat && env.beat.len > 0.15) {
    let s = env.beat.since - lagOf(env), i = env.beat.index | 0;
    if (s < 0) { s += env.beat.len; i -= 1; }
    return { ph: clamp((((i % 2) + 2) % 2 + s / env.beat.len) / 2), T: env.beat.len * 2 };
  }
  return { ph: wrap(env.lt, per) / per, T: per };
};

reg('cam', 'xqArcSweep', {
  // one pass along a shallow arc: sideways travel, a rise in the middle, and the frame leaning into the curve
  name: '弧を描く', en: 'Arc Sweep', tags: ['calm', 'emotional', 'editorial'], w: 1, ae: 'driftDiag',
  plan: rng => ({ dir: rng.pick([1, -1]), v: rng.pick([1, 1, -1]), a: rng.range(0.02, 0.026) }),
  get(env, Q) {
    const K = KM(env), u = cuOf(env), e = (u * 0.5 + E.inOutSine(u) * 0.5) * 2 - 1, d = Q.dir || 1, v = Q.v || 1;
    return { x: d * e * env.W * (Q.a || 0.023) * K, y: -v * env.H * 0.026 * K * (1 - e * e - 0.45), rot: d * v * e * 1.5 * K, s: 1.03 };
  } });

reg('cam', 'xqWindUp', {
  // backs off a little first (anticipation), then pushes in on an S-curve and holds the tighter framing
  name: '溜めて寄る', en: 'Wind-Up Dolly', tags: ['emotional', 'pop', 'editorial'], w: 1.1, ae: 'dollyIn',
  plan: rng => ({ a: rng.range(0.055, 0.075), b: rng.range(0.018, 0.026) }),
  get(env, Q) {
    const K = KM(env), dur = env.cut.dur, t1 = Math.min(0.45, dur * 0.25), t2 = Math.max(0.3, dur * 0.5);
    const back = E.inOutSine(clamp(env.lt / t1)), push = ioc(clamp((env.lt - t1) / t2)), b = (Q.b || 0.022) * K, a = (Q.a || 0.065) * K;
    return { s: 1 - b * back + (b + a) * push + 0.006 * K * cuOf(env), y: -env.H * 0.006 * K * push };
  } });

reg('cam', 'xqFocusHunt', {
  // autofocus hunting: soft, almost sharp, soft again, then it locks — with the lens breathing along
  name: 'ピント迷い', en: 'Focus Hunt', tags: ['emotional', 'calm', 'glitch'], w: 0.7, ae: 'focusIn',
  plan: rng => ({ d: rng.range(0.75, 1.0), b: rng.range(8, 12) }),
  get(env, Q) {
    const q = clamp(env.lt / Math.min(Q.d || 0.9, Math.max(0.4, env.cut.dur * 0.6)));
    if (q >= 1) return { s: 1 + 0.01 * KM(env) * cuOf(env) };
    const c = Math.cos(q * Math.PI * 1.5), dk = Math.pow(1 - q, 1.2);
    return { blur: (Q.b || 10) * K1(env) * Math.abs(c) * dk, s: 1 + 0.02 * KM(env) * c * dk + 0.01 * KM(env) * cuOf(env) };
  } });

reg('cam', 'xqBeatBreath', {
  // a smooth zoom that breathes in on one beat and out on the next (no punch)
  name: '拍で呼吸', en: 'Beat Breath', tags: ['calm', 'emotional', 'pop'], w: 1, ae: 'beatPunch',
  plan: rng => ({ a: rng.range(0.03, 0.042), per: rng.range(1.5, 1.9) }),
  get(env, Q) {
    const K = KM(env), b = beat2(env, Q.per || 1.7), w = 0.5 - 0.5 * Math.cos(b.ph * TAU);
    return { s: 1.012 + (Q.a || 0.036) * K * w, y: -env.H * 0.004 * K * w };
  } });

reg('cam', 'xqWalkCam', {
  // carried on the shoulder while walking: a step bob with a soft landing, hips swaying side to side
  name: '歩き撮り', en: 'Walking Cam', tags: ['emotional', 'pop', 'editorial'], w: 0.9, ae: 'handheld',
  plan: rng => ({ f: rng.range(1.5, 1.9), side: rng.pick([1, -1]) }),
  get(env, Q) {
    const K = KM(env), ph = env.lt * (Q.f || 1.7) * Math.PI, sd = seedOf(env), sg = Q.side || 1;
    return { x: sg * Math.sin(ph) * env.W * 0.006 * K + J.noise1(env.lt * 0.7, sd + 3) * env.W * 0.003 * K,
      y: (0.5 - Math.abs(Math.sin(ph))) * env.H * 0.011 * K, rot: sg * Math.sin(ph + 0.6) * 0.45 * K, s: 1.02 };
  } });

reg('cam', 'xqTripodNudge', {
  // locked off on a tripod; the operator corrects the framing in a few small eased nudges, each smaller, ending centred
  name: '三脚の直し', en: 'Tripod Nudge', tags: ['editorial', 'calm', 'graphic'], w: 0.8, ae: 'snapPan',
  plan: rng => ({ per: rng.range(0.85, 1.25), s0: rng.int(0, 99) }),
  get(env, Q) {
    const K = KM(env), per = Q.per || 1, sd = seedOf(env) + (Q.s0 | 0), kz = Math.max(1, Math.floor((env.cut.dur - 0.35) / per));
    const k = Math.floor(env.lt / per), e = ioc(clamp((env.lt - k * per) / 0.3));
    const pos = (i, c) => (i < 0 || i >= kz ? 0 : J.rs(sd, i, c) / (1 + 0.5 * i));
    const x0 = k > 0 ? pos(k - 1, 1) : pos(0, 1), y0 = k > 0 ? pos(k - 1, 2) : pos(0, 2);
    return { x: lerp(x0, pos(k, 1), e) * env.W * 0.016 * K, y: lerp(y0, pos(k, 2), e) * env.H * 0.013 * K, s: 1.02 };
  } });

reg('cam', 'xqLongLens', {
  // telephoto on a far subject: tight framing, a fine fast tremor riding on a slow sideways float
  name: '望遠の震え', en: 'Long Lens', tags: ['emotional', 'editorial', 'glitch'], w: 0.8, ae: 'handheld',
  plan: rng => ({ f: rng.range(0.9, 1.2) }),
  get(env, Q) {
    const K = KM(env), t = env.lt * (Q.f || 1), sd = seedOf(env) + 21;
    return { x: (J.noise1(t * 11, sd) * 0.6 + J.noise1(t * 17, sd + 1) * 0.4) * env.W * 0.0026 * K + J.noise1(t * 0.35, sd + 2) * env.W * 0.009 * K,
      y: (J.noise1(t * 12, sd + 3) * 0.6 + J.noise1(t * 19, sd + 4) * 0.4) * env.H * 0.0032 * K, s: 1.045 + 0.006 * Math.sin(t * 0.9) };
  } });

reg('cam', 'xqStopMotion', {
  // a push-in shot frame by frame: the zoom advances in small held steps with a slight registration wobble
  name: 'コマ撮り寄り', en: 'Stop-Motion Push', tags: ['pop', 'graphic', 'glitch'], w: 0.8, ae: 'stepZoom',
  plan: rng => ({ fps: rng.pick([5, 6, 8]), a: rng.range(0.065, 0.085) }),
  get(env, Q) {
    const K = KM(env), fps = Q.fps || 6, f = Math.floor(env.lt * fps + 1e-6), u = clamp(f / fps / Math.max(0.3, env.cut.dur)), sd = seedOf(env);
    return { s: 1 + (Q.a || 0.075) * K * u, x: J.rs(sd, f, 1) * env.W * 0.0022 * K, y: J.rs(sd, f, 2) * env.H * 0.0022 * K, rot: J.rs(sd, f, 3) * 0.22 * K };
  } });

reg('cam', 'xqWhipSpring', {
  // a short diagonal whip that lands on a spring: two quick overshoots, a trace of blur, then dead still
  name: '小ホイップ', en: 'Spring Whip', tags: ['pop', 'glitch', 'graphic'], w: 0.7, strong: true, ae: 'whipIn',
  plan: rng => ({ ang: rng.pick([0, 180, 25, 155, -25, -155, 90, -90]), f: rng.range(17, 21) }),
  get(env, Q) {
    const K = K1(env), t = env.lt, d = Math.exp(-t * 7);
    if (d < 0.004) return {};
    const w = d * Math.cos(t * (Q.f || 19)), a = (Q.ang || 0) * DEG, cx = Math.cos(a), cy = Math.sin(a);
    return { x: cx * env.W * 0.045 * K * w, y: cy * env.H * 0.04 * K * w, skx: cx * 3.5 * K * w, rot: cy * 1.2 * K * w, s: 1 + 0.02 * K * d, blur: 10 * K * Math.exp(-t * 16) };
  } });

reg('cam', 'xqLevelOut', {
  // the cut opens crooked and is levelled like a spirit level: it swings past true once or twice and comes to rest
  name: '水平出し', en: 'Level Out', tags: ['editorial', 'emotional', 'graphic'], w: 0.9, ae: 'dutch',
  plan: rng => ({ dir: rng.pick([1, -1]), a: rng.range(3, 4) }),
  get(env, Q) {
    const K = KM(env), q = env.lt / clamp(env.cut.dur * 0.5, 0.5, 1.4), r = Math.exp(-q * 3.2) * Math.cos(q * 4.4);
    return { rot: clamp((Q.dir || 1) * (Q.a || 3.5) * K * r, -5, 5), s: 1.035 - 0.012 * clamp(q) };
  } });

reg('cam', 'xqSquashRelax', {
  // the frame arrives pressed flat (or pulled tall / wide) on one axis and slowly relaxes — no wobble
  name: 'つぶれ戻り', en: 'Squash Relax', tags: ['pop', 'graphic', 'emotional'], w: 0.8, ae: 'jelly',
  plan: rng => ({ ax: rng.pick(['x', 'y', 'y']), sg: rng.pick([1, -1]), a: rng.range(0.07, 0.095) }),
  get(env, Q) {
    const K = K1(env), r = 1 - E.outCubic(clamp(env.lt / clamp(env.cut.dur * 0.6, 0.5, 1.6))), a = (Q.sg || 1) * (Q.a || 0.08) * K * r;
    return Q.ax === 'x' ? { sx: 1 + a, sy: 1 - a * 0.35, s: 1.005 } : { sy: 1 + a, sx: 1 - a * 0.35, s: 1.005 };
  } });

reg('cam', 'xqDriftTurn', {
  // drifts one way, slows, turns round in the middle of the cut and drifts back while it keeps sinking / rising
  name: '折り返し', en: 'Turnaround Drift', tags: ['calm', 'emotional', 'editorial'], w: 1, ae: 'driftDiag',
  plan: rng => ({ dx: rng.pick([1, -1]), dy: rng.pick([1, -1]), a: rng.range(0.024, 0.03) }),
  get(env, Q) {
    const K = KM(env), u = cuOf(env);
    return { x: (Q.dx || 1) * env.W * (Q.a || 0.027) * K * (Math.sin(Math.PI * u) - 0.55), y: (Q.dy || 1) * env.H * 0.014 * K * (u * 2 - 1), s: 1.025 };
  } });

reg('cam', 'xqCraneUp', {
  // a crane shot: the camera rises and pulls back at once, the foreshortened frame opening up as it levels
  name: 'クレーン', en: 'Crane Up', tags: ['emotional', 'calm', 'editorial'], w: 0.9, ae: 'tiltDown',
  plan: rng => ({ dir: rng.pick([1, -1]), up: rng.chance(0.75) }),
  get(env, Q) {
    const K = KM(env), r = 1 - E.outCubic(cuOf(env)), v = Q.up === false ? -1 : 1;
    return { y: v * env.H * 0.036 * K * (r - 0.2), s: 1.01 + 0.055 * K * r, sy: 1 - 0.035 * K * r, rot: (Q.dir || 1) * 1.1 * K * r };
  } });

reg('cam', 'xqTruckAround', {
  // the camera trucks round the lyric: seen from one side, face-on in the middle, from the other side at the end
  name: '回り込み', en: 'Truck Around', tags: ['graphic', 'emotional', 'editorial'], w: 0.8, ae: 'orbitDrift',
  plan: rng => ({ dir: rng.pick([1, -1]), a: rng.range(0.045, 0.06) }),
  get(env, Q) {
    const K = KM(env), u = cuOf(env), k = (u * 0.5 + E.inOutSine(u) * 0.5) * 2 - 1, d = Q.dir || 1;
    return { sx: 1 - (Q.a || 0.05) * K * k * k, x: d * env.W * 0.022 * K * k, skx: d * 1.3 * K * k, s: 1.03 };
  } });

reg('cam', 'xqHeartbeat', {
  // lub-dub: two close swells and a rest, over two beats (or about a second without beats)
  name: '鼓動', en: 'Heartbeat', tags: ['emotional', 'pop', 'glitch'], w: 0.7, ae: 'beatPunch',
  plan: rng => ({ a: rng.range(0.024, 0.032), per: rng.range(1.0, 1.25) }),
  get(env, Q) {
    const K = KM(env), b = beat2(env, Q.per || 1.1), tt = b.ph * b.T, d2 = Math.min(0.3, b.T * 0.27);
    const k = Math.exp(-tt * 10) + (tt > d2 ? 0.65 * Math.exp(-(tt - d2) * 10) : 0);
    return { s: 1.01 + (Q.a || 0.028) * K * k, sy: 1 + 0.006 * K * k };
  } });

reg('cam', 'xqLeafFall', {
  // comes down from above like a falling leaf: swinging left and right, tilting with each swing, and lands still
  name: '舞い降り', en: 'Leaf Fall', tags: ['calm', 'emotional', 'pop'], w: 0.8, ae: 'pendulumSway',
  plan: rng => ({ dir: rng.pick([1, -1]), n: rng.range(1.2, 1.7) }),
  get(env, Q) {
    const K = K1(env), q = clamp(env.lt / clamp(env.cut.dur * 0.65, 0.6, 1.9)), r = 1 - E.outCubic(q), d = Q.dir || 1, ph = q * TAU * (Q.n || 1.5);
    return { y: -env.H * 0.042 * K * r, x: d * env.W * 0.03 * K * r * Math.sin(ph), rot: d * 2.6 * K * r * Math.cos(ph), s: 1.01 };
  } });

reg('cam', 'xqLoudZoom', {
  // the framing follows the loudness of the song: closer when it is loud, wider when it is quiet
  name: '音量で寄る', en: 'Loudness Zoom', tags: ['pop', 'emotional', 'glitch'], w: 0.7, ae: 'beatPunch',
  plan: rng => ({ a: rng.range(0.04, 0.055) }),
  get(env, Q) {
    const K = KM(env), en = env.energy == null ? 0.5 + 0.5 * Math.sin(env.lt * 2.1) * Math.sin(env.lt * 0.7 + 1) : clamp(env.energy);
    return { s: 1.005 + (Q.a || 0.047) * K * en, y: -env.H * 0.004 * K * en };
  } });

reg('cam', 'xqPushPull', {
  // in and back out again in one breath: closest in the middle of the cut, home at both ends
  name: '寄って引く', en: 'Push Pull', tags: ['calm', 'emotional', 'editorial'], w: 1, ae: 'dollyIn',
  plan: rng => ({ a: rng.range(0.065, 0.085), at: rng.range(0.42, 0.58) }),
  get(env, Q) {
    const K = KM(env), u = cuOf(env), at = Q.at || 0.5, v = u < at ? u / at * 0.5 : 0.5 + (u - at) / (1 - at) * 0.5, b = 0.5 - 0.5 * Math.cos(TAU * v);
    return { s: 1 + (Q.a || 0.075) * K * b, y: -env.H * 0.006 * K * b };
  } });

reg('cam', 'xqFindFrame', {
  // starts too tight and off to one corner, as if the operator were still looking, then finds the lyric and frames it
  name: '構図を探す', en: 'Find Framing', tags: ['editorial', 'pop', 'emotional'], w: 0.9, ae: 'spiralIn',
  plan: rng => ({ cx: rng.pick([1, -1]), cy: rng.pick([1, -1, 0]) }),
  get(env, Q) {
    const K = K1(env), T = clamp(env.cut.dur * 0.45, 0.45, 1.1), r = 1 - E.outBack(clamp((env.lt - T * 0.15) / (T * 0.85)), 1.15);
    return { x: (Q.cx || 1) * env.W * 0.028 * K * r, y: (Q.cy || 0) * env.H * 0.03 * K * r, s: 1 + 0.06 * K * Math.max(-0.15, r) };
  } });

reg('cam', 'xqTickRoll', {
  // the frame rolls like the second hand of a clock: small ticks, each with a tiny overshoot, from one lean to the other
  name: '秒針ロール', en: 'Tick Roll', tags: ['graphic', 'pop', 'glitch'], w: 0.7, ae: 'roll',
  plan: rng => ({ dir: rng.pick([1, -1]), n: rng.int(4, 6), a: rng.range(2, 2.8) }),
  get(env, Q) {
    const K = KM(env), dur = Math.max(0.3, env.cut.dur), n = Math.max(2, Math.min(Q.n || 5, Math.floor(dur / 0.3))), per = dur / n;
    const k = Math.min(n - 1, Math.floor(env.lt / per)), A = (Q.dir || 1) * (Q.a || 2.4) * K, pos = i => -A + 2 * A * i / (n - 1);
    const e = E.outBack(clamp((env.lt - k * per) / 0.14), 2.2);
    return { rot: k > 0 ? lerp(pos(k - 1), pos(k), e) : pos(0), s: 1.03 };
  } });

/* ================================================================ TRANSITIONS (device px) */
const bell = k => Math.sin(Math.PI * clamp(k));
const minD = I => Math.min(I.cw, I.ch);
const lwOf = (I, k = 0.006) => Math.max(2, minD(I) * k);
const prevBg = I => (I.scPrev || I.sc).bg;
// an accent that reads against both backgrounds
const tAcc = (I, second) => {
  const sc = I.sc, pb = prevBg(I), list = second ? [sc.accent2, sc.accent, sc.fg] : [sc.accent, sc.accent2, sc.fg];
  for (const c of list) if (c && J.contrast(c, sc.bg) >= 1.8 && J.contrast(c, pb) >= 1.4) return c;
  return sc.fg;
};
// copy the sub-rectangle (x, y, w, h) of canvas C to the same place (+dx, dy), clamped to the canvas
const part = (ctx, C, x, y, w, h, dx = 0, dy = 0) => {
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(C.width, Math.ceil(x + w)), y1 = Math.min(C.height, Math.ceil(y + h));
  if (x1 - x0 < 1 || y1 - y0 < 1) return;
  ctx.drawImage(C, x0, y0, x1 - x0, y1 - y0, x0 + dx, y0 + dy, x1 - x0, y1 - y0);
};
const scaled = (ctx, C, cw, ch, s, cx = cw / 2, cy = ch / 2) => ctx.drawImage(C, cx - cx * s, cy - cy * s, cw * s, ch * s);
const dim = (ctx, I, a) => { if (a > 0.003) { ctx.globalAlpha = a; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, I.cw, I.ch); ctx.globalAlpha = 1; } };
// half-plane path: everything on the `sign` side of the line through (qx, qy) with normal (nx, ny)
const halfPlane = (ctx, qx, qy, nx, ny, sign, L) => {
  const tx = -ny, ty = nx;
  ctx.beginPath(); ctx.moveTo(qx + tx * L, qy + ty * L); ctx.lineTo(qx - tx * L, qy - ty * L);
  ctx.lineTo(qx - tx * L + nx * sign * L, qy - ty * L + ny * sign * L); ctx.lineTo(qx + tx * L + nx * sign * L, qy + ty * L + ny * sign * L); ctx.closePath();
};
const trReg = (k, d) => reg('trans', k, Object.assign({}, d, {
  draw(ctx, A, B, p, I) {
    ctx.save();
    try {
      if (!(p > 0)) ctx.drawImage(A, 0, 0);
      else if (p >= 1) ctx.drawImage(B, 0, 0);
      else d.draw(ctx, A, B, p, I, I.P || {});
    } finally { ctx.restore(); }
  } }));

/* ---- slanted blades: the new cut runs down parallel diagonal lanes, neighbouring lanes in opposite directions ---- */
trReg('xqBladeRun', { name: '斜め刃走り', en: 'Blade Run', tags: ['graphic', 'pop', 'glitch'], w: 1, dur: 0.42, ae: 'diagonalWipe',
  plan: rng => ({ n: rng.int(5, 8), ang: rng.pick([-32, -24, 24, 32, 58, -58]), mid: rng.chance(0.5) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, n = Q.n || 6, R = Math.hypot(cw, ch) + 4, hb = R / n, lw = lwOf(I, 0.005), tips = [];
    ctx.drawImage(A, 0, 0);
    ctx.save();
    ctx.translate(cw / 2, ch / 2); ctx.rotate((Q.ang || 30) * DEG);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const o = Q.mid ? Math.abs(i - (n - 1) / 2) / Math.max(1, (n - 1) / 2) : i / Math.max(1, n - 1);
      const t = ioc(clamp(p * 1.5 - o * 0.5)), len = R * t, y0 = -R / 2 + i * hb;
      if (t <= 0) continue;
      if (i % 2) { ctx.rect(R / 2 - len, y0 - 0.6, len, hb + 1.2); tips.push([R / 2 - len - lw, y0, t]); }
      else { ctx.rect(-R / 2, y0 - 0.6, len, hb + 1.2); tips.push([-R / 2 + len, y0, t]); }
    }
    ctx.save(); ctx.clip(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(B, 0, 0); ctx.restore();
    ctx.fillStyle = tAcc(I);
    for (const [x, y, t] of tips) { if (t >= 1) continue; ctx.globalAlpha = Math.min(1, (1 - t) * 3); ctx.fillRect(x, y, lw, hb); }
    ctx.restore();
  } });

/* ---- propeller: several wedges open at once round the centre while the whole rotor turns ---- */
trReg('xqPropeller', { name: 'プロペラ', en: 'Propeller Wipe', tags: ['pop', 'graphic'], w: 0.8, dur: 0.45, ae: 'clockWipe',
  plan: rng => ({ n: rng.int(3, 5), dir: rng.pick([1, -1]), a0: rng.range(0, 360), x: 0.5 + rng.range(-0.08, 0.08), y: 0.5 + rng.range(-0.06, 0.06) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, n = Q.n || 4, d = Q.dir || 1, cx = cw * (Q.x || 0.5), cy = ch * (Q.y || 0.5), e = ioc(p);
    const R = Math.hypot(Math.max(cx, cw - cx), Math.max(cy, ch - cy)) + 4, sw = e * TAU / n + 0.004, base = (Q.a0 || 0) * DEG + d * e * 0.9;
    ctx.drawImage(A, 0, 0);
    ctx.save(); ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = base + i * TAU / n; ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, d > 0 ? a : a - sw, d > 0 ? a + sw : a); ctx.closePath(); }
    ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
    ctx.globalAlpha = Math.pow(bell(p), 0.5); ctx.strokeStyle = tAcc(I); ctx.lineWidth = lwOf(I, 0.005); ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = base + i * TAU / n + d * sw; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
    ctx.stroke();
  } });

/* ---- polygon iris: a triangle / square / hexagon window turns as it opens ---- */
trReg('xqPolyIris', { name: '多角アイリス', en: 'Polygon Iris', tags: ['graphic', 'pop', 'editorial'], w: 0.9, dur: 0.42, ae: 'irisOpen',
  plan: rng => ({ n: rng.pick([3, 4, 4, 6]), spin: rng.range(50, 110) * rng.pick([1, -1]), a0: rng.pick([0, 45, 90, 30]) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, n = Q.n || 4, e = n === 3 ? E.inCubic(p) * 0.5 + ioc(p) * 0.5 : ioc(p), cx = cw / 2, cy = ch / 2;
    const r = (Math.hypot(cw, ch) / 2 + 4) / Math.cos(Math.PI / n) * e, rot = ((Q.a0 || 0) + (Q.spin || 80) * (1 - e)) * DEG;
    const poly = rr => { ctx.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i * TAU / n; if (i) ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); };
    ctx.drawImage(A, 0, 0);
    if (r < 0.5) return;
    ctx.save(); poly(r); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
    const a = Math.pow(bell(p), 0.6), lw = lwOf(I, 0.008);
    ctx.lineJoin = 'miter'; ctx.globalAlpha = a; ctx.strokeStyle = tAcc(I); ctx.lineWidth = lw; poly(r); ctx.stroke();
    ctx.globalAlpha = a * 0.55; ctx.strokeStyle = tAcc(I, true); ctx.lineWidth = Math.max(1, lw * 0.4); poly(r * 1.12 + lw * 3); ctx.stroke();
  } });

/* ---- ring ripple: concentric bands, each one widening outwards, the inner ones first ---- */
trReg('xqRingRipple', { name: '同心リング', en: 'Ring Ripple', tags: ['graphic', 'calm', 'pop'], w: 0.8, dur: 0.45, ae: 'irisOpen',
  plan: rng => ({ n: rng.int(4, 7), x: rng.pick([0.5, 0.5, 0.2, 0.8]), y: rng.pick([0.5, 0.5, 0.3, 0.75]), inw: rng.chance(0.3) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, n = Q.n || 5, cx = cw * (Q.x ?? 0.5), cy = ch * (Q.y ?? 0.5);
    const R = Math.hypot(Math.max(cx, cw - cx), Math.max(cy, ch - cy)) + 4, bw = R / n, edges = [];
    ctx.drawImage(A, 0, 0);
    ctx.save(); ctx.beginPath();
    for (let j = 0; j < n; j++) {
      const o = (Q.inw ? n - 1 - j : j) / Math.max(1, n - 1), t = ioc(clamp(p * 1.6 - o * 0.6));
      if (t <= 0) continue;
      const r0 = Math.max(0, j * bw - 0.8), r1 = j * bw + bw * t;
      ctx.moveTo(cx + r1, cy); ctx.arc(cx, cy, r1, 0, TAU);
      if (r0 > 0) { ctx.moveTo(cx + r0, cy); ctx.arc(cx, cy, r0, 0, TAU, true); }
      if (t < 1) edges.push([r1, t]);
    }
    ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
    ctx.strokeStyle = tAcc(I); ctx.lineWidth = lwOf(I, 0.004);
    for (const [r, t] of edges) { ctx.globalAlpha = Math.min(1, (1 - t) * 2.5) * Math.min(1, t * 6); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); }
  } });

/* ---- louvers: the old cut is cut into slats that turn edge-on (each squeezes to its own centre line) ---- */
trReg('xqLouverTurn', { name: 'ルーバー', en: 'Louver Turn', tags: ['graphic', 'editorial', 'calm'], w: 0.9, dur: 0.42, ae: 'blinds',
  plan: rng => ({ n: rng.int(7, 12), vert: rng.chance(0.4), rev: rng.chance(0.5) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, n = Q.n || 9, L = Q.vert ? cw : ch, lw = Math.max(1, lwOf(I, 0.0025));
    ctx.drawImage(B, 0, 0); dim(ctx, I, 0.35 * (1 - ioc(p)));
    for (let i = 0; i < n; i++) {
      const t = ioc(clamp((p - (Q.rev ? n - 1 - i : i) / n * 0.4) / 0.6)), f = Math.cos(t * Math.PI / 2);
      if (f <= 0.004) continue;
      const a0 = Math.round(i * L / n), a1 = Math.round((i + 1) * L / n), h = (a1 - a0) * f, m = (a0 + a1) / 2 - h / 2;
      if (Q.vert) ctx.drawImage(A, a0, 0, a1 - a0, ch, m, 0, h, ch); else ctx.drawImage(A, 0, a0, cw, a1 - a0, 0, m, cw, h);
      if (t > 0) {
        ctx.globalAlpha = 0.55 * t; ctx.fillStyle = '#000000';
        if (Q.vert) ctx.fillRect(m, 0, h, ch); else ctx.fillRect(0, m, cw, h);
        ctx.globalAlpha = Math.min(1, t * 4) * f; ctx.fillStyle = tAcc(I);
        if (Q.vert) ctx.fillRect(m, 0, lw, ch); else ctx.fillRect(0, m, cw, lw);
        ctx.globalAlpha = 1;
      }
    }
  } });

/* ---- halftone: a screen of dots swells across the frame until the dots merge into the new cut ---- */
trReg('xqHalftone', { name: '網点ワイプ', en: 'Halftone Wipe', tags: ['pop', 'graphic', 'editorial'], w: 0.9, dur: 0.48, ae: 'checker',
  plan: rng => ({ n: rng.int(6, 9), dir: rng.pick(['L', 'R', 'U', 'D', 'C', 'X']) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, cell = minD(I) / (Q.n || 7), cols = Math.ceil(cw / cell) + 1, rows = Math.ceil(ch / (cell * 0.866)) + 1, d = Q.dir || 'L';
    ctx.drawImage(A, 0, 0);
    ctx.save(); ctx.beginPath();
    let full = true;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = (i + (j % 2 ? 0.5 : 0)) * cell - cell * 0.25, y = j * cell * 0.866, fx = clamp(x / cw), fy = clamp(y / ch);
      const o = d === 'R' ? fx : d === 'L' ? 1 - fx : d === 'D' ? fy : d === 'U' ? 1 - fy : d === 'C' ? Math.min(1, Math.hypot(fx - 0.5, fy - 0.5) * 1.42) : (fx + fy) / 2;
      const t = clamp((p - o * 0.55) / 0.45);
      if (t <= 0) { full = false; continue; }
      if (t < 1) full = false;
      const r = cell * 0.62 * E.inOutSine(t);
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
    }
    if (full) { ctx.restore(); ctx.drawImage(B, 0, 0); return; }
    ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
  } });

/* ---- chevron push: thin bands push the old cut out one after another, so the seam travels as an arrow head ---- */
trReg('xqChevronPush', { name: 'くの字押し', en: 'Chevron Push', tags: ['graphic', 'pop', 'glitch'], w: 1, dur: 0.42, ae: 'pushSlide',
  plan: rng => ({ dir: rng.pick(['L', 'L', 'R', 'R', 'U', 'D']), n: rng.pick([14, 18, 24]), inv: rng.chance(0.35) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, n = Q.n || 18, hor = Q.dir !== 'U' && Q.dir !== 'D', sg = Q.dir === 'R' || Q.dir === 'D' ? 1 : -1;
    const L = hor ? ch : cw, M = hor ? cw : ch, lw = lwOf(I, 0.004), ac = tAcc(I), ba = Math.pow(bell(p), 0.6);
    for (let i = 0; i < n; i++) {
      const c = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2), t = ioc(clamp((p - 0.34 * (Q.inv ? 1 - c : c)) / 0.66)), o = Math.round(t * M) * sg;
      const a0 = Math.round(i * L / n), a1 = Math.round((i + 1) * L / n);
      if (hor) { part(ctx, A, 0, a0, cw, a1 - a0, o, 0); part(ctx, B, 0, a0, cw, a1 - a0, o - sg * cw, 0); }
      else { part(ctx, A, a0, 0, a1 - a0, ch, 0, o); part(ctx, B, a0, 0, a1 - a0, ch, 0, o - sg * ch); }
      if (t > 0 && t < 1) {
        const q = sg < 0 ? M + o : o;
        ctx.globalAlpha = ba; ctx.fillStyle = ac;
        if (hor) ctx.fillRect(q - lw / 2, a0, lw, a1 - a0); else ctx.fillRect(a0, q - lw / 2, a1 - a0, lw);
        ctx.globalAlpha = 1;
      }
    }
  } });

/* ---- diagonal split: the old cut is cut along a slanted line and the two pieces part at right angles to it ---- */
trReg('xqDiagSplit', { name: '斜め割り', en: 'Diagonal Split', tags: ['graphic', 'pop', 'emotional'], w: 0.9, dur: 0.42, ae: 'doorsOpen',
  plan: rng => ({ ang: rng.pick([28, 38, 52, -28, -38, -52, 142, 128]) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, a = (Q.ang || 35) * DEG, nx = Math.cos(a), ny = Math.sin(a), e = ioc(p), L = (cw + ch) * 2;
    const dist = (Math.abs(nx) * cw + Math.abs(ny) * ch) / 2 + 4, off = e * dist, lw = lwOf(I, 0.005);
    if (off < 0.5) { ctx.drawImage(A, 0, 0); return; }
    ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, cw, ch);
    scaled(ctx, B, cw, ch, 1.06 - 0.06 * E.outCubic(p));
    dim(ctx, I, 0.4 * (1 - e));
    for (const sg of [1, -1]) {
      const qx = cw / 2 + nx * off * sg, qy = ch / 2 + ny * off * sg;
      ctx.save(); halfPlane(ctx, qx, qy, nx, ny, sg, L); ctx.clip(); ctx.drawImage(A, nx * off * sg, ny * off * sg); ctx.restore();
      ctx.globalAlpha = Math.pow(bell(p), 0.5); ctx.strokeStyle = tAcc(I, sg < 0); ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(qx - ny * L, qy + nx * L); ctx.lineTo(qx + ny * L, qy - nx * L); ctx.stroke(); ctx.globalAlpha = 1;
    }
  } });

/* ---- accordion: the old cut folds up into pleats against one edge ---- */
trReg('xqAccordion', { name: '蛇腹たたみ', en: 'Accordion Fold', tags: ['graphic', 'editorial', 'pop'], w: 0.8, dur: 0.45, ae: 'cover',
  plan: rng => ({ n: rng.pick([6, 8, 10]), dir: rng.pick(['L', 'R', 'L', 'R', 'U']) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, n = Q.n || 8, e = ioc(p), k = 1 - e, vert = Q.dir === 'U', toEnd = Q.dir === 'R', L = vert ? ch : cw, sh = clamp(e * 3);
    const po = (toEnd ? -1 : 1) * k * L * 0.05;
    ctx.fillStyle = I.sc.bg; ctx.fillRect(0, 0, cw, ch);
    if (vert) ctx.drawImage(B, 0, po); else ctx.drawImage(B, po, 0);
    dim(ctx, I, 0.35 * k);
    if (k < 0.002) return;
    for (let i = 0; i < n; i++) {
      const s0 = Math.round(i * L / n), s1 = Math.round((i + 1) * L / n), d0 = toEnd ? L - (L - s0) * k : s0 * k, dw = (s1 - s0) * k + 0.6;
      if (vert) ctx.drawImage(A, 0, s0, cw, s1 - s0, 0, d0, cw, dw); else ctx.drawImage(A, s0, 0, s1 - s0, ch, d0, 0, dw, ch);
      ctx.globalAlpha = (i % 2 ? 0.42 : 0.1) * sh; ctx.fillStyle = i % 2 ? '#000000' : '#ffffff';
      if (vert) ctx.fillRect(0, d0, cw, dw); else ctx.fillRect(d0, 0, dw, ch);
      ctx.globalAlpha = 1;
    }
    const lw = lwOf(I, 0.005), q = toEnd ? L - L * k - lw : L * k;
    ctx.globalAlpha = Math.pow(bell(p), 0.6); ctx.fillStyle = tAcc(I);
    if (vert) ctx.fillRect(0, q, cw, lw); else ctx.fillRect(q, 0, lw, ch);
  } });

/* ---- strip shuffle: tall strips lift, trade places like shuffled cards, and come home carrying the new cut ---- */
trReg('xqStripShuffle', { name: '短冊シャッフル', en: 'Strip Shuffle', tags: ['pop', 'graphic', 'glitch'], w: 0.7, dur: 0.5, ae: 'sliceShift',
  plan: rng => ({ n: rng.int(4, 7), k: rng.int(1, 5) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, n = Q.n || 5, k = 1 + ((Q.k || 1) % (n - 1)), m = 0.5 - 0.5 * Math.cos(TAU * p), xf = J.smooth(0.4, 0.6, p), sh = minD(I) * 0.012;
    ctx.fillStyle = J.mix(J.mix(prevBg(I), I.sc.bg, p), '#000000', 0.55); ctx.fillRect(0, 0, cw, ch);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
      if ((i % 2) !== pass) continue;
      const x0 = Math.round(i * cw / n), x1 = Math.round((i + 1) * cw / n), w = x1 - x0, tx = Math.round(((n - 1 - i + k) % n) * cw / n);
      const dx = Math.round((tx - x0) * m), dy = Math.round((pass ? -1 : 1) * ch * 0.04 * m);
      ctx.globalAlpha = 0.35 * m; ctx.fillStyle = '#000000'; ctx.fillRect(x0 + dx - sh, dy, w + sh * 2, ch); ctx.globalAlpha = 1;
      if (xf < 1) ctx.drawImage(A, x0, 0, w, ch, x0 + dx, dy, w, ch);
      if (xf > 0) { ctx.globalAlpha = xf; ctx.drawImage(B, x0, 0, w, ch, x0 + dx, dy, w, ch); ctx.globalAlpha = 1; }
    }
  } });

/* ---- window zoom: the new cut arrives as a small framed picture that grows until it fills the screen ---- */
trReg('xqWindowZoom', { name: '窓ズーム', en: 'Window Zoom', tags: ['editorial', 'pop', 'emotional'], w: 1, dur: 0.42, ae: 'zoomThrough',
  plan: rng => ({ x: rng.pick([0.5, 0.5, 0.3, 0.7]), y: rng.pick([0.5, 0.5, 0.4, 0.62]), r: rng.range(-7, 7) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, e = ioc(p), s = e, cx = lerp(cw * (Q.x ?? 0.5), cw / 2, e), cy = lerp(ch * (Q.y ?? 0.5), ch / 2, e);
    ctx.fillStyle = prevBg(I); ctx.fillRect(0, 0, cw, ch);
    scaled(ctx, A, cw, ch, 1 + 0.18 * e);
    dim(ctx, I, 0.45 * E.outCubic(p));
    if (s < 0.004) return;
    ctx.translate(cx, cy); ctx.rotate((Q.r || 0) * (1 - e) * DEG);
    const w = cw * s, h = ch * s, lw = lwOf(I, 0.007) * (1 - J.smooth(0.75, 1, p)), so = minD(I) * 0.02 * (1 - e);
    ctx.globalAlpha = 0.4 * (1 - e); ctx.fillStyle = '#000000'; ctx.fillRect(-w / 2 + so, -h / 2 + so, w, h); ctx.globalAlpha = 1;
    ctx.drawImage(B, -w / 2, -h / 2, w, h);
    if (lw > 0.3) { ctx.strokeStyle = tAcc(I); ctx.lineWidth = lw; ctx.strokeRect(-w / 2 - lw / 2, -h / 2 - lw / 2, w + lw, h + lw); }
  } });

/* ---- soft sweep: a dissolve with a direction — a wide feathered edge crosses the frame ---- */
trReg('xqSoftSweep', { name: '流しディゾルブ', en: 'Soft Sweep', tags: ['calm', 'emotional', 'editorial'], w: 1.2, dur: 0.5, ae: 'wipe',
  plan: rng => ({ ang: rng.pick([0, 180, 0, 180, 90, -90, 30, 150, -30, -150]), f: rng.range(0.3, 0.5) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, a = (Q.ang || 0) * DEG, dx = Math.cos(a), dy = Math.sin(a), D = Math.abs(dx) * cw + Math.abs(dy) * ch, f = D * (Q.f || 0.4);
    const pos = -D / 2 - f + (D + f) * E.inOutSine(p), T = I.tmp(cw, ch), x = T.getContext('2d');
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.filter = 'none';
    x.globalCompositeOperation = 'copy'; x.drawImage(B, 0, 0);
    const g = x.createLinearGradient(cw / 2 + dx * pos, ch / 2 + dy * pos, cw / 2 + dx * (pos + f), ch / 2 + dy * (pos + f));
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, cw, ch);
    x.restore();
    ctx.drawImage(A, 0, 0); ctx.drawImage(T, 0, 0);
  } });

/* ---- light leak: soft patches of the scheme's accent colours bloom across the frame and carry the dissolve ---- */
trReg('xqLightLeak', { name: '光漏れ', en: 'Light Leak', tags: ['emotional', 'calm', 'pop'], w: 1, dur: 0.5, ae: 'flashCross',
  plan: rng => ({ dir: rng.pick([1, -1]), y: rng.range(0.2, 0.8), s0: rng.int(0, 99) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, sc = I.sc, x = J.smooth(0.3, 0.7, p), d = Q.dir || 1, s0 = (Q.s0 | 0) + 3, md = minD(I);
    ctx.drawImage(A, 0, 0);
    if (x > 0) { ctx.globalAlpha = x; ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1; }
    const light = J.lum(sc.bg) > 0.6 && J.lum(prevBg(I)) > 0.6, a = Math.pow(bell(p), 0.8);
    const cols = [sc.accent, sc.accent2 || sc.accent, J.mix(sc.accent, light ? sc.accent2 || sc.fg : '#ffffff', 0.55)];
    ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
    for (let i = 0; i < 3; i++) {
      const u = E.inOutSine(clamp(p * 1.15 - i * 0.07)), fx = d > 0 ? lerp(-0.25, 1.25, u) : lerp(1.25, -0.25, u);
      const cx = cw * fx, cy = ch * clamp((Q.y || 0.5) + J.rs(s0, i, 1) * 0.3 + (u - 0.5) * 0.2 * J.rs(s0, i, 2), 0.05, 0.95), r = md * (0.75 + 0.45 * J.r(s0, i, 3)) * (0.7 + 0.5 * bell(p));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, J.rgba(cols[i], 0.95)); g.addColorStop(0.45, J.rgba(cols[i], 0.45)); g.addColorStop(1, J.rgba(cols[i], 0));
      ctx.globalAlpha = a * (light ? 0.45 : 1); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a * 0.22; ctx.fillStyle = cols[2]; ctx.fillRect(0, 0, cw, ch);
  } });

/* ---- page peel: the old cut is peeled off from a corner; its pale back side folds over as it goes ---- */
trReg('xqPagePeel', { name: 'ページめくり', en: 'Page Peel', tags: ['editorial', 'emotional', 'calm'], w: 0.9, dur: 0.55, ae: 'uncover',
  plan: rng => ({ cx: rng.chance(0.7) ? 1 : 0, cy: rng.chance(0.65) ? 1 : 0, k: rng.range(0.4, 0.8) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, c0x = Q.cx === 0 ? 0 : cw, c0y = Q.cy === 0 ? 0 : ch, k = Q.k || 0.6;
    let dx = c0x ? -1 : 1, dy = (c0y ? -1 : 1) * k; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
    const D = Math.abs(dx) * cw + Math.abs(dy) * ch, t = (E.inOutSine(p) * 0.6 + E.inQuad(p) * 0.4) * (D + 2), L = (cw + ch) * 2;
    const qx = c0x + dx * t, qy = c0y + dy * t, sw = minD(I) * 0.09, pb = prevBg(I), on = clamp(p * 6);
    ctx.drawImage(A, 0, 0);
    // the new cut where the page has already gone, with the fold's shadow on it
    ctx.save(); halfPlane(ctx, qx, qy, dx, dy, -1, L); ctx.clip(); ctx.drawImage(B, 0, 0);
    let g = ctx.createLinearGradient(qx, qy, qx - dx * sw, qy - dy * sw);
    g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = on; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore();
    // the flap = the peeled part mirrored across the fold line
    ctx.save(); halfPlane(ctx, qx, qy, dx, dy, 1, L); ctx.clip();
    const kk = 2 * (c0x * dx + c0y * dy + t);
    ctx.save(); ctx.transform(1 - 2 * dx * dx, -2 * dx * dy, -2 * dx * dy, 1 - 2 * dy * dy, kk * dx, kk * dy);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(-sw * 0.35, -sw * 0.35, cw + sw * 0.7, ch + sw * 0.7);
    ctx.fillStyle = J.mix(pb, J.lum(pb) > 0.5 ? '#000000' : '#ffffff', 0.16); ctx.fillRect(0, 0, cw, ch);
    ctx.globalAlpha = 0.16; ctx.drawImage(A, 0, 0); ctx.restore();
    const fw = Math.max(2, Math.min(t, sw * 2.2));
    g = ctx.createLinearGradient(qx, qy, qx + dx * fw, qy + dy * fw);
    g.addColorStop(0, 'rgba(0,0,0,0.42)'); g.addColorStop(0.35, 'rgba(0,0,0,0.08)'); g.addColorStop(0.7, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = on; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  } });

/* ---- wave wipe: the edge between the cuts is a rolling wave ---- */
trReg('xqWaveWipe', { name: '波ワイプ', en: 'Wave Wipe', tags: ['pop', 'calm', 'emotional'], w: 0.9, dur: 0.48, ae: 'wipe',
  plan: rng => ({ dir: rng.pick(['L', 'R', 'U', 'U', 'D']), w: rng.range(1.1, 2.2), sp: rng.pick([1, -1]) * rng.range(0.7, 1.3), ph: rng.range(0, 6.28) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, hor = Q.dir === 'L' || Q.dir === 'R', fromEnd = Q.dir === 'L' || Q.dir === 'U', Lm = hor ? cw : ch, Le = hor ? ch : cw;
    const amp = minD(I) * 0.055, X = -amp * 1.5 - 2 + (Lm + amp * 3 + 4) * ioc(p), N = 48, wv = Q.w || 1.5, ph = (Q.ph || 0) + p * (Q.sp || 1) * TAU;
    const edge = (u, o) => X + o + amp * Math.sin(u / Le * TAU * wv + ph) + amp * 0.4 * Math.sin(u / Le * TAU * (wv * 2 + 1) - ph * 1.7);
    const pt = (u, v) => { const vv = fromEnd ? Lm - v : v; return hor ? [vv, u] : [u, vv]; };
    const curve = (o, move) => { for (let i = 0; i <= N; i++) { const u = Le * i / N, q = pt(u, edge(u, o)); if (i === 0 && move) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); } };
    ctx.drawImage(A, 0, 0);
    ctx.save(); ctx.beginPath(); let q = pt(-4, -amp * 4); ctx.moveTo(q[0], q[1]); curve(0, false); q = pt(Le + 4, -amp * 4); ctx.lineTo(q[0], q[1]); ctx.closePath();
    ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
    const a = Math.pow(bell(p), 0.6), lw = lwOf(I, 0.006);
    ctx.lineJoin = 'round'; ctx.globalAlpha = a; ctx.strokeStyle = tAcc(I); ctx.lineWidth = lw; ctx.beginPath(); curve(0, true); ctx.stroke();
    ctx.globalAlpha = a * 0.6; ctx.strokeStyle = tAcc(I, true); ctx.lineWidth = Math.max(1, lw * 0.4); ctx.beginPath(); curve(lw * 3.5, true); ctx.stroke();
  } });

/* ---- stretch smear: the new cut's edge is pulled across the frame like wet paint, then the picture follows it ---- */
trReg('xqStretchSmear', { name: '引き伸ばし', en: 'Stretch Smear', tags: ['glitch', 'graphic', 'pop'], w: 0.9, dur: 0.45, ae: 'whipPan',
  plan: rng => ({ dir: rng.pick(['R', 'L', 'R', 'L', 'D', 'U']) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, hor = Q.dir !== 'U' && Q.dir !== 'D', fromEnd = Q.dir === 'L' || Q.dir === 'U', L = hor ? cw : ch;
    const xe = Math.round(L * E.outCubic(clamp(p / 0.62))), xb = Math.min(xe, Math.round(L * ioc(clamp((p - 0.14) / 0.86))));
    ctx.drawImage(A, 0, 0);
    const b0 = fromEnd ? L - xb : 0, s0 = fromEnd ? L - xe : xb, src = clamp(fromEnd ? L - xb : xb - 1, 0, L - 1);
    if (xb > 0) { if (hor) part(ctx, B, b0, 0, xb, ch); else part(ctx, B, 0, b0, cw, xb); }
    if (xe - xb > 0) {
      ctx.imageSmoothingEnabled = false;
      if (hor) ctx.drawImage(B, src, 0, 1, ch, s0, 0, xe - xb, ch); else ctx.drawImage(B, 0, src, cw, 1, 0, s0, cw, xe - xb);
      ctx.imageSmoothingEnabled = true;
      // the smear thins towards its leading edge
      const e0 = fromEnd ? L - xe : xe, e1 = fromEnd ? L - xb : xb;
      const g = hor ? ctx.createLinearGradient(e0, 0, e1, 0) : ctx.createLinearGradient(0, e0, 0, e1);
      g.addColorStop(0, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; if (hor) ctx.fillRect(s0, 0, xe - xb, ch); else ctx.fillRect(0, s0, cw, xe - xb);
    }
    if (xe < L) {
      const lw = lwOf(I, 0.005), q = fromEnd ? L - xe : xe - lw;
      ctx.globalAlpha = Math.min(1, p * 8); ctx.fillStyle = tAcc(I);
      if (hor) ctx.fillRect(q, 0, lw, ch); else ctx.fillRect(0, q, cw, lw);
    }
  } });

/* ---- flip over: the frame turns over like a card on its middle axis; the new cut is on the back ---- */
trReg('xqFlipOver', { name: '裏返し', en: 'Flip Over', tags: ['pop', 'graphic', 'editorial'], w: 0.8, dur: 0.46, ae: 'cubeTurn',
  plan: rng => ({ vert: rng.chance(0.35), dir: rng.pick([1, -1]) }),
  draw(ctx, A, B, p, I, Q) {
    const { cw, ch } = I, ang = ioc(p) * Math.PI, c = Math.cos(ang), sn = Math.sin(ang), f = Math.abs(c), C = c >= 0 ? A : B, d = Q.dir || 1;
    ctx.fillStyle = J.mix(J.mix(prevBg(I), I.sc.bg, p), '#000000', 0.6); ctx.fillRect(0, 0, cw, ch);
    if (f < 0.006) return;
    // drawn in slices so the far edge is shorter than the near one (a cheap perspective)
    const N = I.allowFilter ? 24 : 12, per = 0.16 * sn * d * (c >= 0 ? 1 : -1);
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N, um = (u0 + u1) / 2 - 0.5, k = 1 - 0.05 * sn + per * um;
      if (Q.vert) { const y0 = ch / 2 + (u0 - 0.5) * ch * f, h = ch * f / N + 0.6, w = cw * k; ctx.drawImage(C, 0, u0 * ch, cw, ch / N, cw / 2 - w / 2, y0, w, h); }
      else { const x0 = cw / 2 + (u0 - 0.5) * cw * f, w = cw * f / N + 0.6, h = ch * k; ctx.drawImage(C, u0 * cw, 0, cw / N, ch, x0, ch / 2 - h / 2, w, h); }
    }
    ctx.globalAlpha = 0.5 * sn; ctx.fillStyle = '#000000';
    if (Q.vert) ctx.fillRect(0, ch / 2 - ch * f / 2, cw, ch * f); else ctx.fillRect(cw / 2 - cw * f / 2, 0, cw * f, ch);
  } });

})();
