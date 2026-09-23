// ================================================================ builder helpers
var JZLOG = [];
function jzWarn(m) { if (JZLOG.length < 400) JZLOG.push(m); }
function jzN(x) { return String(Math.round(x * 10000) / 10000); }

// ---- fonts: map JIZURA font keys to PostScript names, verify when the API exists
var JZ_FONT_CANDIDATES = {
    gothic_black: ['NotoSansJP-Black', 'NotoSansCJKjp-Black', 'SourceHanSansJP-Heavy', 'KozGoPr6N-Heavy', 'YuGothic-Bold', 'Meiryo-Bold'],
    gothic_bold: ['NotoSansJP-Bold', 'NotoSansCJKjp-Bold', 'SourceHanSansJP-Bold', 'KozGoPr6N-Bold', 'YuGothic-Bold', 'Meiryo-Bold'],
    gothic_med: ['NotoSansJP-Medium', 'NotoSansCJKjp-Medium', 'SourceHanSansJP-Medium', 'KozGoPr6N-Medium', 'YuGothic-Medium', 'Meiryo'],
    gothic_light: ['NotoSansJP-Light', 'NotoSansCJKjp-Light', 'KozGoPr6N-Light', 'YuGothic-Light', 'Meiryo'],
    dela: ['DelaGothicOne-Regular', 'NotoSansJP-Black', 'KozGoPr6N-Heavy', 'YuGothic-Bold'],
    zenkaku: ['ZenKakuGothicNew-Black', 'NotoSansJP-Black', 'KozGoPr6N-Heavy', 'YuGothic-Bold'],
    mincho_black: ['ZenOldMincho-Black', 'NotoSerifJP-Black', 'KozMinPr6N-Heavy', 'YuMincho-Demibold'],
    mincho_bold: ['NotoSerifJP-Bold', 'NotoSerifCJKjp-Bold', 'SourceHanSerifJP-Bold', 'KozMinPr6N-Bold', 'YuMincho-Demibold'],
    mincho: ['NotoSerifJP-Medium', 'NotoSerifCJKjp-Medium', 'SourceHanSerifJP-Medium', 'KozMinPr6N-Medium', 'YuMincho-Regular', 'MS-Mincho'],
    mincho_light: ['NotoSerifJP-Light', 'NotoSerifCJKjp-Light', 'KozMinPr6N-Light', 'YuMincho-Light', 'YuMincho-Regular'],
    tokumin: ['KaiseiTokumin-ExtraBold', 'ZenOldMincho-Black', 'KozMinPr6N-Heavy', 'YuMincho-Demibold'],
    round: ['MPLUSRounded1c-ExtraBold', 'RoundedMplus1c-Black', 'NotoSansJP-Black', 'YuGothic-Bold'],
    pop: ['MochiyPopOne-Regular', 'MPLUSRounded1c-ExtraBold', 'YuGothic-Bold'],
    dot: ['DotGothic16-Regular', 'MS-Gothic', 'YuGothic-Regular'],
    brush: ['YujiSyuku-Regular', 'YuMincho-Demibold'],
    mono: ['IBMPlexMono-Medium', 'Consolas', 'CourierNewPSMT'],
    sansui: ['IBMPlexSansJP-Medium', 'NotoSansJP-Medium', 'YuGothic-Medium', 'Meiryo'],
    reggae: ['ReggaeOne-Regular', 'DelaGothicOne-Regular', 'NotoSansJP-Black', 'YuGothic-Bold'],
    rampart: ['RampartOne-Regular', 'NotoSansJP-Black', 'YuGothic-Bold'],
    potta: ['PottaOne-Regular', 'MochiyPopOne-Regular', 'YuGothic-Bold'],
    kiwi: ['KiwiMaru-Medium', 'MPLUSRounded1c-ExtraBold', 'YuGothic-Medium'],
    klee: ['KleeOne-SemiBold', 'YuMincho-Demibold'],
    shippori: ['ShipporiMinchoB1-ExtraBold', 'ZenOldMincho-Black', 'KozMinPr6N-Heavy', 'YuMincho-Demibold']
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
function jzFont(key, roles) {
    roles = roles || JZ_ROLE_DEFAULT;
    var role = JZ_ROLE_DEFAULT.hasOwnProperty(key) ? key : jzRoleOf(key);
    if (roles.__force && roles[role]) return roles[role];
    var cands = JZ_FONT_CANDIDATES[key] || [];
    for (var i = 0; i < cands.length; i++) { var ex = jzFontExists(cands[i]); if (ex === true) return cands[i]; }
    return roles[role] || JZ_ROLE_DEFAULT[role];
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
