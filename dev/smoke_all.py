"""Render every registered expression in many combinations and report console problems / exceptions / slow frames.
usage: python3 dev/smoke_all.py [page=t_all]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
PAGE = sys.argv[1] if len(sys.argv) > 1 else 't_all'
JS = r"""
async () => {
  const out = { problems: [], slow: [], counts: T.counts() };
  const warn = console.warn, err = console.error; let cur = '';
  console.warn = (...a) => { out.problems.push(cur + ' :: ' + a.map(String).join(' ').slice(0, 200)); };
  console.error = (...a) => { out.problems.push(cur + ' :: ERR ' + a.map(String).join(' ').slice(0, 200)); };
  const texts = ['愛', '透明', 'ほどけた声が鳴った', 'Hello world', 'ねえ、まだ間に合うかな'];
  const aspects = ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'];
  const styles = J.STYLE_ORDER;
  const cv = document.createElement('canvas'); const ctx = cv.getContext('2d');
  const r = new J.Renderer();
  const run = (label, ovs, aspect, style, n = 7) => {
    cur = label;
    const lines = ovs.map((o, i) => texts[i % texts.length]);
    const p = Object.assign(J.defaultProject(), { extra: true, lyrics: lines.join('\n'), style, aspect, seed: 1 + (label.length * 7919) % 99991,
      overrides: Object.fromEntries(ovs.map((o, i) => [i, Object.assign({ single: true }, o)])),
      timing: { bpm: 0, offset: 0, snap: false, tail: 0.5, lineTimes: Object.fromEntries(lines.map((_, i) => [i, i * 2.4])), lineScale: 1 } });
    p.fx = Object.assign(J.defaultProject().fx, { hud: 'on', glitch: 0.8, decor: 0.9 });
    let plan;
    try { plan = J.plan(p, { beats: Array.from({ length: 60 }, (_, i) => i * 0.5), duration: 30, energy: Array.from({ length: 300 }, (_, i) => 0.5 + 0.5 * Math.sin(i / 3)), energyRate: 10 }); }
    catch (e) { out.problems.push(label + ' :: PLAN ' + e.message); return; }
    const [W, H] = [plan.W, plan.H]; cv.width = Math.round(W * 0.2); cv.height = Math.round(H * 0.2);
    for (const c of plan.cuts) {
      for (let k = 0; k < n; k++) {
        const t = c.start + (c.end - c.start) * (k + 0.5) / n;
        const t0 = performance.now();
        try { r.frame(ctx, plan, t, { scale: 0.2 }); } catch (e) { out.problems.push(label + ' :: THROW ' + e.message + ' @' + t.toFixed(2)); }
        const dt = performance.now() - t0; if (dt > 60) out.slow.push(label + ' ' + dt.toFixed(0) + 'ms');
      }
    }
  };
  const G = (g) => J.order(g).filter(k => !(J.registry(g)[k] || {}).special);
  for (const k of G('layout')) for (const a of aspects) run('layout.' + k + ' ' + a, texts.map(() => ({ layout: k })), a, styles[(k.length + a.length) % styles.length], 4);
  for (const k of G('enter')) run('enter.' + k, texts.map((_, i) => ({ enter: k, layout: ['center', 'vcols', 'mixed', 'labels', 'huge'][i] })), aspects[k.length % 6], 'noir', 6);
  for (const k of G('exit')) run('exit.' + k, texts.map((_, i) => ({ exit: k, layout: ['center', 'vcols', 'mixed', 'labels', 'huge'][i] })), aspects[k.length % 6], 'caution', 6);
  for (const k of G('hold')) run('hold.' + k, texts.map((_, i) => ({ hold: k, layout: ['center', 'vcols', 'mixed', 'labels', 'huge'][i] })), aspects[k.length % 6], 'paper', 5);
  for (const k of G('decor')) run('decor.' + k, texts.map((_, i) => ({ decor: [k], layout: ['center', 'vcols', 'mixed', 'labels', 'huge'][i] })), aspects[k.length % 6], styles[k.length % styles.length], 5);
  for (const k of G('treat')) run('treat.' + k, texts.map((_, i) => ({ treat: k, layout: ['center', 'vcols', 'mixed', 'stack', 'huge'][i] })), aspects[k.length % 6], 'noir', 4);
  for (const k of G('bg')) run('bg.' + k, texts.map((_, i) => ({ bg: k })), aspects[k.length % 6], styles[k.length % styles.length], 4);
  for (const k of G('cam')) run('cam.' + k, texts.map((_, i) => ({ cam: k })), aspects[k.length % 6], 'hud', 5);
  for (const k of G('trans')) run('trans.' + k, texts.map((_, i) => (i ? { trans: k } : {})), aspects[k.length % 6], styles[k.length % styles.length], 8);
  for (const k of J.STYLE_ORDER) run('style.' + k, texts.map(() => ({})), aspects[k.length % 6], k, 5);
  // 逐字 (word by word): the karaoke layout must light the words even when a hold / treat also wants the glyphs,
  // and the character-to-word map must follow the text actually drawn (a wrap), never the cut's raw text
  {
    const lyr = '<00:01.00>ほ<00:01.40>どけた<00:02.00>声<00:02.60>を<00:03.00>唄う<00:03.50>長<00:04.00>い<00:04.50>行<00:05.00>の<00:05.50>歌'
      + '\n[00:08.00]ねえ[00:08.60]まだ[00:09.20]間に合うかな';
    const p = Object.assign(J.defaultProject(), { lyrics: lyr, title: 't', artist: 'a', seed: 5, extra: true,
      timing: { bpm: 0, offset: 0.4, snap: false, tail: 0.5, lineScale: 1 } });
    let plan; try { plan = J.plan(p, null); } catch (e) { out.problems.push('karaoke :: PLAN ' + e.message); plan = null; }
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d'); const rr = new J.Renderer();
    const orig = J.drawItem; let lit = 0, checked = 0;
    if (plan) for (const c of plan.cuts) {
      if (!c.words || !c.words.length) continue;
      for (const hold of ['still', 'jitter', 'grow']) {
        c.layout = 'karaoke'; c.hold = hold; c.enter = 'cut'; c.exit = 'cut'; c.treat = 'none'; c.decor = [];
        c.params = Object.assign({}, c.params, { per: 8 });
        const mid = c.start + (c.end - c.start) * 0.6;
        let cap = null;
        J.drawItem = (env, it) => { const cf = it.charFn; if (cf && !cap) { cap = []; const lay = J.layoutText(it); for (const g of lay) { const o = cf(g.i, g, lay.N); cap.push(o && o.color ? 1 : 0); } } return orig(env, it); };
        try { rr.frame(ctx, plan, mid, { scale: 0.2 }); } catch (e) { out.problems.push('karaoke :: THROW ' + e.message + ' @' + c.text); }
        J.drawItem = orig;
        cur = 'karaoke ' + hold + ' ' + JSON.stringify(c.text);
        if (!cap) { out.problems.push('karaoke :: no charFn for ' + JSON.stringify(c.text) + ' (' + hold + ')'); continue; }
        checked++;
        if (cap.indexOf(1) < 0) out.problems.push('karaoke :: nothing lit for ' + JSON.stringify(c.text) + ' (' + hold + ')');
        else lit++;
        // a cut with several words must not light all of them at once (one word is fine: it is the whole cut)
        const litN = cap.filter(x => x).length;
        if (c.words.length >= 2 && litN === cap.length) out.problems.push('karaoke :: every word lit at once for ' + JSON.stringify(c.text) + ' (' + hold + ')');
      }
    }
    if (checked < 2) out.problems.push('karaoke :: only ' + checked + ' timed cuts reached the renderer');
    if (lit !== checked) out.problems.push('karaoke :: ' + lit + '/' + checked + ' cuts lit a word');
    // 行のうしろに残った [mm:ss.xx] は次の行の始まりを書いたもので、歌詞ではない（画面に時刻が出ていた不具合）。
    // その行が二度出ることもない。空行（うたい出しの間）も保たれること。
    {
      // 3行めは2行めと同じ時刻＝双语の訳なので落ちる（1行1回）→ 2行
      const raw = '[00:19.59]深陷孤独 即使怅然落泪[00:23.25]\n[00:23.26]蝶[00:23.81]の[00:24.02]羽[00:24.26]根[00:24.49]で[00:24.87]\n[00:23.26]挥舞粉蝶般的羽翼[00:25.13]';
      const pp = J.parseLyrics(raw).lines;
      const want = [[19.59, null, '深陷孤独 即使怅然落泪'], [23.26, 5, '蝶の羽根で']];
      cur = 'trailing tag';
      if (pp.length !== want.length) out.problems.push('trailing tag :: ' + pp.length + ' lines, want ' + want.length);
      else for (let i = 0; i < want.length; i++) {
        if (pp[i].lrc !== want[i][0]) out.problems.push('trailing tag :: line ' + i + ' time ' + pp[i].lrc + ', want ' + want[i][0]);
        if (pp[i].text !== want[i][2]) out.problems.push('trailing tag :: line ' + i + ' text ' + JSON.stringify(pp[i].text) + ', want ' + JSON.stringify(want[i][2]));
        const n = pp[i].kb ? pp[i].kb.words.length : null;
        if (n !== want[i][1]) out.problems.push('trailing tag :: line ' + i + ' words ' + n + ', want ' + want[i][1]);
      }
      // どのカットの文字にも時刻が残っていないこと（画面に出るのは歌詞だけ）
      const p0 = Object.assign(J.defaultProject(), { lyrics: raw, title: '', artist: '', timing: { bpm: 0, offset: 0.4, snap: false, tail: 0.5, lineScale: 1 } });
      const pl0 = J.plan(p0, null);
      const dirty = [];
      for (const c of pl0.cuts) if (/\[\d+:\d|\]\s*$|<\d+:\d/.test(c.text || '')) dirty.push(c.text);
      for (const l of pl0.lines) if (/\[\d+:\d|\]\s*$|<\d+:\d/.test(l.text || '')) dirty.push(l.text);
      if (dirty.length) out.problems.push('trailing tag :: ' + dirty.length + ' text(s) still show a timestamp: ' + JSON.stringify(dirty));
      // 書き出した .lrc を読み直しても同じ表示になること
      const lrc = J.lrcText(p0, null, null).trim().split('\n');
      if (lrc.length !== want.length) out.problems.push('trailing tag :: exported ' + lrc.length + ' rows, want ' + want.length + ': ' + JSON.stringify(lrc));
      const back = J.parseLyrics(lrc.join('\n')).lines;
      if (back.length !== want.length) out.problems.push('trailing tag :: re-read ' + back.length + ' lines, want ' + want.length);
      else for (let i = 0; i < want.length; i++) {
        if (back[i].text !== want[i][2]) out.problems.push('trailing tag :: re-read line ' + i + ' text ' + JSON.stringify(back[i].text) + ', want ' + JSON.stringify(want[i][2]));
        const n = back[i].kb ? back[i].kb.words.length : null;
        if (n !== want[i][1]) out.problems.push('trailing tag :: re-read line ' + i + ' words ' + n + ', want ' + want[i][1]);
      }
      // 行末タグが無い素の LRC は今までどおり（1行1回・時刻も本文も変わらない）
      const plain0 = J.parseLyrics('[00:01.00]hello\n[00:02.00]world').lines;
      if (plain0.length !== 2 || plain0[0].text !== 'hello' || plain0[1].text !== 'world' || plain0[0].lrc !== 1 || plain0[1].lrc !== 2) out.problems.push('trailing tag :: a plain LRC changed: ' + JSON.stringify(plain0.map(l => [l.lrc, l.text])));
      // 空行は「まとまり」の区切りのまま（最後の行は上の行と同じ時刻＝双语の訳なので落ちる → 2行）
      const bb = J.parseLyrics('[00:19.59]深陷孤独 即使怅然落泪[00:23.25]\n\n[00:23.26]蝶[00:23.81]の[00:24.87]\n\n[00:23.26]挥舞粉蝶般的羽翼[00:25.13]').lines;
      if (bb.length !== 2 || !bb[1].gapBefore || bb[1].text !== '蝶の') out.problems.push('trailing tag :: blank lines ' + JSON.stringify(bb.map(l => [l.text, l.gapBefore])));
      // 双语（同じフレーズを2つの言語で書いた歌詞）: 上の行がまだ歌っているあいだに始まる行は訳なので捨てる（1行1回）
      {
        const bi = '[00:19.59]孤[00:19.80]独[00:20.25]の[00:20.50]中[00:21.15] [00:21.15]泣[00:21.61]い[00:22.08]て[00:22.58]も[00:23.07]\n'
          + '[00:19.59]深陷孤独 即使怅然落泪[00:23.25]\n'
          + '[00:23.26]蝶[00:23.81]の[00:24.02]羽[00:24.26]根[00:24.49]で[00:24.87]\n'
          + '[00:23.26]挥舞粉蝶般的羽翼[00:25.13]';
        cur = 'bilingual';
        const bl = J.parseLyrics(bi).lines;
        if (bl.length !== 2) out.problems.push('bilingual :: ' + bl.length + ' lines, want 2: ' + JSON.stringify(bl.map(l => [l.lrc, l.text])));
        else {
          if (bl[0].lrc !== 19.59 || bl[0].text !== '孤独の中泣いても' || !bl[0].kb || bl[0].kb.words.length !== 8) out.problems.push('bilingual :: row 0 ' + JSON.stringify([bl[0].lrc, bl[0].text, bl[0].kb && bl[0].kb.words.length]));
          if (bl[1].lrc !== 23.26 || bl[1].text !== '蝶の羽根で' || !bl[1].kb || bl[1].kb.words.length !== 5) out.problems.push('bilingual :: row 1 ' + JSON.stringify([bl[1].lrc, bl[1].text, bl[1].kb && bl[1].kb.words.length]));
          if (bl[1].gapBefore) out.problems.push('bilingual :: a dropped row left a gap behind');
        }
        // plan にも訳は出ない（画面に出るのは最初の行だけ）
        const p1 = Object.assign(J.defaultProject(), { lyrics: bi, title: '', artist: '', timing: { bpm: 0, offset: 0.4, snap: false, tail: 0.5, lineScale: 1 } });
        const pl1 = J.plan(p1, null);
        if (pl1.lines.length !== 2) out.problems.push('bilingual :: plan has ' + pl1.lines.length + ' lines, want 2');
        else {
          if (pl1.lines[0].text !== '孤独の中泣いても' || pl1.lines[1].text !== '蝶の羽根で') out.problems.push('bilingual :: plan texts ' + JSON.stringify(pl1.lines.map(l => l.text)));
          if (Math.abs(pl1.lines[1].start - 23.26) > 1e-6) out.problems.push('bilingual :: the next phrase moved to ' + pl1.lines[1].start);
        }
        // 書き出した .lrc を読み直しても訳は出ない
        const blrc = J.lrcText(p1, null, null).trim().split('\n');
        if (blrc.length !== 2) out.problems.push('bilingual :: exported ' + blrc.length + ' rows, want 2: ' + JSON.stringify(blrc));
        if (J.parseLyrics(blrc.join('\n')).lines.length !== 2) out.problems.push('bilingual :: the exported .lrc reads back with the translation');
        // 時刻が同じ行だけが対（それより後に始まる行は次のフレーズなので残す）
        const bp = J.parseLyrics('[00:05.00]Always with me\n[00:05.00]いつも何度でも').lines;
        if (bp.length !== 1 || bp[0].text !== 'Always with me') out.problems.push('bilingual :: a plain pair ' + JSON.stringify(bp.map(l => [l.lrc, l.text])));
        const bl2 = J.parseLyrics('[00:05.00]Always with me\n[00:05.60]いつも何度でも').lines;
        if (bl2.length !== 2) out.problems.push('bilingual :: a plain lyric lost a row: ' + JSON.stringify(bl2.map(l => [l.lrc, l.text])));
        // 上の行が終わってから始まる行は次のフレーズ（訳ではない）
        const bn = J.parseLyrics('[00:05.00]Always with me[00:08.00]\n[00:08.00]いつも何度でも').lines;
        if (bn.length !== 2 || bn[0].text !== 'Always with me' || bn[1].text !== 'いつも何度でも') out.problems.push('bilingual :: the next phrase was dropped: ' + JSON.stringify(bn.map(l => [l.lrc, l.text])));
      }
      // 中央を空ける + 逐字: 半分に割ったカットも自分の半分の語と時刻を持つ（素の chunks に置き換わらない／
      // 2つ目の半分が1つ目の時刻で歌わない）
      {
        cur = 'karaoke split';
        const p2 = Object.assign(J.defaultProject(), { lyrics: '<00:01.00>ほ<00:01.40>どけ<00:02.00>た<00:02.60>声<00:03.00>が<00:04.00>鳴<00:05.00>った', title: '', artist: '', extra: true, centerFree: true,
          timing: { bpm: 0, offset: 0.4, snap: false, tail: 0.5, lineScale: 1 } });
        let pl2 = null;
        try { pl2 = J.plan(p2, null); } catch (e) { out.problems.push('karaoke split :: PLAN ' + e.message); }
        if (pl2) {
          const kc = pl2.cuts.filter(c => c.karaoke && c.karaoke.length);
          if (!kc.length) out.problems.push('karaoke split :: no timed cut after 中央を空ける');
          for (const c of kc) {
            const last = c.words[c.words.length - 1];
            const whole = c.words.join('').replace(/[ \u3000]/g, '');
            // 語はこのカットが描く文字そのもの（素の chunks に置き換わっていない）
            if (whole !== c.text.replace(/[ \u3000]/g, ''))
              out.problems.push('karaoke split :: words ' + JSON.stringify(c.words) + ' do not spell the cut ' + JSON.stringify(c.text));
            if (c.karaoke.length !== c.words.length + 1) out.problems.push('karaoke split :: ' + c.karaoke.length + ' times for ' + c.words.length + ' words');
            if (c.karaoke.some((t, i) => i && t < c.karaoke[i - 1] - 1e-6)) out.problems.push('karaoke split :: times out of order ' + JSON.stringify(c.karaoke));
            if (String(last) === '' || last == null) out.problems.push('karaoke split :: an empty last word ' + JSON.stringify(c.words));
          }
          // 半分が語の途中で切れるとき: はみ出した尾はカットが描かない文字なので、語から外す
          // （語を文字ごと当てる wkChars と AE の語レイヤーの両方が、描かない文字を見てはいけない）
          {
            const p3 = Object.assign(J.defaultProject(), { lyrics: '<00:00.40>孤独<00:00.90>ねえ<00:01.50>ほ<00:01.90>ン', title: '', artist: '', extra: true, centerFree: true,
              timing: { bpm: 0, offset: 0.4, snap: false, tail: 0.5, lineScale: 1 } });
            let pl3 = null;
            try { pl3 = J.plan(p3, null); } catch (e) { out.problems.push('karaoke split :: PLAN ' + e.message); }
            if (pl3) {
              const kc3 = pl3.cuts.filter(c => c.karaoke && c.karaoke.length);
              if (!kc3.length) out.problems.push('karaoke split :: no timed cut when a half ends inside a word');
              for (const c of kc3) {
                const whole = c.words.join('').replace(/[ \u3000]/g, ''), txt = String(c.text).replace(/[ \u3000]/g, '');
                if (whole !== txt) out.problems.push('karaoke split :: words ' + JSON.stringify(c.words) + ' do not spell the cut ' + JSON.stringify(c.text));
                // 描く文字にはすべて語が当たること（wkChars が -1 を返す文字が無い）
                const lay = J.wkChars(c.text, c.words);
                const dead = lay.filter(g => g.w === -1).length;
                if (dead) out.problems.push('karaoke split :: ' + dead + '/' + lay.length + ' drawn character(s) belong to no word in ' + JSON.stringify(c.text));
              }
            }
          }
          // 手で入れた行時刻（LRC の時刻より後）: 語の時刻は絶対時刻なので、カットが始まる前に語を描かない
          {
            const p4 = Object.assign(J.defaultProject(), { lyrics: '<00:01.00>ほ<00:01.40>どけ<00:02.00>た<00:02.60>声<00:03.00>が', title: '', artist: '', extra: true,
              timing: { bpm: 0, offset: 0.4, snap: false, tail: 0.5, lineScale: 1, lineTimes: { 0: 3 } } });
            let pl4 = null;
            try { pl4 = J.plan(p4, null); } catch (e) { out.problems.push('karaoke times :: PLAN ' + e.message); }
            if (pl4) for (const c of pl4.cuts) {
              if (!c.karaoke || !c.karaoke.length) continue;
              if (c.karaoke[0] < c.start - 1e-6) out.problems.push('karaoke times :: cut ' + JSON.stringify(c.text) + ' starts at ' + c.start + ' but its first word is at ' + c.karaoke[0]);
              if (c.karaoke.some((t, i) => i && t < c.karaoke[i - 1] - 1e-6)) out.problems.push('karaoke times :: times out of order ' + JSON.stringify(c.karaoke));
            }
          }
          // 2つ目の半分は1つ目の時刻で歌わない（wordTimes / karaoke を持たない）
          for (const c of pl2.cuts) { const tw = c.companion;
            if (tw && (tw.karaoke || tw.wordTimes))
              out.problems.push('karaoke split :: the twin of ' + JSON.stringify(c.text) + ' kept the first half\'s times');
            if (tw && !tw.text) out.problems.push('karaoke split :: an empty twin for ' + JSON.stringify(c.text));
          }
        }
      }
    }
  }
  // random full plans with everything on
  for (let s = 0; s < 30; s++) run('random#' + s, texts.map(() => ({})), aspects[s % 6], styles[s % styles.length], 6);
  console.warn = warn; console.error = err;
  return out;
}
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://localhost:8765/{PAGE}.html')
        await pg.wait_for_timeout(400)
        await pg.evaluate("p => T.setup(p)", {'lyrics': 'テスト'})
        out = await pg.evaluate(JS)
        print('counts', out['counts'], 'total', sum(out['counts'].values()))
        print('problems', len(out['problems']))
        seen = {}
        for pr in out['problems']:
            key = pr.split(' :: ')[0].split(' ')[0]
            seen.setdefault(key, []).append(pr)
        for k, v in list(seen.items())[:60]: print(' ', len(v), v[0][:260])
        print('slow frames', len(out['slow']), out['slow'][:60])
        print('page errors', errs[:5])
        await b.close()
asyncio.run(main())
