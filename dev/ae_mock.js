// Minimal After Effects object-model mock to exercise JIZURA_AE.jsx in Node.
// It records every property access / value / expression so we can catch
// runtime errors (typos, undefined helpers) and validate expression syntax.
const fs = require('fs'), vm = require('vm'), acorn = require('acorn');

const KNOWN = new Set([
  'ADBE Text Properties', 'ADBE Text Document', 'ADBE Text Animators', 'ADBE Text Animator', 'ADBE Text Animator Properties', 'ADBE Text Selectors',
  'ADBE Text Expressible Selector', 'ADBE Text Expressible Amount', 'ADBE Text Position 3D', 'ADBE Text Rotation', 'ADBE Text Scale 3D', 'ADBE Text Opacity',
  'ADBE Text Blur', 'ADBE Text Tracking Amount', 'ADBE Text Character Offset', 'ADBE Text More Options', 'ADBE Text Anchor Point Option', 'ADBE Text Anchor Point Align',
  'ADBE Text Path Options', 'ADBE Text Path', 'ADBE Text Perpendicular To Path', 'ADBE Text First Margin',
  'ADBE Transform Group', 'ADBE Anchor Point', 'ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity',
  'ADBE Effect Parade', 'ADBE Mask Parade', 'ADBE Mask Atom', 'ADBE Mask Shape', 'ADBE Mask Feather', 'ADBE Marker',
  'ADBE Root Vectors Group', 'ADBE Vector Group', 'ADBE Vectors Group', 'ADBE Vector Shape - Rect', 'ADBE Vector Rect Size', 'ADBE Vector Rect Roundness', 'ADBE Vector Rect Position',
  'ADBE Vector Shape - Ellipse', 'ADBE Vector Ellipse Size', 'ADBE Vector Ellipse Position', 'ADBE Vector Shape - Group', 'ADBE Vector Shape',
  'ADBE Vector Shape - Star', 'ADBE Vector Star Type', 'ADBE Vector Star Points', 'ADBE Vector Star Outer Radius', 'ADBE Vector Star Inner Radius',
  'ADBE Vector Graphic - Fill', 'ADBE Vector Fill Color', 'ADBE Vector Fill Opacity', 'ADBE Vector Graphic - Stroke', 'ADBE Vector Stroke Color', 'ADBE Vector Stroke Width', 'ADBE Vector Stroke Opacity',
  'ADBE Vector Filter - Trim', 'ADBE Vector Trim End', 'ADBE Vector Trim Start', 'ADBE Vector Filter - Repeater', 'ADBE Vector Repeater Copies', 'ADBE Vector Repeater Transform',
  'ADBE Vector Repeater Position', 'ADBE Vector Repeater Rotation', 'ADBE Vector Transform Group', 'ADBE Vector Position', 'ADBE Vector Rotation', 'ADBE Vector Group Opacity',
  // effects
  'ADBE Wave Warp', 'ADBE Motion Blur', 'ADBE Linear Wipe', 'ADBE Gaussian Blur 2', 'ADBE Echo', 'ADBE Glo2', 'ADBE Ramp', 'ADBE Tint', 'ADBE Posterize Time',
  'ADBE Geometry2', 'CC Radial Blur', 'ADBE Invert', 'ADBE Noise', 'ADBE Fractal Noise',
]);
const EFFECT_PARAMS = { 'ADBE Wave Warp': 8, 'ADBE Motion Blur': 2, 'ADBE Linear Wipe': 3, 'ADBE Gaussian Blur 2': 3, 'ADBE Echo': 5, 'ADBE Glo2': 11, 'ADBE Ramp': 7, 'ADBE Tint': 3, 'ADBE Posterize Time': 1, 'ADBE Geometry2': 12, 'CC Radial Blur': 4, 'ADBE Invert': 2, 'ADBE Noise': 3, 'ADBE Fractal Noise': 20 };
const stats = { unknown: new Set(), exprs: 0, exprErrors: [], layers: 0, comps: 0, effects: {}, animators: 0 };

class Prop {
  constructor(mn, parent) { this.matchName = mn; this.name = mn; this.parentProperty = parent; this.children = []; this._v = null; this._expr = ''; this.keys = []; }
  property(k) {
    if (typeof k === 'number') {
      if (this.isEffect) { const n = EFFECT_PARAMS[this.matchName] || 0; if (k < 1 || k > n) throw new Error(`effect ${this.matchName} has no param #${k}`); }
      if (!this.children[k - 1]) this.children[k - 1] = new Prop(this.matchName + '#' + k, this);
      return this.children[k - 1];
    }
    if (!KNOWN.has(k)) stats.unknown.add(k);
    let c = this.children.find(x => x && (x.matchName === k || x.name === k));
    if (!c) { c = new Prop(k, this); this.children.push(c); }
    return c;
  }
  addProperty(mn) {
    if (!KNOWN.has(mn)) stats.unknown.add(mn);
    const c = new Prop(mn, this); this.children.push(c); c.propertyIndex = this.children.length;
    if (this.matchName === 'ADBE Effect Parade') { c.isEffect = true; stats.effects[mn] = (stats.effects[mn] || 0) + 1; }
    if (mn === 'ADBE Text Animator') stats.animators++;
    return c;
  }
  get numProperties() { return this.children.length; }
  setValue(v) { if (v === undefined || (Array.isArray(v) && v.some(x => typeof x !== 'number' || !isFinite(x))) || (typeof v === 'number' && !isFinite(v))) throw new Error(`bad value for ${this.matchName}: ${JSON.stringify(v)}`); this._v = v; }
  get value() {
    if (this.matchName === 'ADBE Text Document') return this._v || (this._v = new TextDocument(''));
    if (this._v != null) return this._v;
    if (this.matchName === 'ADBE Scale') return [100, 100];
    if (this.matchName === 'ADBE Position' || this.matchName === 'ADBE Anchor Point') return [0, 0];
    return 0;
  }
  set expression(s) {
    stats.exprs++;
    try { acorn.parse(s, { ecmaVersion: 2018, allowReturnOutsideFunction: true }); }
    catch (e) { stats.exprErrors.push(`${this.matchName}: ${e.message}\n    ${s.slice(0, 300)}`); }
    this._expr = s;
  }
  get expression() { return this._expr; }
  setValueAtTime(t, v) { this.keys.push([t, v]); }
  nearestKeyIndex() { return this.keys.length; }
  setInterpolationTypeAtKey() {}
  get numKeys() { return this.keys.length; }
  keyTime(i) { return this.keys[i - 1][0]; }
  remove() {}
  moveTo() {}
}
class TextDocument { constructor(t) { this.text = t; this.fontSize = 36; this.font = 'ArialMT'; this.fillColor = [1, 1, 1]; this.applyFill = true; this.applyStroke = false; this.tracking = 0; this.leading = 0; this.autoLeading = true; } resetCharStyle() {} resetParagraphStyle() {} }
class Layer extends Prop {
  constructor(comp, kind, text) { super('ADBE ' + kind + ' Layer', null); this.comp = comp; this.kind = kind; this.text = text; this.startTime = 0; this.inPoint = 0; this.outPoint = 10; this.parent = null; this.blendingMode = 1; this.adjustmentLayer = false; stats.layers++; if (kind === 'Text') this.property('ADBE Text Properties').property('ADBE Text Document')._v = new TextDocument(text); }
  sourceRectAtTime() {
    if (this.kind !== 'Text') return { left: -50, top: -50, width: 100, height: 100 };
    const td = this.property('ADBE Text Properties').property('ADBE Text Document').value;
    const lines = String(td.text).split('\r');
    const maxLen = Math.max(...lines.map(l => [...l].length));
    const w = maxLen * td.fontSize * (1 + td.tracking / 1000), h = lines.length * td.fontSize * 1.2;
    return { left: -w / 2, top: -h * 0.8, width: w, height: h };
  }
  duplicate() { const L = new Layer(this.comp, this.kind, this.text); this.comp._layers.unshift(L); return L; }
  moveAfter() {} moveBefore() {} moveToEnd() {} moveToBeginning() {} remove() { const i = this.comp._layers.indexOf(this); if (i >= 0) this.comp._layers.splice(i, 1); }
  get hasAudio() { return false; }
}
class Comp {
  constructor(name, w, h, pa, d, fps) { if (!(w > 0 && h > 0 && d > 0 && fps > 0)) throw new Error(`bad comp ${name} ${w}x${h} d=${d} fps=${fps}`); this.name = name; this.width = w; this.height = h; this.duration = d; this.frameRate = fps; this._layers = []; stats.comps++;
    const self = this;
    this.layers = {
      addText(t) { if (typeof t !== 'string') throw new Error('addText needs string'); const L = new Layer(self, 'Text', t); self._layers.unshift(L); return L; },
      addShape() { const L = new Layer(self, 'Shape'); self._layers.unshift(L); return L; },
      addSolid(c, n, w, h, pa, d) { if (!Array.isArray(c) || c.length !== 3) throw new Error('solid colour'); const L = new Layer(self, 'Solid'); L.name = n; self._layers.unshift(L); return L; },
      add(item) { const L = new Layer(self, 'AV'); L.source = item; self._layers.unshift(L); return L; },
    };
    this.markerProperty = new Prop('ADBE Marker', null);
  }
  get numLayers() { return this._layers.length; }
  layer(i) { return this._layers[i - 1]; }
  openInViewer() {}
}
function makeContext() {
  const ctx = {
    app: { project: { items: { addComp: (...a) => new Comp(...a), addFolder: (n) => ({ name: n }) }, activeItem: null }, settings: { haveSetting: () => false, getSetting: () => '', saveSetting: () => {} }, beginUndoGroup() {}, endUndoGroup() {}, fonts: undefined },
    Shape: class { constructor() { this.vertices = []; this.inTangents = []; this.outTangents = []; this.closed = false; } },
    ParagraphJustification: { LEFT_JUSTIFY: 1, RIGHT_JUSTIFY: 2, CENTER_JUSTIFY: 3 },
    BlendingMode: { MULTIPLY: 5, OVERLAY: 7, SCREEN: 9, ADD: 10 },
    KeyframeInterpolationType: { HOLD: 3, LINEAR: 1 },
    MaskMode: { NONE: 0, ADD: 1 },
    alert: (m) => { ctx.__alerts.push(m); },
    __alerts: [],
    Panel: class {}, Window: class {}, CompItem: Comp, File: {}, ScriptUI: {},
    JSON, Math, Date, String, Number, parseInt, parseFloat, isFinite, encodeURIComponent, decodeURIComponent,
  };
  return ctx;
}
module.exports = { makeContext, stats, Comp };
