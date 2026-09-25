// ================================================================ builder helpers
var JZLOG = [];
function jzWarn(m) { if (JZLOG.length < 400) JZLOG.push(m); }
// number for expression source; negatives are parenthesised so 'a-' + jzN(-2) never becomes the syntax error 'a--2'
function jzN(x) { var v = Math.round(x * 10000) / 10000; return v < 0 ? '(' + String(v) + ')' : String(v); }

// ---- fonts: map JIZURA font keys to PostScript names, verify when the API exists
var JZ_FONT_CANDIDATES = {
    gothic_black: ['NotoSansJP-Black', 'NotoSansCJKjp-Black', 'SourceHanSansJP-Heavy', 'KozGoPr6N-Heavy', 'HiraginoSans-W8', 'YuGothic-Bold', 'Meiryo-Bold'],
    gothic_bold: ['NotoSansJP-Bold', 'NotoSansCJKjp-Bold', 'SourceHanSansJP-Bold', 'KozGoPr6N-Bold', 'HiraginoSans-W6', 'YuGothic-Bold', 'Meiryo-Bold'],
    gothic_med: ['NotoSansJP-Medium', 'NotoSansCJKjp-Medium', 'SourceHanSansJP-Medium', 'KozGoPr6N-Medium', 'HiraginoSans-W4', 'YuGothic-Medium', 'Meiryo'],
    gothic_light: ['NotoSansJP-Light', 'NotoSansCJKjp-Light', 'KozGoPr6N-Light', 'HiraginoSans-W2', 'YuGothic-Light', 'Meiryo'],
    dela: ['DelaGothicOne-Regular', 'NotoSansJP-Black', 'KozGoPr6N-Heavy', 'YuGothic-Bold'],
    zenkaku: ['ZenKakuGothicNew-Black', 'NotoSansJP-Black', 'KozGoPr6N-Heavy', 'YuGothic-Bold'],
    mincho_black: ['ZenOldMincho-Black', 'NotoSerifJP-Black', 'KozMinPr6N-Heavy', 'HiraMinProN-W6', 'YuMincho-Demibold'],
    mincho_bold: ['NotoSerifJP-Bold', 'NotoSerifCJKjp-Bold', 'SourceHanSerifJP-Bold', 'KozMinPr6N-Bold', 'HiraMinProN-W6', 'YuMincho-Demibold'],
    mincho: ['NotoSerifJP-Medium', 'NotoSerifCJKjp-Medium', 'SourceHanSerifJP-Medium', 'KozMinPr6N-Medium', 'HiraMinProN-W3', 'YuMincho-Regular', 'MS-Mincho'],
    mincho_light: ['NotoSerifJP-Light', 'NotoSerifCJKjp-Light', 'KozMinPr6N-Light', 'HiraMinProN-W3', 'YuMincho-Light', 'YuMincho-Regular'],
    tokumin: ['KaiseiTokumin-ExtraBold', 'ZenOldMincho-Black', 'KozMinPr6N-Heavy', 'YuMincho-Demibold'],
    round: ['MPLUSRounded1c-ExtraBold', 'RoundedMplus1c-Black', 'HiraMaruProN-W4', 'NotoSansJP-Black', 'YuGothic-Bold'],
    pop: ['MochiyPopOne-Regular', 'MPLUSRounded1c-ExtraBold', 'YuGothic-Bold'],
    dot: ['DotGothic16-Regular', 'MS-Gothic', 'YuGothic-Regular'],
    brush: ['YujiSyuku-Regular', 'YuMincho-Demibold'],
    mono: ['IBMPlexMono-Medium', 'Consolas', 'CourierNewPSMT'],
    sansui: ['IBMPlexSansJP-Medium', 'NotoSansJP-Medium', 'YuGothic-Medium', 'Meiryo'],
    reggae: ['ReggaeOne-Regular', 'DelaGothicOne-Regular', 'NotoSansJP-Black', 'YuGothic-Bold'],
    rampart: ['RampartOne-Regular', 'NotoSansJP-Black', 'YuGothic-Bold'],
    potta: ['PottaOne-Regular', 'MochiyPopOne-Regular', 'YuGothic-Bold'],
    kiwi: ['KiwiMaru-Medium', 'MPLUSRounded1c-ExtraBold', 'YuGothic-Medium'],
    klee: ['KleeOne-SemiBold', 'Klee-Demibold', 'Klee-Medium', 'YuMincho-Demibold'],
    shippori: ['ShipporiMinchoB1-ExtraBold', 'ZenOldMincho-Black', 'KozMinPr6N-Heavy', 'HiraMinProN-W6', 'YuMincho-Demibold']
};
var JZ_ROLE_DEFAULT = { display: 'YuGothic-Bold', serif: 'YuMincho-Demibold', body: 'YuGothic-Medium', mono: 'Consolas' };
var JZ_FONT_CACHE = {};
function jzFontExists(ps) {
    if (JZ_FONT_CACHE.hasOwnProperty(ps)) return JZ_FONT_CACHE[ps];
    var ok = null;
    try { if (app.fonts && app.fonts.getFontsByPostScriptName) { var r = app.fonts.getFontsByPostScriptName(ps); ok = !!(r && r.length); } } catch (e) { ok = null; }
    JZ_FONT_CACHE[ps] = ok;
    return ok;
}
function jzRoleOf(key) {
    if (!key) return 'display';
    if (/mincho|tokumin|brush|shippori|klee/.test(key)) return 'serif';
    if (/mono/.test(key)) return 'mono';
    if (/med|light|sansui/.test(key)) return 'body';
    return 'display';
}
// resolve: explicit user role font > key candidates that exist > role default
// JZ_FONT_MISSING collects the keys whose own typeface (the browser's Google Font) is not installed, for the build report
var JZ_FONT_MISSING = {}, JZ_FONT_NOAPI = false;
// ---- lyric language (plan.lang from the browser): Chinese / Korean lyrics are drawn with faces that have their glyphs.
// Per language: key → PostScript candidates (the browser's Google Font first, then OS fonts that always cover the script).
var JZ_LANG = 'ja';
var JZ_LANG_SYS = {
    'zh-Hant': { sansB: ['PingFangTC-Semibold', 'MicrosoftJhengHeiBold', 'NotoSansCJKtc-Bold', 'SourceHanSansTC-Bold'], sans: ['PingFangTC-Regular', 'MicrosoftJhengHeiRegular', 'NotoSansCJKtc-Regular', 'SourceHanSansTC-Regular'],
                 serifB: ['STSongti-TC-Bold', 'NotoSerifCJKtc-Bold', 'SourceHanSerifTC-Bold', 'PMingLiU'], serif: ['STSongti-TC-Regular', 'NotoSerifCJKtc-Regular', 'SourceHanSerifTC-Regular', 'PMingLiU'] },
    'zh-Hans': { sansB: ['PingFangSC-Semibold', 'MicrosoftYaHei-Bold', 'NotoSansCJKsc-Bold', 'SourceHanSansSC-Bold'], sans: ['PingFangSC-Regular', 'MicrosoftYaHei', 'NotoSansCJKsc-Regular', 'SourceHanSansSC-Regular'],
                 serifB: ['STSongti-SC-Bold', 'NotoSerifCJKsc-Bold', 'SourceHanSerifSC-Bold', 'SimSun'], serif: ['STSongti-SC-Regular', 'NotoSerifCJKsc-Regular', 'SourceHanSerifSC-Regular', 'SimSun'] },
    ko: { sansB: ['AppleSDGothicNeo-Bold', 'MalgunGothicBold', 'NotoSansCJKkr-Bold', 'SourceHanSansKR-Bold'], sans: ['AppleSDGothicNeo-Regular', 'MalgunGothic', 'NotoSansCJKkr-Regular', 'SourceHanSansKR-Regular'],
          serifB: ['AppleMyungjo', 'NotoSerifCJKkr-Bold', 'SourceHanSerifKR-Bold', 'Batang'], serif: ['AppleMyungjo', 'NotoSerifCJKkr-Regular', 'SourceHanSerifKR-Regular', 'Batang'] }
};
// [family (for messages), own PostScript names…, system group]
var JZ_LANG_FONTS = {
    'zh-Hant': {
        gothic_black: ['Noto Sans TC', 'NotoSansTC-Black', 'NotoSansTCThin-Black', 'sansB'], gothic_bold: ['Noto Sans TC', 'NotoSansTC-Bold', 'NotoSansTCThin-Bold', 'sansB'],
        gothic_med: ['Noto Sans TC', 'NotoSansTC-Medium', 'NotoSansTCThin-Medium', 'sans'], gothic_light: ['Noto Sans TC', 'NotoSansTC-Light', 'NotoSansTCThin-Light', 'sans'],
        zenkaku: ['Noto Sans TC', 'NotoSansTC-Black', 'NotoSansTCThin-Black', 'sansB'], sansui: ['Noto Sans TC', 'NotoSansTC-Medium', 'NotoSansTCThin-Medium', 'sans'],
        dot: ['Noto Sans TC', 'NotoSansTC-Medium', 'NotoSansTCThin-Medium', 'sans'],
        mincho_black: ['Noto Serif TC', 'NotoSerifTC-Black', 'NotoSerifTCExtraLight-Black', 'serifB'], mincho_bold: ['Noto Serif TC', 'NotoSerifTC-Bold', 'NotoSerifTCExtraLight-Bold', 'serifB'],
        mincho: ['Noto Serif TC', 'NotoSerifTC-Medium', 'NotoSerifTCExtraLight-Medium', 'serif'], mincho_light: ['Noto Serif TC', 'NotoSerifTC-Light', 'NotoSerifTCExtraLight-Light', 'serif'],
        tokumin: ['Noto Serif TC', 'NotoSerifTC-ExtraBold', 'NotoSerifTCExtraLight-ExtraBold', 'serifB'], shippori: ['Noto Serif TC', 'NotoSerifTC-ExtraBold', 'NotoSerifTCExtraLight-ExtraBold', 'serifB'],
        dela: ['WDXL Lubrifont TC', 'WDXLLubrifontTC-Regular', 'NotoSansTC-Black', 'sansB'], round: ['Chiron GoRound TC', 'ChironGoRoundTC-ExtraBold', 'ChironGoRoundTCExtraLight-ExtraBold', 'sansB'],
        pop: ['Huninn', 'Huninn-Regular', 'sansB'], kiwi: ['Huninn', 'Huninn-Regular', 'sans'],
        klee: ['LXGW WenKai TC', 'LXGWWenKaiTC-Bold', 'serifB'], brush: ['LXGW WenKai TC', 'LXGWWenKaiTC-Bold', 'serifB'],
        reggae: ['LXGW Marker Gothic', 'LXGWMarkerGothic-Regular', 'sansB'], rampart: ['LXGW Marker Gothic', 'LXGWMarkerGothic-Regular', 'sansB'], potta: ['LXGW Marker Gothic', 'LXGWMarkerGothic-Regular', 'sansB']
    },
    'zh-Hans': {
        gothic_black: ['Noto Sans SC', 'NotoSansSC-Black', 'NotoSansSCThin-Black', 'sansB'], gothic_bold: ['Noto Sans SC', 'NotoSansSC-Bold', 'NotoSansSCThin-Bold', 'sansB'],
        gothic_med: ['Noto Sans SC', 'NotoSansSC-Medium', 'NotoSansSCThin-Medium', 'sans'], gothic_light: ['Noto Sans SC', 'NotoSansSC-Light', 'NotoSansSCThin-Light', 'sans'],
        zenkaku: ['Noto Sans SC', 'NotoSansSC-Black', 'NotoSansSCThin-Black', 'sansB'], sansui: ['Noto Sans SC', 'NotoSansSC-Medium', 'NotoSansSCThin-Medium', 'sans'],
        dot: ['Noto Sans SC', 'NotoSansSC-Medium', 'NotoSansSCThin-Medium', 'sans'],
        mincho_black: ['Noto Serif SC', 'NotoSerifSC-Black', 'NotoSerifSCExtraLight-Black', 'serifB'], mincho_bold: ['Noto Serif SC', 'NotoSerifSC-Bold', 'NotoSerifSCExtraLight-Bold', 'serifB'],
        mincho: ['Noto Serif SC', 'NotoSerifSC-Medium', 'NotoSerifSCExtraLight-Medium', 'serif'], mincho_light: ['Noto Serif SC', 'NotoSerifSC-Light', 'NotoSerifSCExtraLight-Light', 'serif'],
        tokumin: ['Noto Serif SC', 'NotoSerifSC-ExtraBold', 'NotoSerifSCExtraLight-ExtraBold', 'serifB'], shippori: ['Noto Serif SC', 'NotoSerifSC-ExtraBold', 'NotoSerifSCExtraLight-ExtraBold', 'serifB'],
        dela: ['ZCOOL QingKe HuangYou', 'ZCOOLQingKeHuangYou-Regular', 'sansB'], round: ['ZCOOL KuaiLe', 'ZCOOLKuaiLe-Regular', 'sansB'],
        pop: ['ZCOOL KuaiLe', 'ZCOOLKuaiLe-Regular', 'sansB'], kiwi: ['ZCOOL KuaiLe', 'ZCOOLKuaiLe-Regular', 'sans'],
        klee: ['ZCOOL XiaoWei', 'ZCOOLXiaoWei-Regular', 'serif'], brush: ['Ma Shan Zheng', 'MaShanZheng-Regular', 'serifB'],
        reggae: ['ZCOOL QingKe HuangYou', 'ZCOOLQingKeHuangYou-Regular', 'sansB'], rampart: ['ZCOOL QingKe HuangYou', 'ZCOOLQingKeHuangYou-Regular', 'sansB'], potta: ['Ma Shan Zheng', 'MaShanZheng-Regular', 'sansB']
    },
    ko: {
        gothic_black: ['Noto Sans KR', 'NotoSansKR-Black', 'NotoSansKRThin-Black', 'sansB'], gothic_bold: ['Noto Sans KR', 'NotoSansKR-Bold', 'NotoSansKRThin-Bold', 'sansB'],
        gothic_med: ['Noto Sans KR', 'NotoSansKR-Medium', 'NotoSansKRThin-Medium', 'sans'], gothic_light: ['Noto Sans KR', 'NotoSansKR-Light', 'NotoSansKRThin-Light', 'sans'],
        zenkaku: ['Noto Sans KR', 'NotoSansKR-Black', 'NotoSansKRThin-Black', 'sansB'], sansui: ['IBM Plex Sans KR', 'IBMPlexSansKR-Medium', 'NotoSansKR-Medium', 'sans'],
        dot: ['Noto Sans KR', 'NotoSansKR-Medium', 'NotoSansKRThin-Medium', 'sans'],
        mincho_black: ['Noto Serif KR', 'NotoSerifKR-Black', 'NotoSerifKRExtraLight-Black', 'serifB'], mincho_bold: ['Noto Serif KR', 'NotoSerifKR-Bold', 'NotoSerifKRExtraLight-Bold', 'serifB'],
        mincho: ['Noto Serif KR', 'NotoSerifKR-Medium', 'NotoSerifKRExtraLight-Medium', 'serif'], mincho_light: ['Noto Serif KR', 'NotoSerifKR-Light', 'NotoSerifKRExtraLight-Light', 'serif'],
        tokumin: ['Noto Serif KR', 'NotoSerifKR-ExtraBold', 'NotoSerifKRExtraLight-ExtraBold', 'serifB'], shippori: ['Noto Serif KR', 'NotoSerifKR-ExtraBold', 'NotoSerifKRExtraLight-ExtraBold', 'serifB'],
        dela: ['Black Han Sans', 'BlackHanSans-Regular', 'sansB'], round: ['Jua', 'Jua-Regular', 'sansB'],
        pop: ['Do Hyeon', 'DoHyeon-Regular', 'sansB'], kiwi: ['Gowun Dodum', 'GowunDodum-Regular', 'sans'],
        klee: ['Gowun Batang', 'GowunBatang-Bold', 'serifB'], brush: ['Nanum Brush Script', 'NanumBrush', 'NanumBrushScript-Regular', 'serifB'],
        reggae: ['Black Han Sans', 'BlackHanSans-Regular', 'sansB'], rampart: ['Black Han Sans', 'BlackHanSans-Regular', 'sansB'], potta: ['Nanum Brush Script', 'NanumBrush', 'NanumBrushScript-Regular', 'sansB']
    }
};
// random characters in the lyric's own writing system (same sets as the browser's J.pool — issue #16)
var JZ_POOLS = {
    ja: { kana: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン', hira: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん' },
    'zh-Hant': { kana: '的一是不了人我在有他這中大來上國個到說們為子和你地出道也時年得就那要下以生會自著去之過家學對可她裡後小麼心多天而能好都然沒日於起還發成事只作當想看文無開手十用主行方又如前所本見經頭面公同三已老從動兩長知民樣現分將外但身些與高意進把法此實回二理美點月明其種聲全工己話兒者向情部正名定女問力機給等幾很最間新什打便位因重被走電四第門相次東海口使西再平真聽世氣信北少關愛夢光影空夜星雨淚戀花風', hira: '的一是不了人我在有他這中大來上國個到說們為子和你地出道也時年得就那要下以生會自著去之過家學對可她裡後小麼心多天而能好都然沒日於起還發成事只作當想看文無開手十用主行方又如前所本見經頭面公同三已老從動兩長知民樣現分將外但身些與高意進把法此實回二理美點月明其種聲全工己話兒者向情部正名定女問力機給等幾很最間新什打便位因重被走電四第門相次東海口使西再平真聽世氣信北少關愛夢光影空夜星雨淚戀花風' },
    'zh-Hans': { kana: '的一是不了人我在有他这中大来上国个到说们为子和你地出道也时年得就那要下以生会自着去之过家学对可她里后小么心多天而能好都然没日于起还发成事只作当想看文无开手十用主行方又如前所本见经头面公同三已老从动两长知民样现分将外但身些与高意进把法此实回二理美点月明其种声全工己话儿者向情部正名定女问力机给等几很最间新什打便位因重被走电四第门相次东海口使西再平真听世气信北少关爱梦光影空夜星雨泪恋花风', hira: '的一是不了人我在有他这中大来上国个到说们为子和你地出道也时年得就那要下以生会自着去之过家学对可她里后小么心多天而能好都然没日于起还发成事只作当想看文无开手十用主行方又如前所本见经头面公同三已老从动两长知民样现分将外但身些与高意进把法此实回二理美点月明其种声全工己话儿者向情部正名定女问力机给等几很最间新什打便位因重被走电四第门相次东海口使西再平真听世气信北少关爱梦光影空夜星雨泪恋花风' },
    ko: { kana: '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후그느드르므브스으즈츠크트프흐기니디리미비시이지치키티피히사랑별빛마음노래하늘바람꿈눈물너나우리', hira: '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후그느드르므브스으즈츠크트프흐기니디리미비시이지치키티피히사랑별빛마음노래하늘바람꿈눈물너나우리' },
    en: { kana: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', hira: 'abcdefghijklmnopqrstuvwxyz' }
};
function jzPool(kind) { var P = JZ_POOLS[JZ_POOL_LANG] || JZ_POOLS.ja; return P[kind] || JZ_POOLS.ja[kind]; }
var JZ_POOL_LANG = 'ja';
function jzSetLang(l) { JZ_LANG = (l && JZ_LANG_FONTS.hasOwnProperty(l)) ? l : 'ja'; JZ_POOL_LANG = (l && JZ_POOLS.hasOwnProperty(l)) ? l : 'ja'; }
// the language's own candidates for a key (null = Japanese faces); JZ_FONT_MISSING gets the family name when its own face is missing
function jzLangFont(key) {
    var T = JZ_LANG_FONTS[JZ_LANG], e = T && T[key], i, ex, sys;
    if (!e) return null;
    for (i = 1; i < e.length; i++) {
        if (JZ_LANG_SYS[JZ_LANG].hasOwnProperty(e[i])) break;
        ex = jzFontExists(e[i]);
        if (i === 1 && ex === false) JZ_FONT_MISSING[key] = e[0];
        if (ex === null) { JZ_FONT_NOAPI = true; return e[1]; }     // no font API (before AE 2024): trust the first name
        if (ex === true) return e[i];
    }
    sys = JZ_LANG_SYS[JZ_LANG][e[e.length - 1]] || [];
    for (i = 0; i < sys.length; i++) if (jzFontExists(sys[i]) === true) return sys[i];
    return null;
}
function jzFont(key, roles) {
    roles = roles || JZ_ROLE_DEFAULT;
    var role = JZ_ROLE_DEFAULT.hasOwnProperty(key) ? key : jzRoleOf(key);
    if (roles.__force && roles[role]) return roles[role];
    if (JZ_LANG !== 'ja') { var lf = jzLangFont(key); if (lf) return lf; }
    var cands = JZ_FONT_CANDIDATES[key] || [];
    for (var i = 0; i < cands.length; i++) {
        var ex = jzFontExists(cands[i]);
        if (i === 0 && ex === false) JZ_FONT_MISSING[key] = true;
        if (ex === null) JZ_FONT_NOAPI = true;
        if (ex === true) return cands[i];
    }
    return roles[role] || JZ_ROLE_DEFAULT[role];
}
// family names of the missing typefaces (e.g. "Klee One"), for messages
function jzMissingFonts() {
    var out = [], seen = {}, k, fam;
    for (k in JZ_FONT_MISSING) if (JZ_FONT_MISSING.hasOwnProperty(k)) {
        fam = typeof JZ_FONT_MISSING[k] === 'string' ? JZ_FONT_MISSING[k] : (JZ_DATA.fonts && JZ_DATA.fonts[k] && JZ_DATA.fonts[k].family) || k;
        if (!seen[fam]) { seen[fam] = true; out.push(fam); }
    }
    return out;
}

// ---- text layers
function jzText(ctx, str, o) {
    var comp = ctx.comp;
    var L = comp.layers.addText(str);
    try { L.name = (o.name || String(str).replace(/\r/g, '')).substr(0, 28); } catch (e) {}
    var src = L.property('ADBE Text Properties').property('ADBE Text Document');
    var td = src.value;
    try { td.resetCharStyle(); } catch (e1) {}
    try { td.resetParagraphStyle(); } catch (e2) {}
    td.fontSize = Math.max(1, o.size || 100);
    var f = jzFont(o.font || 'display', ctx.roles);
    try { td.font = f; } catch (e3) { jzWarn('font not set: ' + f); }
    td.applyFill = o.fill !== false;
    if (td.applyFill) td.fillColor = jzHex(o.color || '#ffffff');
    if (o.stroke) { td.applyStroke = true; td.strokeColor = jzHex(o.strokeColor || o.color || '#ffffff'); td.strokeWidth = o.stroke; try { td.strokeOverFill = !!o.strokeOver; } catch (e4) {} }
    else td.applyStroke = false;
    td.tracking = Math.round((o.track || 0) * 1000);
    td.justification = o.align === 'left' ? ParagraphJustification.LEFT_JUSTIFY : (o.align === 'right' ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY);
    if (o.leading) { try { td.autoLeading = false; td.leading = o.leading; } catch (e5) {} }
    src.setValue(td);
    if (o.maxW || o.maxH) jzFit(L, o.maxW || 1e6, o.maxH || 1e6, o.maxSize);
    jzAnchor(L, o.align);
    var tr = L.property('ADBE Transform Group');
    tr.property('ADBE Position').setValue([o.x, o.y]);
    if (o.sx || o.sy) tr.property('ADBE Scale').setValue([(o.sx || 1) * 100, (o.sy || 1) * 100]);
    if (o.rot) tr.property('ADBE Rotate Z').setValue(o.rot);
    if (o.opacity != null) tr.property('ADBE Opacity').setValue(o.opacity * 100);
    try { // per-character anchor for rotation / scale animators
        var more = L.property('ADBE Text Properties').property('ADBE Text More Options');
        more.property('ADBE Text Anchor Point Option').setValue(1);
        more.property('ADBE Text Anchor Point Align').setValue([0, -50]);
    } catch (e6) {}
    if (o.blend) L.blendingMode = o.blend;
    return L;
}
function jzVertical(str) { return jzChars(String(str).replace(/[\s　]+/g, '')).join('\r'); }
function jzRect(L) { try { return L.sourceRectAtTime(0, false); } catch (e) { return { left: 0, top: 0, width: 100, height: 100 }; } }
function jzAnchor(L, align) {
    var r = jzRect(L);
    var ax = align === 'left' ? r.left : (align === 'right' ? r.left + r.width : r.left + r.width / 2);
    L.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([ax, r.top + r.height / 2]);
    return r;
}
function jzFit(L, maxW, maxH, maxSize) {
    var r = jzRect(L), src = L.property('ADBE Text Properties').property('ADBE Text Document'), td = src.value;
    var k = Math.min(maxW / Math.max(1, r.width), maxH / Math.max(1, r.height));
    var s = td.fontSize * k;
    if (maxSize) s = Math.min(s, maxSize);
    td.fontSize = Math.max(1, s); src.setValue(td);
}
function jzSize(L) { var r = jzRect(L); var sc = L.property('ADBE Transform Group').property('ADBE Scale').value; return [r.width * sc[0] / 100, r.height * sc[1] / 100]; }
function jzFontSize(L) { return L.property('ADBE Text Properties').property('ADBE Text Document').value.fontSize; }

// ---- shape layers
function jzShapeLayer(ctx, name, x, y) {
    var L = ctx.comp.layers.addShape(); L.name = name || 'shape';
    L.property('ADBE Transform Group').property('ADBE Position').setValue([x || 0, y || 0]);
    return L;
}
function jzGrp(L, name) { var g = L.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group'); if (name) g.name = name; return g; }
function jzVecs(g) { return g.property('ADBE Vectors Group'); }
function jzAddRect(g, w, h, round, x, y) {
    var r = jzVecs(g).addProperty('ADBE Vector Shape - Rect');
    r.property('ADBE Vector Rect Size').setValue([w, h]);
    if (round) r.property('ADBE Vector Rect Roundness').setValue(round);
    if (x || y) r.property('ADBE Vector Rect Position').setValue([x || 0, y || 0]);
    return r;
}
function jzAddEllipse(g, w, h, x, y) {
    var r = jzVecs(g).addProperty('ADBE Vector Shape - Ellipse');
    r.property('ADBE Vector Ellipse Size').setValue([w, h]);
    if (x || y) r.property('ADBE Vector Ellipse Position').setValue([x || 0, y || 0]);
    return r;
}
function jzAddPath(g, pts, closed) {
    var p = jzVecs(g).addProperty('ADBE Vector Shape - Group');
    var sh = new Shape(); sh.vertices = pts; sh.closed = !!closed;
    p.property('ADBE Vector Shape').setValue(sh);
    return p;
}
function jzAddStar(g, pts, r1, r2) {
    var s = jzVecs(g).addProperty('ADBE Vector Shape - Star');
    s.property('ADBE Vector Star Type').setValue(1);
    s.property('ADBE Vector Star Points').setValue(pts);
    s.property('ADBE Vector Star Outer Radius').setValue(r1);
    s.property('ADBE Vector Star Inner Radius').setValue(r2);
    return s;
}
function jzAddFill(g, hex, op) {
    var f = jzVecs(g).addProperty('ADBE Vector Graphic - Fill');
    f.property('ADBE Vector Fill Color').setValue(jzHex(hex));
    if (op != null) f.property('ADBE Vector Fill Opacity').setValue(op);
    return f;
}
function jzAddStroke(g, hex, w, op) {
    var s = jzVecs(g).addProperty('ADBE Vector Graphic - Stroke');
    s.property('ADBE Vector Stroke Color').setValue(jzHex(hex));
    s.property('ADBE Vector Stroke Width').setValue(w || 2);
    if (op != null) s.property('ADBE Vector Stroke Opacity').setValue(op);
    return s;
}
function jzAddTrimPaths(g, endExpr, startExpr) {
    var t = jzVecs(g).addProperty('ADBE Vector Filter - Trim');
    if (endExpr) t.property('ADBE Vector Trim End').expression = endExpr;
    if (startExpr) t.property('ADBE Vector Trim Start').expression = startExpr;
    return t;
}
function jzGX(g) { return g.property('ADBE Vector Transform Group'); }

// ---- effects (parameters are addressed by index so localized AE versions work)
function jzEffect(L, mn, name) {
    try { var e = L.property('ADBE Effect Parade').addProperty(mn); if (name) e.name = name; return e; }
    catch (err) { jzWarn('effect unavailable: ' + mn); return null; }
}
function jzEP(e, idx, v) { if (!e) return; try { e.property(idx).setValue(v); } catch (err) { jzWarn('param ' + e.matchName + '#' + idx + ': ' + err.toString()); } }
function jzEX(e, idx, ex) { if (!e) return; try { e.property(idx).expression = ex; } catch (err) { jzWarn('expr ' + e.matchName + '#' + idx + ': ' + err.toString()); } }
function jzXf(L, mn) { return L.property('ADBE Transform Group').property(mn); }
function jzSetExpr(prop, ex) { try { prop.expression = ex; } catch (err) { jzWarn('expr: ' + err.toString()); } }

// ---- text animators with an Expression Selector
function jzAnimator(L, name, props, amountExpr) {
    var anims = L.property('ADBE Text Properties').property('ADBE Text Animators');
    var an = anims.addProperty('ADBE Text Animator');
    an.name = name;
    var idx = an.propertyIndex, i;
    for (i = 0; i < props.length; i++) anims.property(idx).property('ADBE Text Animator Properties').addProperty(props[i][0]);
    for (i = 0; i < props.length; i++) {
        try { anims.property(idx).property('ADBE Text Animator Properties').property(props[i][0]).setValue(props[i][1]); }
        catch (err) { jzWarn('animator ' + props[i][0] + ': ' + err.toString()); }
    }
    anims.property(idx).property('ADBE Text Selectors').addProperty('ADBE Text Expressible Selector');
    try { anims.property(idx).property('ADBE Text Selectors').property(1).property('ADBE Text Expressible Amount').expression = amountExpr; }
    catch (err2) { jzWarn('selector expr: ' + err2.toString()); }
    return anims.property(idx);
}

// ================================================================ porting helpers (shared by the expression packs ae/p_*.jsx)
// sizes: the browser layouts work in "design px" with U = min(W, H); ctx.W / ctx.H here are the comp's real pixels,
// so jzU(ctx) is the same quantity at comp scale (use it wherever the browser code uses U(env)).
function jzU(ctx) { return Math.min(ctx.W, ctx.H); }
function jzPortrait(ctx) { return ctx.H > ctx.W * 1.08; }
function jzPal(sc) { var o = [], k = ['bg', 'fg', 'ink', 'sub', 'accent', 'accent2', 'dim']; for (var i = 0; i < k.length; i++) if (sc[k[i]]) o.push(sc[k[i]]); return o; }
function jzLightest(sc) { var p = jzPal(sc), b = p[0]; for (var i = 1; i < p.length; i++) if (jzLum(p[i]) > jzLum(b)) b = p[i]; return b; }
function jzDarkest(sc) { var p = jzPal(sc), b = p[0]; for (var i = 1; i < p.length; i++) if (jzLum(p[i]) < jzLum(b)) b = p[i]; return b; }
function jzFontKeyOf(st, role, i) { var r = st.fonts[role] || st.fonts.display; return r[(i || 0) % r.length]; }
// timing header for secondary layers inside the content comp (time 0 = cut start):
//   DUR, IN, OS (= exit start), OD, plus easing functions (cl oe ioe oc ic iq ie ob bo) and
//   PO = exit progress 0..1, K = 1 - ic(PO) (fade-out factor that follows the cut's exit)
function jzTH(ctx) {
    // outDur 0 (hard cut out): nothing fades before the cut ends (the browser's pOut stays 0)
    var c = ctx.cut, hard = c.outDur != null && c.outDur <= 0, od = hard ? 0.05 : Math.max(0.12, c.outDur || 0.15);
    return 'var DUR=' + jzN(c.dur) + ',IN=' + jzN(Math.max(0.02, c.inDur || 0.3)) + ',OS=' + jzN(hard ? c.dur : c.dur - od) + ',OD=' + jzN(od) + ',SD=' + (c.seed % 99991) + ';\n' + JZ_FNS +
        'var PO=cl((time-OS)/OD),K=1-ic(PO);\n';
}
// opacity: fade in from `delay` over `len` s, follow the cut's exit
function jzFade(ctx, L, delay, len) { jzSetExpr(jzXf(L, 'ADBE Opacity'), jzTH(ctx) + 'value*oc((time-' + jzN(delay || 0) + ')/' + jzN(len || 0.3) + ')*K'); }
// scale from 0 (or along one axis: axis 'x' / 'y') with a soft overshoot, follows the cut's exit
function jzGrow(ctx, L, delay, len, axis) {
    var e = 'var q=cl((time-' + jzN(delay || 0) + ')/' + jzN(len || 0.35) + ');var s=q<=0?0:ob(q,1.4);s*=K;';
    jzSetExpr(jzXf(L, 'ADBE Scale'), jzTH(ctx) + e + (axis === 'x' ? '[value[0]*s,value[1]]' : axis === 'y' ? '[value[0],value[1]*s]' : '[value[0]*s,value[1]*s]'));
}
// slide in from an offset (px) with an expo ease, follows the cut's exit with a fade
function jzSlideIn(ctx, L, dx, dy, delay, len) {
    jzSetExpr(jzXf(L, 'ADBE Position'), jzTH(ctx) + 'var e=oe((time-' + jzN(delay || 0) + ')/' + jzN(len || 0.4) + ');[value[0]+' + jzN(dx || 0) + '*(1-e),value[1]+' + jzN(dy || 0) + '*(1-e)]');
    jzFade(ctx, L, delay, (len || 0.4) * 0.5);
}
// ---- one-shape layers (position = centre); o: { round, stroke, strokeW, rot, opacity, fillOpacity }
function jzRectLayer(ctx, name, cx, cy, w, h, fill, o) {
    o = o || {};
    var S = jzShapeLayer(ctx, name, cx, cy), g = jzGrp(S, name);
    jzAddRect(g, w, h, o.round || 0);
    if (o.stroke) jzAddStroke(g, o.stroke, o.strokeW || 2);
    if (fill) jzAddFill(g, fill, o.fillOpacity);
    if (o.rot) jzXf(S, 'ADBE Rotate Z').setValue(o.rot);
    if (o.opacity != null) jzXf(S, 'ADBE Opacity').setValue(o.opacity * 100);
    return S;
}
function jzEllipseLayer(ctx, name, cx, cy, w, h, fill, o) {
    o = o || {};
    var S = jzShapeLayer(ctx, name, cx, cy), g = jzGrp(S, name);
    jzAddEllipse(g, w, h);
    if (o.stroke) jzAddStroke(g, o.stroke, o.strokeW || 2);
    if (fill) jzAddFill(g, fill, o.fillOpacity);
    if (o.opacity != null) jzXf(S, 'ADBE Opacity').setValue(o.opacity * 100);
    return S;
}
// polyline / polygon in comp px (the layer sits at 0,0); o: { closed, fill, width, cap, trim: 'expr' }
function jzPathLayer(ctx, name, pts, color, o) {
    o = o || {};
    var S = jzShapeLayer(ctx, name, 0, 0), g = jzGrp(S, name);
    jzAddPath(g, pts, !!o.closed);
    if (o.fill) jzAddFill(g, o.fill);
    if (color) { var st = jzAddStroke(g, color, o.width || 2); if (o.cap) try { st.property('ADBE Vector Stroke Line Cap').setValue(o.cap); } catch (e) {} }
    if (o.trim) jzAddTrimPaths(g, o.trim);
    return S;
}
// ---- per-glyph arrangement inside ONE text layer (keeps the lyric editable as a single text):
// values are given per glyph in textIndex order (1-based in expressions; line breaks are not glyphs, spaces are).
function jzArrExpr(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(a[i] instanceof Array ? '[' + jzN(a[i][0]) + ',' + jzN(a[i][1]) + ']' : jzN(a[i])); return '[' + s.join(',') + ']'; }
function jzCharOffsets(L, offs, name) {       // offs: [[dx, dy], ...] px
    var K = 1, i; for (i = 0; i < offs.length; i++) K = Math.max(K, Math.abs(offs[i][0]), Math.abs(offs[i][1]));
    return jzAnimator(L, name || 'JZ Place', [['ADBE Text Position 3D', [K, K, 0]]], 'var a=' + jzArrExpr(offs) + ';var q=a[textIndex-1]||[0,0];[q[0]/' + jzN(K) + '*100,q[1]/' + jzN(K) + '*100,0]');
}
function jzCharRotations(L, rots, name) {    // degrees per glyph
    var K = 1, i; for (i = 0; i < rots.length; i++) K = Math.max(K, Math.abs(rots[i]));
    return jzAnimator(L, name || 'JZ Tilt', [['ADBE Text Rotation', K]], 'var a=' + jzArrExpr(rots) + ';var q=a[textIndex-1]||0;q/' + jzN(K) + '*100');
}
function jzCharScales(L, scales, name) {     // factor per glyph (1 = 100%); range 0..3
    return jzAnimator(L, name || 'JZ Size', [['ADBE Text Scale 3D', [300, 300, 100]]], 'var a=' + jzArrExpr(scales) + ';var q=a[textIndex-1];q=q==null?1:q;(q-1)/2*100');
}
function jzCharColors(L, hex, flags, name) { // flags: [true/false per glyph] -> those glyphs take the colour
    var f = []; for (var i = 0; i < flags.length; i++) f.push(flags[i] ? 1 : 0);
    return jzAnimator(L, name || 'JZ Colour', [['ADBE Text Fill Color', jzHex(hex)]], 'var a=' + jzArrExpr(f) + ';(a[textIndex-1]||0)*100');
}
// glyphs of a string the way AE counts them for textIndex (line breaks removed)
function jzGlyphs(str) { return jzChars(String(str).replace(/[\r\n]/g, '')); }

// ---- equivalents of the small helpers the browser packs share (src/11p_*.js)
function jzFontsOf(st, roles) { var o = [], i, j; for (i = 0; i < roles.length; i++) { var r = st.fonts[roles[i]] || []; for (j = 0; j < r.length; j++) o.push(r[j]); } return o.length ? o : st.fonts.display; }
function jzSmallSize(ctx) { return jzClamp(jzU(ctx) * 0.024, 14 * ctx.u, 34 * ctx.u); }
function jzMonoF(ctx) { return (ctx.st.fonts.mono && ctx.st.fonts.mono[0]) || 'mono'; }
function jzBodyF(ctx) { return (ctx.st.fonts.body && ctx.st.fonts.body[0]) || 'gothic_med'; }
function jzSerifF(ctx) { return (ctx.st.fonts.serif && ctx.st.fonts.serif[0]) || 'mincho'; }
function jzStrip(t) { return String(t || '').replace(/[\s　]+/g, ''); }
function jzHasLatin(t) { return /[A-Za-z]/.test(t); }
function jzFlat(t) { return jzHasLatin(t) ? jzTrim(String(t || '')).replace(/\s+/g, ' ') : jzStrip(t); }
function jzFmtTime(t) { t = Math.max(0, t); var m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * 100); return jzPad(m, 2) + ':' + jzPad(s, 2) + '.' + jzPad(f, 2); }
function jzRomajiOf(ctx) { var t = ctx.cut.text; if (jzHasLatin(t) || !t) return null; var r = jzRomaji(jzStrip(t)); return r ? r.toUpperCase() : null; }
function jzLineNo(ctx) { return jzPad(Math.max(0, ctx.cut.line || 0) + 1, 2); }
// secondary copy: the full line if this cut is a part of it, else the note, else romaji, else "No.xx"
function jzAltCopy(ctx) { var c = ctx.cut; if (c.lineText && jzStrip(c.lineText) !== jzStrip(c.text)) return c.lineText; return c.note || jzRomajiOf(ctx) || 'No.' + jzLineNo(ctx); }
// text colour that reads on a plate colour
function jzOnCol(sc, plate) { var c = [sc.fg, sc.bg, sc.ink, '#FFFFFF', '#111111'], b = c[0], bs = 0; for (var i = 0; i < c.length; i++) { if (!c[i]) continue; var k = jzContrast(c[i], plate); if (k > bs) { bs = k; b = c[i]; } } return b; }
// change a text layer's TextDocument in place: jzTextDoc(L, function (td) { td.applyStroke = true; ... })
function jzTextDoc(L, fn) {
    var src = L.property('ADBE Text Properties').property('ADBE Text Document'), td = src.value;
    fn(td); src.setValue(td); return L;
}
function jzTextColor(L) { try { var c = L.property('ADBE Text Properties').property('ADBE Text Document').value.fillColor; return jzToHex(c[0] * 255, c[1] * 255, c[2] * 255); } catch (e) { return '#FFFFFF'; } }
// rectangular layer mask in layer coordinates (for text layers use the source rect: jzRect(L))
function jzMaskRect(L, x0, y0, x1, y1, feather) {
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    sh.vertices = [[x1, y0], [x1, y1], [x0, y1], [x0, y0]]; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh);
    if (feather) m.property('ADBE Mask Feather').setValue([feather, feather]);
    return m;
}

// keep a layer out of the tinted ghost copies (the browser's ghost:false — drawn on the main pass only).
// jzBuild then feeds the ghosts from a duplicate of the content comp in which these layers are switched off
// (they still work as parents / track mattes / expression targets there).
function jzNoGhost(L) { try { var c = String(L.comment || ''); if (c.indexOf('JZ_NOGHOST') < 0) L.comment = (c ? c + ' ' : '') + 'JZ_NOGHOST'; } catch (e) {} return L; }
function jzIsNoGhost(L) { try { return String(L.comment || '').indexOf('JZ_NOGHOST') >= 0; } catch (e) { return false; } }
