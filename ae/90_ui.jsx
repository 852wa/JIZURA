// ================================================================ ScriptUI panel
var JZ_SECTION = 'JIZURA';
function jzGet(key, def) { try { if (app.settings.haveSetting(JZ_SECTION, key)) return decodeURIComponent(app.settings.getSetting(JZ_SECTION, key)); } catch (e) {} return def; }
function jzPut(key, v) { try { app.settings.saveSetting(JZ_SECTION, key, encodeURIComponent(String(v))); } catch (e) {} }

var JZ_SAMPLE = '夜明けの色を/覚えてる\nほどけた声が遠くで鳴った\nねえ、まだ間に合うかな\n*透明*なままじゃ終われない!';

function jzUI(thisObj) {
    var win = (thisObj instanceof Panel) ? thisObj : new Window('palette', 'JIZURA', undefined, { resizeable: true });
    win.orientation = 'column'; win.alignChildren = ['fill', 'top']; win.spacing = 6; win.margins = 10;
    var head = win.add('group'); head.alignChildren = ['left', 'center'];
    var ttl = head.add('statictext', undefined, 'JIZURA 字面  lyric motion'); try { ttl.graphics.font = ScriptUI.newFont(ttl.graphics.font.name, 'BOLD', 14); } catch (e) {}

    var tp = win.add('tabbedpanel'); tp.alignChildren = ['fill', 'top'];
    // ---------------- tab 1: from lyrics
    var t1 = tp.add('tab', undefined, '歌詞から'); t1.orientation = 'column'; t1.alignChildren = ['fill', 'top']; t1.spacing = 6; t1.margins = 8;
    t1.add('statictext', undefined, '歌詞（1行=1フレーズ　/ 区切り　*強調*　行末! インパクト）');
    var lyr = t1.add('edittext', undefined, jzGet('lyrics', JZ_SAMPLE), { multiline: true, wantReturn: true, scrolling: true }); lyr.preferredSize = [340, 150];
    var gT = t1.add('group'); gT.add('statictext', undefined, '曲名'); var eTitle = gT.add('edittext', undefined, jzGet('title', '')); eTitle.preferredSize.width = 120;
    gT.add('statictext', undefined, 'アーティスト'); var eArtist = gT.add('edittext', undefined, jzGet('artist', '')); eArtist.preferredSize.width = 100;
    var bOmk = t1.add('button', undefined, 'おまかせで生成（押すたびに別の演出）');
    bOmk.helpTip = 'スタイル・雰囲気・演出の強さ・配色・シードをまるごとランダムに決めて、新しいコンポを作ります';
    try { bOmk.preferredSize.height = 34; bOmk.graphics.font = ScriptUI.newFont(bOmk.graphics.font.name, 'BOLD', 13); } catch (e) {}
    var gSw = t1.add('group'); gSw.orientation = 'column'; gSw.alignChildren = ['left', 'top']; gSw.spacing = 2;
    var cExtra = gSw.add('checkbox', undefined, '追加分の演出も使う'); cExtra.value = jzGet('extra', '0') === '1';
    cExtra.helpTip = 'オフのときは最初の公開版の演出（356部品・スタイル12種）だけを使います。オンにすると、あとから追加した演出・スタイル・書体も候補になります';
    var cWa = gSw.add('checkbox', undefined, '和風の演出も使う'); cWa.value = jzGet('wa', '1') === '1';
    cWa.helpTip = '提灯・はがき・障子・扇・家紋・青海波・桜の花びらなどの和風グラフィックと、和風のスタイル。オフにすると自動では選ばれません（追加分の判定のあとに適用）';
    function switches() { return { extra: cExtra.value, wa: cWa.value }; }
    var gS = t1.add('group'); gS.add('statictext', undefined, 'スタイル');
    var styleNames = [], i;
    for (i = 0; i < JZ_DATA.styleOrder.length; i++) { var stI = JZ_DATA.styles[JZ_DATA.styleOrder[i]]; styleNames.push(stI.name + (stI.extra || stI.wa ? '  〔' + (stI.extra ? '追加' : '') + (stI.extra && stI.wa ? '・' : '') + (stI.wa ? '和' : '') + '〕' : '')); }
    var ddStyle = gS.add('dropdownlist', undefined, styleNames); ddStyle.selection = parseInt(jzGet('style', '0'), 10) || 0;
    var gC = t1.add('group'); gC.add('statictext', undefined, 'サイズ');
    var sizes = ['アクティブなコンポと同じ', '1920×1080', '1080×1920', '1080×1080', '3840×2160', '1280×720', '1440×1080 (4:3)', '1080×1440 (3:4)'];
    var ddSize = gC.add('dropdownlist', undefined, sizes); ddSize.selection = parseInt(jzGet('size', '1'), 10) || 0;
    gC.add('statictext', undefined, 'fps'); var ddFps = gC.add('dropdownlist', undefined, ['24', '30', '60']); ddFps.selection = parseInt(jzGet('fps', '0'), 10) || 0;
    var gK = t1.add('group'); gK.add('statictext', undefined, '背景');
    var ddKey = gK.add('dropdownlist', undefined, ['通常（スタイルの背景）', 'グリーンバック（合成用）', 'ブラックバック（合成用）']); ddKey.selection = parseInt(jzGet('key', '0'), 10) || 0;
    ddKey.helpTip = 'グリーンバック／ブラックバック：白い文字と演出だけを単色の背景の上に作ります（背景の模様・紙・粒子・周辺減光なし）。グリーンはキーイング、ブラックはスクリーン合成で抜けます';

    var pT = t1.add('panel', undefined, 'タイミング'); pT.alignChildren = ['left', 'top']; pT.margins = 10;
    var rAuto = pT.add('radiobutton', undefined, '自動（文字数・BPM から） / LRCの時刻');
    var rLayer = pT.add('radiobutton', undefined, '選択レイヤーのマーカーを行頭に使う');
    var rComp = pT.add('radiobutton', undefined, 'コンポマーカーを行頭に使う');
    var tm = jzGet('timing', 'auto'); rAuto.value = tm === 'auto'; rLayer.value = tm === 'layer'; rComp.value = tm === 'comp';
    var gB = pT.add('group'); gB.add('statictext', undefined, 'BPM'); var eBpm = gB.add('edittext', undefined, jzGet('bpm', '')); eBpm.preferredSize.width = 50;
    gB.add('statictext', undefined, '行の長さ'); var eScale = gB.add('edittext', undefined, jzGet('lineScale', '1')); eScale.preferredSize.width = 40;
    var cAudio = pT.add('checkbox', undefined, '選択中の音声レイヤーを新しいコンポに入れる'); cAudio.value = jzGet('audio', '1') === '1';

    var pF = t1.add('panel', undefined, '演出'); pF.alignChildren = ['fill', 'top']; pF.margins = 10;
    var gM = pF.add('group'); gM.add('statictext', undefined, '雰囲気').preferredSize.width = 86;
    var moodNames = ['標準（すべての手法を使う）'];
    for (i = 0; i < JZ_DATA.moodOrder.length; i++) moodNames.push(JZ_DATA.moods[JZ_DATA.moodOrder[i]].name);
    var ddMood = gM.add('dropdownlist', undefined, moodNames); ddMood.selection = parseInt(jzGet('mood', '0'), 10) || 0;
    ddMood.helpTip = '雰囲気ごとに使うレイアウト・登場・退場の手法が絞られます（シードで再現）';
    function slider(parent, label, key, def) {
        var g = parent.add('group'); g.add('statictext', undefined, label).preferredSize.width = 86;
        var v = parseFloat(jzGet(key, String(def)));
        var s = g.add('slider', undefined, v, 0, 100); s.preferredSize.width = 170;
        var t = g.add('statictext', undefined, String(Math.round(v))); t.preferredSize.width = 30;
        s.onChanging = function () { t.text = String(Math.round(s.value)); };
        s.key = key; s.lbl = t; return s;
    }
    var sMotion = slider(pF, '動きの強さ', 'motion', 70), sGlitch = slider(pF, 'グリッチ', 'glitch', 55), sChroma = slider(pF, '色ズレ', 'chroma', 70);
    var sDecor = slider(pF, '装飾の量', 'decor', 50), sDensity = slider(pF, 'カットの細かさ', 'density', 55), sTexture = slider(pF, '質感', 'texture', 60), sBg = slider(pF, '背景の切替', 'bgSwitch', 35);
    var gO = pF.add('group');
    var cTwos = gO.add('checkbox', undefined, '2コマ打ち'); cTwos.value = jzGet('twos', '1') === '1';
    var cFlash = gO.add('checkbox', undefined, 'フラッシュ'); cFlash.value = jzGet('flash', '1') === '1';
    gO.add('statictext', undefined, 'HUD'); var ddHud = gO.add('dropdownlist', undefined, ['スタイル次第', '表示', '非表示']); ddHud.selection = parseInt(jzGet('hud', '0'), 10) || 0;
    var gSeed = t1.add('group'); gSeed.add('statictext', undefined, 'シード');
    var eSeed = gSeed.add('edittext', undefined, jzGet('seed', '20260922')); eSeed.preferredSize.width = 110;
    var bShuffle = gSeed.add('button', undefined, 'シャッフル');
    bShuffle.onClick = function () { eSeed.text = String(Math.floor(Math.random() * 999999999)); };

    var pP = t1.add('panel', undefined, 'アクセント・ズレ色'); pP.alignChildren = ['fill', 'top']; pP.margins = 10; pP.spacing = 6;
    var gP1 = pP.add('group');
    var cPal = gP1.add('checkbox', undefined, 'スタイルの色を上書き'); cPal.value = jzGet('palOn', '0') === '1';
    var bPal = gP1.add('button', undefined, 'ランダム配色');
    bPal.helpTip = '背景に合うアクセント色とズレ色A/Bをランダムに選びます（明るさは背景に合わせて自動調整）';
    var gP2 = pP.add('group'); gP2.spacing = 10;
    function colorField(label, key) {
        var g = gP2.add('group'); g.orientation = 'column'; g.alignChildren = ['left', 'top']; g.spacing = 2;
        g.add('statictext', undefined, label);
        var row = g.add('group'); row.spacing = 4;
        var sw = row.add('group'); sw.preferredSize = [16, 16];
        var e = row.add('edittext', undefined, jzGet('pal_' + key, '')); e.characters = 8;
        var f = { e: e, sw: sw, key: key };
        e.onChange = function () { var h = jzCleanHex(e.text); if (h) { e.text = h; cPal.value = true; } paint(f); };
        return f;
    }
    function paint(f) {
        var h = jzCleanHex(f.e.text); if (!h) return;
        try { var c = jzHex(h); f.sw.graphics.backgroundColor = f.sw.graphics.newBrush(f.sw.graphics.BrushType.SOLID_COLOR, [c[0], c[1], c[2], 1]); } catch (e) {}
    }
    var fAcc = colorField('アクセント', 'accent'), fGA = colorField('ズレ色A', 'ghostA'), fGB = colorField('ズレ色B', 'ghostB'), palFields = [fAcc, fGA, fGB];
    function curStyle() { return JZ_DATA.styles[JZ_DATA.styleOrder[ddStyle.selection ? ddStyle.selection.index : 0]] || JZ_DATA.styles.noir; }
    function setPal(p) { fAcc.e.text = p.accent; fGA.e.text = p.ghostA; fGB.e.text = p.ghostB; for (var q = 0; q < 3; q++) paint(palFields[q]); }
    function showStylePal() { var sc = curStyle().schemes[0]; setPal({ accent: sc.accent, ghostA: sc.ghostA, ghostB: sc.ghostB }); }
    if (!cPal.value || !jzCleanHex(fAcc.e.text)) showStylePal(); else setPal({ accent: fAcc.e.text, ghostA: fGA.e.text, ghostB: fGB.e.text });
    ddStyle.onChange = function () { if (!cPal.value) showStylePal(); };
    bPal.onClick = function () { setPal(jzRandomPalette(curStyle().schemes[0].bg)); cPal.value = true; status.text = '配色を変更しました — 「コンポを生成する」で反映されます'; };
    cPal.onClick = function () { if (!cPal.value) showStylePal(); };

    var gGo = t1.add('group'); gGo.alignChildren = ['fill', 'center'];
    var bBuild = gGo.add('button', undefined, 'コンポを生成する'); bBuild.alignment = ['fill', 'center'];

    // ---------------- tab 2: from JSON
    var t2 = tp.add('tab', undefined, 'JSONから'); t2.orientation = 'column'; t2.alignChildren = ['fill', 'top']; t2.margins = 8;
    t2.add('statictext', undefined, 'ブラウザ版 JIZURA の「AE用に書き出し」で作った .json を読み込み、', undefined, { multiline: true });
    t2.add('statictext', undefined, '同じタイミング・レイアウト・演出で編集可能なコンポを組みます。', undefined, { multiline: true });
    var cAudio2 = t2.add('checkbox', undefined, '選択中の音声レイヤーも入れる'); cAudio2.value = true;
    var bJson = t2.add('button', undefined, 'JSONを選んで生成…');

    // ---------------- tab 3: fonts
    var t3 = tp.add('tab', undefined, 'フォント'); t3.orientation = 'column'; t3.alignChildren = ['fill', 'top']; t3.margins = 8;
    t3.add('statictext', undefined, 'PostScript名で指定（見つからない指定はここに落ちます）', undefined, { multiline: true });
    function fontRow(label, key, def) { var g = t3.add('group'); g.add('statictext', undefined, label).preferredSize.width = 70; var e = g.add('edittext', undefined, jzGet('font_' + key, def)); e.preferredSize.width = 230; return e; }
    var fDisplay = fontRow('見出し', 'display', 'YuGothic-Bold'), fSerif = fontRow('明朝', 'serif', 'YuMincho-Demibold'), fBody = fontRow('小さな文字', 'body', 'YuGothic-Medium'), fMono = fontRow('等幅', 'mono', 'Consolas');
    var cForce = t3.add('checkbox', undefined, '常にこの4書体を使う（自動選択しない）'); cForce.value = jzGet('forceFonts', '0') === '1';
    var bPick = t3.add('button', undefined, '選択中のテキストレイヤーの書体を「見出し」に');
    bPick.onClick = function () {
        var c = app.project.activeItem;
        if (!(c instanceof CompItem) || !c.selectedLayers.length) { alert('テキストレイヤーを選択してください'); return; }
        try { fDisplay.text = c.selectedLayers[0].property('ADBE Text Properties').property('ADBE Text Document').value.font; } catch (e) { alert('テキストレイヤーではありません'); }
    };
    t3.add('statictext', undefined, 'Noto Sans JP / Noto Serif JP / Dela Gothic One などが入っていれば自動で使います（AE 2024以降）。', undefined, { multiline: true });

    var status = win.add('statictext', undefined, '準備OK', { truncate: 'end' });
    tp.selection = t1;

    function roles() {
        jzPut('font_display', fDisplay.text); jzPut('font_serif', fSerif.text); jzPut('font_body', fBody.text); jzPut('font_mono', fMono.text); jzPut('forceFonts', cForce.value ? '1' : '0');
        return { display: fDisplay.text, serif: fSerif.text, body: fBody.text, mono: fMono.text, __force: cForce.value };
    }
    function audioSel(on) {
        var c = app.project.activeItem;
        if (!on || !(c instanceof CompItem) || !c.selectedLayers.length) return null;
        var L = c.selectedLayers[0];
        try { if (L.hasAudio && L.source) return { item: L.source, start: L.startTime }; } catch (e) {}
        return null;
    }
    function report(comp, t0, label) {
        var s = (label ? label + '  ' : '') + (comp ? comp.name : '') + ' — ' + ((new Date().getTime() - t0) / 1000).toFixed(1) + 's';
        if (JZLOG.length) { s += ' / 注意 ' + JZLOG.length + '件'; alert('JIZURA：生成しましたが、一部に注意があります：\n\n' + JZLOG.slice(0, 14).join('\n')); }
        status.text = s;
    }

    function moodKey() { var ix = ddMood.selection ? ddMood.selection.index : 0; return ix > 0 ? JZ_DATA.moodOrder[ix - 1] : null; }
    function doBuild(label) {
        var t0 = new Date().getTime();
        jzPut('mood', ddMood.selection ? ddMood.selection.index : 0); jzPut('palOn', cPal.value ? '1' : '0');
        for (var pf = 0; pf < palFields.length; pf++) jzPut('pal_' + palFields[pf].key, palFields[pf].e.text);
        jzPut('lyrics', lyr.text); jzPut('title', eTitle.text); jzPut('artist', eArtist.text); jzPut('style', ddStyle.selection.index);
        jzPut('size', ddSize.selection.index); jzPut('fps', ddFps.selection.index); jzPut('timing', rLayer.value ? 'layer' : rComp.value ? 'comp' : 'auto');
        jzPut('bpm', eBpm.text); jzPut('lineScale', eScale.text); jzPut('audio', cAudio.value ? '1' : '0'); jzPut('seed', eSeed.text);
        jzPut('twos', cTwos.value ? '1' : '0'); jzPut('flash', cFlash.value ? '1' : '0'); jzPut('hud', ddHud.selection.index);
        jzPut('extra', cExtra.value ? '1' : '0'); jzPut('wa', cWa.value ? '1' : '0'); jzPut('key', ddKey.selection.index);
        var sl = [sMotion, sGlitch, sChroma, sDecor, sDensity, sTexture, sBg]; for (var k = 0; k < sl.length; k++) jzPut(sl[k].key, sl[k].value);
        var active = app.project.activeItem, W = 1920, H = 1080, fps = [24, 30, 60][ddFps.selection.index], dur = null;
        var sz = ddSize.selection.index;
        if (sz === 0) { if (active instanceof CompItem) { W = active.width; H = active.height; fps = active.frameRate; } }
        else { var wh = sizes[sz].split('×'); W = parseInt(wh[0], 10); H = parseInt(wh[1], 10); }
        var starts = null, mk, j;
        if (rLayer.value || rComp.value) {
            if (!(active instanceof CompItem)) { alert('マーカーを使うには、コンポを開いてください'); return; }
            try {
                if (rLayer.value) { if (!active.selectedLayers.length) { alert('マーカーのあるレイヤーを選択してください'); return; } mk = active.selectedLayers[0].property('ADBE Marker'); }
                else mk = active.markerProperty;
                starts = []; for (j = 1; j <= mk.numKeys; j++) starts.push(mk.keyTime(j));
                if (!starts.length) { alert('マーカーが見つかりません'); return; }
                dur = active.duration;
            } catch (e) { alert('マーカーを読めませんでした: ' + e.toString()); return; }
        }
        var au = audioSel(cAudio.value); if (au && !dur) dur = null;
        var sw = switches(), en = jzMoodEnabled(moodKey(), parseInt(eSeed.text, 10) || 1, sw);
        var o = {
            lyrics: lyr.text, title: eTitle.text, artist: eArtist.text, style: JZ_DATA.styleOrder[ddStyle.selection.index], seed: parseInt(eSeed.text, 10) || 1,
            fx: { motion: sMotion.value / 100, glitch: sGlitch.value / 100, chroma: sChroma.value / 100, decor: sDecor.value / 100, density: sDensity.value / 100, texture: sTexture.value / 100, bgSwitch: sBg.value / 100, onTwos: cTwos.value, flash: cFlash.value, hud: false },
            width: W, height: H, fps: fps, bpm: parseFloat(eBpm.text) || 0, starts: starts, enabled: en, offset: 0.4, lineScale: parseFloat(eScale.text) || 1, duration: dur,
            extra: sw.extra, wa: sw.wa
        };
        var st = JZ_DATA.styles[o.style];
        o.fx.hud = ddHud.selection.index === 1 ? true : ddHud.selection.index === 2 ? false : !!st.hud;
        var plan;
        try { plan = jzMakePlan(o); } catch (e1) { alert('構成の計算でエラー: ' + e1.toString() + (e1.line ? ' (line ' + e1.line + ')' : '')); return; }
        if (!plan.cuts.length) { alert('歌詞が空です'); return; }
        plan.hud = o.fx.hud;
        if (cPal.value) {
            var pal = { accent: jzCleanHex(fAcc.e.text), ghostA: jzCleanHex(fGA.e.text), ghostB: jzCleanHex(fGB.e.text) };
            if (!pal.accent && !pal.ghostA && !pal.ghostB) jzWarn('配色の値が読めないため、スタイルの色のままにしました（#RRGGBB 形式で入力）');
            else plan.style = jzStyleWithPalette(plan.style, pal);
        }
        var keyI = ddKey.selection ? ddKey.selection.index : 0;
        if (keyI > 0) { plan.keyBg = keyI === 1 ? 'green' : 'black'; plan.style = jzKeyStyle(plan.style); }
        status.text = '生成中… (' + plan.cuts.length + ' cuts)';
        app.beginUndoGroup('JIZURA build');
        var comp = null;
        try { comp = jzBuild(plan, { roles: roles(), audioItem: au ? au.item : null, audioStart: au ? au.start : 0 }); }
        catch (e2) { alert('生成中にエラー: ' + e2.toString() + (e2.line ? ' (line ' + e2.line + ')' : '')); }
        finally { app.endUndoGroup(); }
        report(comp, t0, label);
    }
    bBuild.onClick = function () { doBuild(''); };

    // おまかせ: roll every setting on the panel, show it, then build a fresh comp
    bOmk.onClick = function () {
        var r = jzOmakase(moodKey(), JZ_DATA.styleOrder[ddStyle.selection ? ddStyle.selection.index : 0], null, switches());
        ddStyle.selection = jzIndexOf(JZ_DATA.styleOrder, r.style);
        ddMood.selection = jzIndexOf(JZ_DATA.moodOrder, r.mood) + 1;
        var map = [[sMotion, 'motion'], [sGlitch, 'glitch'], [sChroma, 'chroma'], [sDecor, 'decor'], [sDensity, 'density'], [sTexture, 'texture'], [sBg, 'bgSwitch']];
        for (var q = 0; q < map.length; q++) if (r.fx[map[q][1]] != null) { map[q][0].value = Math.round(r.fx[map[q][1]] * 100); map[q][0].lbl.text = String(map[q][0].value); }
        cTwos.value = r.onTwos; cFlash.value = r.flash; ddHud.selection = r.hud; eSeed.text = String(r.seed);
        if (r.palette) { setPal(r.palette); cPal.value = true; } else { cPal.value = false; showStylePal(); }
        doBuild('おまかせ：' + JZ_DATA.styles[r.style].name + ' × ' + JZ_DATA.moods[r.mood].name + (r.palette ? '・ランダム配色' : ''));
    };

    bJson.onClick = function () {
        var f = File.openDialog('JIZURA AE JSON', 'JSON:*.json', false);
        if (!f) return;
        var t0 = new Date().getTime(), plan;
        try { f.encoding = 'UTF-8'; f.open('r'); var s = f.read(); f.close(); plan = jzParseJSON(s); }
        catch (e) { alert('JSONを読めませんでした: ' + e.toString()); return; }
        if (!plan || !plan.cuts || !plan.style) { alert('JIZURA の AE用JSON ではないようです'); return; }
        var note = plan.aeNote ? String(plan.aeNote) : '';
        if (plan.version !== 2 && !note) note = '';
        var au = audioSel(cAudio2.value);
        status.text = '生成中… (' + plan.cuts.length + ' cuts)';
        app.beginUndoGroup('JIZURA build from JSON');
        var comp = null;
        try { comp = jzBuild(plan, { roles: roles(), audioItem: au ? au.item : null, audioStart: au ? au.start : 0 }); }
        catch (e2) { alert('生成中にエラー: ' + e2.toString() + (e2.line ? ' (line ' + e2.line + ')' : '')); }
        finally { app.endUndoGroup(); }
        if (JZ_FALLBACKS > 0) note = (note ? note + ' / ' : '') + 'このパネルに無い表現 ' + JZ_FALLBACKS + ' 箇所を、近い表現で作りました';
        report(comp, t0, note ? '置換あり' : '');
        if (note) status.helpTip = note;
    };

    win.onResizing = win.onResize = function () { try { this.layout.resize(); } catch (e) {} };
    if (win instanceof Window) { win.center(); win.show(); } else { win.layout.layout(true); win.layout.resize(); }
    return win;
}
