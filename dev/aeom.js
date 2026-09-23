/* After Effects object-model emulation for testing JIZURA_AE.jsx outside AE.
   - Node: syntax-checks expressions with acorn, validates values / effect params, counts usage.
   - Browser: the same model is rendered by aerender.js (dev preview).
   Only the parts of the AE scripting DOM that JIZURA uses are modelled, but they are modelled
   faithfully enough to be rendered (defaults, layer timing, parenting, keyframes, expressions). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('acorn'));
  else root.AEOM = factory(root.acorn || null);
})(typeof self !== 'undefined' ? self : this, function (acorn) {
'use strict';

// ---------------------------------------------------------------- enums
const BlendingMode = { NORMAL: 'normal', DISSOLVE: 'normal', DARKEN: 'darken', MULTIPLY: 'multiply', COLOR_BURN: 'color-burn', LINEAR_BURN: 'multiply',
  LIGHTEN: 'lighten', SCREEN: 'screen', COLOR_DODGE: 'color-dodge', ADD: 'lighter', LINEAR_DODGE: 'lighter', OVERLAY: 'overlay', SOFT_LIGHT: 'soft-light',
  HARD_LIGHT: 'hard-light', DIFFERENCE: 'difference', EXCLUSION: 'exclusion', HUE: 'hue', SATURATION: 'saturation', COLOR: 'color', LUMINOSITY: 'luminosity',
  STENCIL_ALPHA: 'destination-in', SILHOUETE_ALPHA: 'destination-out', SILHOUETTE_ALPHA: 'destination-out', ALPHA_ADD: 'normal', LIGHTER_COLOR: 'lighten', DARKER_COLOR: 'darken' };
const TrackMatteType = { NO_TRACK_MATTE: 'none', ALPHA: 'alpha', ALPHA_INVERTED: 'alphaInv', LUMA: 'luma', LUMA_INVERTED: 'lumaInv' };
const KeyframeInterpolationType = { LINEAR: 'linear', BEZIER: 'bezier', HOLD: 'hold' };
const ParagraphJustification = { LEFT_JUSTIFY: 'left', RIGHT_JUSTIFY: 'right', CENTER_JUSTIFY: 'center', FULL_JUSTIFY_LASTLINE_LEFT: 'left', FULL_JUSTIFY_LASTLINE_CENTER: 'center', FULL_JUSTIFY_LASTLINE_RIGHT: 'right', FULL_JUSTIFY_LASTLINE_FULL: 'left' };
const MaskMode = { NONE: 'none', ADD: 'add', SUBTRACT: 'subtract', INTERSECT: 'intersect', LIGHTEN: 'add', DARKEN: 'intersect', DIFFERENCE: 'difference' };
const PropertyType = { PROPERTY: 1, INDEXED_GROUP: 2, NAMED_GROUP: 3 };

// ---------------------------------------------------------------- effect whitelist: param index -> [name, default]
// Order follows AE's own parameter order (property(i) / matchName "<effect>-000i").
const C = (r, g, b) => [r, g, b, 1];
const EFFECTS = {
  'ADBE Linear Wipe': [['Transition Completion', 0], ['Wipe Angle', 90], ['Feather', 0]],
  'ADBE Radial Wipe': [['Transition Completion', 0], ['Start Angle', 0], ['Wipe Center', null], ['Wipe', 1], ['Feather', 0]],
  'ADBE Iris Wipe': [['Iris Center', null], ['Iris Points', 6], ['Outer Radius', 0], ['Use Inner Radius', 0], ['Inner Radius', 0], ['Rotation', 0], ['Feather', 0]],
  'ADBE Venetian Blinds': [['Transition Completion', 0], ['Direction', 0], ['Width', 10], ['Feather', 0]],
  'ADBE Block Dissolve': [['Transition Completion', 0], ['Block Width', 10], ['Block Height', 10], ['Feather', 0], ['Soft Edges', 1]],
  'CC Grid Wipe': [['Completion', 0], ['Center', null], ['Rotation', 0], ['Border', 0], ['Tiles', 10], ['Shape', 1], ['Reverse Transition', 0]],
  'ADBE Gaussian Blur 2': [['Blurriness', 0], ['Blur Dimensions', 1], ['Repeat Edge Pixels', 0]],
  'ADBE Box Blur2': [['Blur Radius', 0], ['Iterations', 3], ['Blur Dimensions', 1], ['Repeat Edge Pixels', 0]],
  'ADBE Motion Blur': [['Direction', 0], ['Blur Length', 0]],
  'ADBE Radial Blur': [['Amount', 10], ['Center', null], ['Type', 1], ['Antialiasing', 1]],
  'CC Radial Blur': [['Type', 1], ['Amount', 10], ['Quality', 50], ['Center', null]],
  'ADBE Tint': [['Map Black To', C(0, 0, 0)], ['Map White To', C(1, 1, 1)], ['Amount to Tint', 100]],
  'ADBE Fill': [['Fill Mask', 0], ['All Masks', 0], ['Color', C(1, 0, 0)], ['Invert', 0], ['Horizontal Feather', 0], ['Vertical Feather', 0], ['Opacity', 1]],
  'ADBE Invert': [['Channel', 1], ['Blend With Original', 0]],
  'ADBE Tritone': [['Highlights', C(1, 1, 1)], ['Midtones', C(0.5, 0.4, 0.3)], ['Shadows', C(0, 0, 0)], ['Blend With Original', 0]],
  'ADBE Color Balance (HLS)': [['Hue', 0], ['Lightness', 0], ['Saturation', 0]],
  'ADBE Brightness & Contrast 2': [['Brightness', 0], ['Contrast', 0], ['Use Legacy', 0]],
  'ADBE Posterize': [['Level', 6]],
  'ADBE Threshold2': [['Level', 128]],
  'ADBE Mosaic': [['Horizontal Blocks', 10], ['Vertical Blocks', 10], ['Sharp Colors', 0]],
  'ADBE Find Edges': [['Invert', 0], ['Blend With Original', 0]],
  'ADBE Noise': [['Amount of Noise', 0], ['Noise Type', 1], ['Clipping', 1]],
  'ADBE Fractal Noise': [['Fractal Type', 1], ['Noise Type', 1], ['Invert', 0], ['Contrast', 100], ['Brightness', 0], ['Overflow', 1]],
  'ADBE Ramp': [['Start of Ramp', null], ['Start Color', C(0, 0, 0)], ['End of Ramp', null], ['End Color', C(1, 1, 1)], ['Ramp Shape', 1], ['Ramp Scatter', 0], ['Blend With Original', 0]],
  'ADBE 4ColorGradient': [['Point 1', null], ['Color 1', C(1, 1, 0)], ['Point 2', null], ['Color 2', C(0, 1, 0)], ['Point 3', null], ['Color 3', C(1, 0, 1)], ['Point 4', null], ['Color 4', C(0, 0, 1)], ['Blend', 100], ['Jitter', 0], ['Opacity', 100], ['Blending Mode', 1]],
  'ADBE Glo2': [['Glow Based On', 2], ['Glow Threshold', 60], ['Glow Radius', 10], ['Glow Intensity', 1], ['Composite Original', 2], ['Glow Operation', 3], ['Glow Colors', 1], ['Color Looping', 3], ['Color Loops', 1], ['Color Phase', 0], ['A & B Midpoint', 50], ['Color A', C(1, 1, 1)], ['Color B', C(0, 0, 0)], ['Glow Dimensions', 1]],
  'ADBE Drop Shadow': [['Shadow Color', C(0, 0, 0)], ['Opacity', 50], ['Direction', 135], ['Distance', 5], ['Softness', 0], ['Shadow Only', 0]],
  'ADBE Geometry2': [['Anchor Point', null], ['Position', null], ['Uniform Scale', 1], ['Scale Height', 100], ['Scale Width', 100], ['Skew', 0], ['Skew Axis', 0], ['Rotation', 0], ['Opacity', 100], ['Use Composition’s Shutter Angle', 1], ['Shutter Angle', 0], ['Sampling', 1]],
  'ADBE Wave Warp': [['Wave Type', 1], ['Wave Height', 10], ['Wave Width', 40], ['Direction', 90], ['Wave Speed', 1], ['Pinning', 1], ['Phase', 0], ['Antialiasing', 2]],
  'ADBE Turbulent Displace': [['Displacement', 1], ['Amount', 50], ['Size', 100], ['Offset (Turbulence)', null], ['Complexity', 1], ['Evolution', 0]],
  'ADBE Bulge': [['Horizontal Radius', 50], ['Vertical Radius', 50], ['Bulge Center', null], ['Bulge Height', 1], ['Taper Radius', 0], ['Antialiasing', 1], ['Pinning', 0]],
  'ADBE Twirl': [['Angle', 0], ['Twirl Radius', 30], ['Twirl Center', null]],
  'ADBE Ripple': [['Radius', 50], ['Center of Ripple', null], ['Type of Conversion', 1], ['Wave Speed', 1], ['Wave Width', 20], ['Wave Height', 20], ['Ripple Phase', 0]],
  'ADBE Spherize': [['Radius', 0], ['Center of Sphere', null]],
  'ADBE Optics Compensation': [['Field Of View (FOV)', 0], ['Reverse Lens Distortion', 0], ['FOV Orientation', 1], ['View Center', null], ['Optimal Pixels', 0], ['Resize', 1]],
  'ADBE Polar Coordinates': [['Interpolation', 0], ['Type of Conversion', 1]],
  'CC Kaleida': [['Center', null], ['Size', 100], ['Mirroring', 1], ['Rotation', 0], ['Floating Center', 0]],
  'ADBE Mirror': [['Reflection Center', null], ['Reflection Angle', 0]],
  'ADBE Tile': [['Tile Center', null], ['Tile Width', 100], ['Tile Height', 100], ['Output Width', 100], ['Output Height', 100], ['Mirror Edges', 0], ['Phase', 0], ['Horizontal Phase Shift', 0]],
  'ADBE Offset': [['Shift Center To', null], ['Blend With Original', 0]],
  'ADBE Echo': [['Echo Time (seconds)', -0.0333], ['Number Of Echoes', 1], ['Starting Intensity', 1], ['Decay', 1], ['Echo Operator', 1]],
  'ADBE Posterize Time': [['Frame Rate', 12]],
  'ADBE Lens Flare': [['Flare Center', null], ['Flare Brightness', 100], ['Lens Type', 1], ['Blend With Original', 0]],
  'CC Light Rays': [['Intensity', 100], ['Center', null], ['Radius', 40], ['Warp Softness', 50], ['Shape', 1], ['Direction', 0], ['Color from Source', 1], ['Allow Brightening', 1], ['Color', C(1, 1, 1)], ['Transfer Mode', 1]],
  'ADBE Roughen Edges': [['Edge Type', 1], ['Edge Color', C(1, 0.5, 0)], ['Border', 8], ['Edge Sharpness', 1], ['Fractal Influence', 1], ['Scale', 100], ['Stretch Width or Height', 0], ['Offset (Turbulence)', null], ['Complexity', 2], ['Evolution', 0]],
  'ADBE Simple Choker': [['View', 1], ['Choke Matte', 0]],
};
const EFFECT_ALIASES = { 'ADBE Fast Blur': 'ADBE Box Blur2' };

// ---------------------------------------------------------------- default values by matchName
const D2 = (x, y) => [x, y];
const DEFAULTS = {
  'ADBE Anchor Point': D2(0, 0), 'ADBE Position': D2(0, 0), 'ADBE Scale': [100, 100], 'ADBE Rotate Z': 0, 'ADBE Opacity': 100,
  'ADBE Time Remapping': 0,
  'ADBE Text Path': 0, 'ADBE Text Reverse Path': 0, 'ADBE Text Perpendicular To Path': 1, 'ADBE Text Force Align Path': 0, 'ADBE Text First Margin': 0, 'ADBE Text Last Margin': 0,
  'ADBE Text Anchor Point Option': 1, 'ADBE Text Anchor Point Align': [0, 0], 'ADBE Text Render Order': 1, 'ADBE Text Character Blend Mode': 1,
  'ADBE Text Position 3D': [0, 0, 0], 'ADBE Text Anchor Point 3D': [0, 0, 0], 'ADBE Text Scale 3D': [100, 100, 100], 'ADBE Text Skew': 0, 'ADBE Text Skew Axis': 0,
  'ADBE Text Rotation': 0, 'ADBE Text Opacity': 100, 'ADBE Text Fill Color': [1, 0, 0], 'ADBE Text Stroke Color': [1, 0, 0], 'ADBE Text Fill Opacity': 100,
  'ADBE Text Stroke Opacity': 100, 'ADBE Text Stroke Width': 0, 'ADBE Text Tracking Amount': 0, 'ADBE Text Line Spacing': [0, 0], 'ADBE Text Character Offset': 0, 'ADBE Text Blur': [0, 0],
  'ADBE Text Line Anchor': 0, 'ADBE Text Fill Brightness': 0, 'ADBE Text Fill Hue': 0, 'ADBE Text Fill Saturation': 0,
  'ADBE Text Expressible Amount': [100, 100, 100], 'ADBE Text Range Type2': 1,
  'ADBE Text Percent Start': 0, 'ADBE Text Percent End': 100, 'ADBE Text Percent Offset': 0, 'ADBE Text Range Units': 1, 'ADBE Text Selector Mode': 1,
  'ADBE Text Selector Max Amount': 100, 'ADBE Text Range Shape': 1, 'ADBE Text Selector Smoothness': 100, 'ADBE Text Levels Max Ease': 0, 'ADBE Text Levels Min Ease': 0,
  'ADBE Text Randomize Order': 0, 'ADBE Text Random Seed': 0, 'ADBE Text Index Start': 0, 'ADBE Text Index End': 0, 'ADBE Text Index Offset': 0,
  'ADBE Vector Rect Size': [100, 100], 'ADBE Vector Rect Position': [0, 0], 'ADBE Vector Rect Roundness': 0,
  'ADBE Vector Ellipse Size': [100, 100], 'ADBE Vector Ellipse Position': [0, 0],
  'ADBE Vector Star Type': 1, 'ADBE Vector Star Points': 5, 'ADBE Vector Star Position': [0, 0], 'ADBE Vector Star Rotation': 0, 'ADBE Vector Star Inner Radius': 50,
  'ADBE Vector Star Outer Radius': 100, 'ADBE Vector Star Inner Roundess': 0, 'ADBE Vector Star Outer Roundess': 0,
  'ADBE Vector Fill Color': [1, 0, 0, 1], 'ADBE Vector Fill Opacity': 100, 'ADBE Vector Fill Rule': 1,
  'ADBE Vector Stroke Color': [1, 1, 1, 1], 'ADBE Vector Stroke Width': 2, 'ADBE Vector Stroke Opacity': 100, 'ADBE Vector Stroke Line Cap': 1, 'ADBE Vector Stroke Line Join': 1, 'ADBE Vector Stroke Miter Limit': 4,
  'ADBE Vector Stroke Dash 1': 10, 'ADBE Vector Stroke Gap 1': 10, 'ADBE Vector Stroke Offset': 0,
  'ADBE Vector Trim Start': 0, 'ADBE Vector Trim End': 100, 'ADBE Vector Trim Offset': 0, 'ADBE Vector Trim Type': 1,
  'ADBE Vector Repeater Copies': 3, 'ADBE Vector Repeater Offset': 0, 'ADBE Vector Repeater Order': 1,
  'ADBE Vector Repeater Anchor': [0, 0], 'ADBE Vector Repeater Position': [100, 0], 'ADBE Vector Repeater Scale': [100, 100], 'ADBE Vector Repeater Rotation': 0,
  'ADBE Vector Repeater Opacity 1': 100, 'ADBE Vector Repeater Opacity 2': 100,
  'ADBE Vector Anchor': [0, 0], 'ADBE Vector Position': [0, 0], 'ADBE Vector Scale': [100, 100], 'ADBE Vector Skew': 0, 'ADBE Vector Skew Axis': 0, 'ADBE Vector Rotation': 0, 'ADBE Vector Group Opacity': 100,
  'ADBE Vector Zigzag Size': 10, 'ADBE Vector Zigzag Detail': 5, 'ADBE Vector Zigzag Points': 1, 'ADBE Vector RoundCorner Radius': 10, 'ADBE Vector Offset Amount': 0,
  'ADBE Vector Twist Angle': 0, 'ADBE Vector Twist Center': [0, 0], 'ADBE Vector PuckerBloat Amount': 0,
  'ADBE Mask Feather': [0, 0], 'ADBE Mask Opacity': 100, 'ADBE Mask Offset': 0,
};
// named groups and the children they may hold (anything else is reported as unknown)
// effect parameter ranges that differ from the UI (e.g. percentages stored as 0..1) — { matchName: { paramIndex: [min, max] } }
const EFFECT_RANGES = {
  'ADBE Ramp': { 7: [0, 1] },
};
const GROUPS = {
  'ADBE Transform Group': ['ADBE Anchor Point', 'ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity'],
  'ADBE Text Properties': ['ADBE Text Document', 'ADBE Text Path Options', 'ADBE Text More Options', 'ADBE Text Animators'],
  'ADBE Text Path Options': ['ADBE Text Path', 'ADBE Text Reverse Path', 'ADBE Text Perpendicular To Path', 'ADBE Text Force Align Path', 'ADBE Text First Margin', 'ADBE Text Last Margin'],
  'ADBE Text More Options': ['ADBE Text Anchor Point Option', 'ADBE Text Anchor Point Align', 'ADBE Text Render Order', 'ADBE Text Character Blend Mode'],
  'ADBE Text Animator': ['ADBE Text Selectors', 'ADBE Text Animator Properties'],
  'ADBE Text Expressible Selector': ['ADBE Text Expressible Amount', 'ADBE Text Range Type2'],
  'ADBE Text Selector': ['ADBE Text Percent Start', 'ADBE Text Percent End', 'ADBE Text Percent Offset', 'ADBE Text Index Start', 'ADBE Text Index End', 'ADBE Text Index Offset', 'ADBE Text Range Advanced'],
  'ADBE Text Range Advanced': ['ADBE Text Range Units', 'ADBE Text Range Type2', 'ADBE Text Selector Mode', 'ADBE Text Selector Max Amount', 'ADBE Text Range Shape', 'ADBE Text Selector Smoothness', 'ADBE Text Levels Max Ease', 'ADBE Text Levels Min Ease', 'ADBE Text Randomize Order', 'ADBE Text Random Seed'],
  'ADBE Vector Group': ['ADBE Vectors Group', 'ADBE Vector Transform Group', 'ADBE Vector Materials Group'],
  'ADBE Vector Transform Group': ['ADBE Vector Anchor', 'ADBE Vector Position', 'ADBE Vector Scale', 'ADBE Vector Skew', 'ADBE Vector Skew Axis', 'ADBE Vector Rotation', 'ADBE Vector Group Opacity'],
  'ADBE Vector Shape - Rect': ['ADBE Vector Shape Direction', 'ADBE Vector Rect Size', 'ADBE Vector Rect Position', 'ADBE Vector Rect Roundness'],
  'ADBE Vector Shape - Ellipse': ['ADBE Vector Shape Direction', 'ADBE Vector Ellipse Size', 'ADBE Vector Ellipse Position'],
  'ADBE Vector Shape - Star': ['ADBE Vector Shape Direction', 'ADBE Vector Star Type', 'ADBE Vector Star Points', 'ADBE Vector Star Position', 'ADBE Vector Star Rotation', 'ADBE Vector Star Inner Radius', 'ADBE Vector Star Outer Radius', 'ADBE Vector Star Inner Roundess', 'ADBE Vector Star Outer Roundess'],
  'ADBE Vector Shape - Group': ['ADBE Vector Shape Direction', 'ADBE Vector Shape'],
  'ADBE Vector Graphic - Fill': ['ADBE Vector Blend Mode', 'ADBE Vector Composite Order', 'ADBE Vector Fill Rule', 'ADBE Vector Fill Color', 'ADBE Vector Fill Opacity'],
  'ADBE Vector Graphic - Stroke': ['ADBE Vector Blend Mode', 'ADBE Vector Composite Order', 'ADBE Vector Stroke Color', 'ADBE Vector Stroke Opacity', 'ADBE Vector Stroke Width', 'ADBE Vector Stroke Line Cap', 'ADBE Vector Stroke Line Join', 'ADBE Vector Stroke Miter Limit', 'ADBE Vector Stroke Dashes'],
  'ADBE Vector Filter - Trim': ['ADBE Vector Trim Start', 'ADBE Vector Trim End', 'ADBE Vector Trim Offset', 'ADBE Vector Trim Type'],
  'ADBE Vector Filter - Repeater': ['ADBE Vector Repeater Copies', 'ADBE Vector Repeater Offset', 'ADBE Vector Repeater Order', 'ADBE Vector Repeater Transform'],
  'ADBE Vector Repeater Transform': ['ADBE Vector Repeater Anchor', 'ADBE Vector Repeater Position', 'ADBE Vector Repeater Scale', 'ADBE Vector Repeater Rotation', 'ADBE Vector Repeater Opacity 1', 'ADBE Vector Repeater Opacity 2'],
  'ADBE Vector Filter - Zigzag': ['ADBE Vector Zigzag Size', 'ADBE Vector Zigzag Detail', 'ADBE Vector Zigzag Points'],
  'ADBE Vector Filter - RC': ['ADBE Vector RoundCorner Radius'],
  'ADBE Vector Filter - Offset': ['ADBE Vector Offset Amount', 'ADBE Vector Offset Line Join', 'ADBE Vector Offset Miter Limit'],
  'ADBE Vector Filter - Twist': ['ADBE Vector Twist Angle', 'ADBE Vector Twist Center'],
  'ADBE Vector Filter - PB': ['ADBE Vector PuckerBloat Amount'],
  'ADBE Mask Atom': ['ADBE Mask Shape', 'ADBE Mask Feather', 'ADBE Mask Opacity', 'ADBE Mask Offset'],
};
// indexed groups: what addProperty may add
const INDEXED = {
  'ADBE Effect Parade': Object.keys(EFFECTS),
  'ADBE Mask Parade': ['ADBE Mask Atom'],
  'ADBE Text Animators': ['ADBE Text Animator'],
  'ADBE Text Selectors': ['ADBE Text Selector', 'ADBE Text Expressible Selector'],
  'ADBE Text Animator Properties': ['ADBE Text Position 3D', 'ADBE Text Anchor Point 3D', 'ADBE Text Scale 3D', 'ADBE Text Skew', 'ADBE Text Skew Axis', 'ADBE Text Rotation', 'ADBE Text Opacity',
    'ADBE Text Fill Color', 'ADBE Text Stroke Color', 'ADBE Text Fill Opacity', 'ADBE Text Stroke Opacity', 'ADBE Text Stroke Width', 'ADBE Text Tracking Amount', 'ADBE Text Line Spacing',
    'ADBE Text Character Offset', 'ADBE Text Blur', 'ADBE Text Line Anchor', 'ADBE Text Fill Brightness', 'ADBE Text Fill Hue', 'ADBE Text Fill Saturation'],
  'ADBE Root Vectors Group': null, 'ADBE Vectors Group': null,
  // like AE: a stroke's Dashes group is empty until Dash / Gap / Offset are added with addProperty
  'ADBE Vector Stroke Dashes': ['ADBE Vector Stroke Dash 1', 'ADBE Vector Stroke Gap 1', 'ADBE Vector Stroke Dash 2', 'ADBE Vector Stroke Gap 2', 'ADBE Vector Stroke Dash 3', 'ADBE Vector Stroke Gap 3', 'ADBE Vector Stroke Offset'],
};
const VECTOR_ITEMS = ['ADBE Vector Group', 'ADBE Vector Shape - Rect', 'ADBE Vector Shape - Ellipse', 'ADBE Vector Shape - Star', 'ADBE Vector Shape - Group',
  'ADBE Vector Graphic - Fill', 'ADBE Vector Graphic - Stroke', 'ADBE Vector Filter - Trim', 'ADBE Vector Filter - Repeater', 'ADBE Vector Filter - Zigzag',
  'ADBE Vector Filter - RC', 'ADBE Vector Filter - Offset', 'ADBE Vector Filter - Twist', 'ADBE Vector Filter - PB'];
INDEXED['ADBE Root Vectors Group'] = VECTOR_ITEMS; INDEXED['ADBE Vectors Group'] = VECTOR_ITEMS;
const isColorName = mn => /Color|Map (Black|White) To|Highlights|Midtones|Shadows$/.test(mn);

function makeStats() { return { unknown: new Set(), exprs: 0, exprErrors: [], layers: 0, comps: 0, effects: {}, animators: 0, problems: [] }; }

// ---------------------------------------------------------------- Shape / TextDocument
class Shape { constructor() { this.vertices = []; this.inTangents = []; this.outTangents = []; this.closed = true; this.featherSegLocs = []; } }
class TextDocument {
  constructor(t) { this.text = t; this.fontSize = 36; this.font = 'ArialMT'; this.fillColor = [1, 1, 1]; this.strokeColor = [0, 0, 0]; this.strokeWidth = 0;
    this.applyFill = true; this.applyStroke = false; this.strokeOverFill = false; this.tracking = 0; this.leading = 0; this.autoLeading = true;
    this.justification = 'left'; this.fauxBold = false; this.fauxItalic = false; this.allCaps = false; this.smallCaps = false; this.baselineShift = 0;
    this.horizontalScale = 1; this.verticalScale = 1; this.boxText = false; }
  resetCharStyle() {} resetParagraphStyle() {}
  clone() { const t = new TextDocument(this.text); Object.assign(t, JSON.parse(JSON.stringify(this))); return t; }
}
class KeyframeEase { constructor(speed, influence) { this.speed = speed; this.influence = influence; } }
const deep = v => v == null ? v : (Array.isArray(v) ? v.slice() : (v instanceof TextDocument ? v.clone() : (v instanceof Shape ? cloneShape(v) : v)));
const cloneShape = s => { const n = new Shape(); n.vertices = s.vertices.map(p => p.slice()); n.inTangents = (s.inTangents || []).map(p => p.slice()); n.outTangents = (s.outTangents || []).map(p => p.slice()); n.closed = s.closed; return n; };

// ---------------------------------------------------------------- properties
let PID = 1;
// ---- script references (AE semantics): adding / removing / moving / duplicating a property inside a group makes every
// reference the script already holds to the OTHER members of that group (and anything below them) invalid —
// "Object is invalid". Returned properties are proxies that remember the change counters of their ancestor groups.
const unwrapArg = a => (a && typeof a === 'object' && a.__raw) ? a.__raw : a;
function wrap(p) {
  if (!p || typeof p !== 'object' || p.isLayer || !p.env || p.env.refCheck === false) return p;
  if (p.__raw) return p;
  const snap = []; let a = p.parentProperty;
  while (a && !a.isLayer) { snap.push([a, a._mut | 0]); a = a.parentProperty; }
  const check = (k) => {
    if (p._dead) throw new Error('Object is invalid (removed ' + p.matchName + ')');
    for (let i = 0; i < snap.length; i++) if ((snap[i][0]._mut | 0) !== snap[i][1]) {
      p.env.stats.invalidRefs = (p.env.stats.invalidRefs || 0) + 1;
      throw new Error('Object is invalid: ' + p.matchName + ' (' + String(k) + ') — a property was added / removed / moved in ' + snap[i][0].matchName + ' after this reference was taken');
    }
  };
  return new Proxy(p, {
    get(t, k) {
      if (k === '__raw') return t;
      if (typeof k === 'symbol') return t[k];
      check(k);
      const v = t[k];
      return typeof v === 'function' ? function () { return v.apply(t, Array.prototype.map.call(arguments, unwrapArg)); } : v;
    },
    set(t, k, v) { check(k); t[k] = unwrapArg(v); return true; },
  });
}
class Prop {
  constructor(mn, parent, env, kind) {
    this.matchName = mn; this.name = mn; this.parentProperty = parent; this.env = env; this.id = PID++;
    this.kind = kind || (GROUPS[mn] ? 'named' : (mn in INDEXED ? 'indexed' : 'prop'));
    this.children = []; this._v = undefined; this._expr = ''; this.expressionEnabled = true; this.keys = []; this.enabled = true;
    if (this.kind === 'prop' && DEFAULTS[mn] !== undefined) this._v = deep(DEFAULTS[mn]);
  }
  get propertyType() { return this.kind === 'prop' ? PropertyType.PROPERTY : this.kind === 'indexed' ? PropertyType.INDEXED_GROUP : PropertyType.NAMED_GROUP; }
  get numProperties() { return this.children.length; }
  get propertyIndex() { return this.parentProperty ? this.parentProperty.children.indexOf(this) + 1 : 1; }
  get propertyDepth() { let d = 0, p = this.parentProperty; while (p) { d++; p = p.parentProperty; } return d; }
  get canSetExpression() { return this.kind === 'prop'; }
  get isEffect() { return !!this._isEffect; }
  get isMask() { return this.matchName === 'ADBE Mask Atom'; }
  get layer() { let p = this; while (p && !p.isLayer) p = p.parentProperty; return p; }
  problem(m) { this.env.stats.problems.push(m); }
  _child(mn, create) {
    let c = this.children.find(x => x.matchName === mn || x.name === mn);
    if (c || !create) return c || null;
    return this._make(mn);
  }
  _make(mn) {
    const c = new Prop(mn, this, this.env);
    if (!(mn in DEFAULTS) && !GROUPS[mn] && !(mn in INDEXED) && mn !== 'ADBE Text Document' && mn !== 'ADBE Mask Shape' && mn !== 'ADBE Vector Shape' && mn !== 'ADBE Vector Shape Direction'
      && mn !== 'ADBE Vector Blend Mode' && mn !== 'ADBE Vector Composite Order' && mn !== 'ADBE Vector Offset Line Join' && mn !== 'ADBE Vector Offset Miter Limit' && mn !== 'ADBE Vector Materials Group') this.env.stats.unknown.add(mn);
    this.children.push(c);
    return c;
  }
  property(k) { return wrap(this._property(k)); }
  _property(k) {
    if (this.kind === 'prop') throw new Error(`${this.matchName} is not a group`);
    if (typeof k === 'number') {
      if (this._isEffect) {
        const spec = EFFECTS[this.matchName];
        if (!spec || k < 1 || k > spec.length) throw new Error(`effect ${this.matchName} has no parameter #${k}`);
        return this.children[k - 1];
      }
      if (this.kind === 'named') {
        const list = GROUPS[this.matchName];
        if (k < 1 || k > list.length) throw new Error(`${this.matchName} has no property #${k}`);
        return this._child(list[k - 1], true);
      }
      if (k < 1 || k > this.children.length) throw new Error(`${this.matchName}: no property #${k} (has ${this.children.length})`);
      return this.children[k - 1];
    }
    if (this._isEffect) {
      const m = String(k).match(/-(\d{4})$/);
      if (m && k.indexOf(this.matchName) === 0) return this._property(+m[1]);
      const i = EFFECTS[this.matchName].findIndex(p => p[0] === k);
      if (i >= 0) return this.children[i];
      throw new Error(`effect ${this.matchName}: unknown parameter "${k}" (use the parameter index)`);
    }
    const found = this._child(k, false);
    if (found) return found;
    if (this.kind === 'named') {
      if (GROUPS[this.matchName].indexOf(k) < 0) this.env.stats.unknown.add(this.matchName + ' > ' + k);
      return this._make(k);
    }
    return null;   // indexed groups: AE returns null for a missing named child
  }
  addProperty(mn) { this._mut = (this._mut | 0) + 1; return wrap(this._addProperty(mn)); }
  _addProperty(mn) {
    if (this.kind !== 'indexed') throw new Error(`cannot addProperty on ${this.matchName}`);
    mn = EFFECT_ALIASES[mn] || mn;
    const allowed = INDEXED[this.matchName];
    if (allowed && allowed.indexOf(mn) < 0) {
      if (this.matchName === 'ADBE Effect Parade') throw new Error(`effect not in the JIZURA whitelist: ${mn}`);
      this.env.stats.unknown.add(mn);
    }
    const c = new Prop(mn, this, this.env, this.matchName === 'ADBE Effect Parade' ? 'effect' : undefined);
    this.children.push(c);
    if (this.matchName === 'ADBE Effect Parade') {
      c._isEffect = true; c.kind = 'effect'; c.enabled = true;
      this.env.stats.effects[mn] = (this.env.stats.effects[mn] || 0) + 1;
      const L = this.parentProperty, mid = L && L.isLayer ? [L.width / 2, L.height / 2] : [0, 0];   // point params default to the layer centre, as in AE
      EFFECTS[mn].forEach(([n, d], i) => { const p = new Prop(mn + '-' + String(i + 1).padStart(4, '0'), c, this.env, 'prop'); p.name = n; p._v = d === null ? mid.slice() : deep(d); p._effectParam = i + 1; c.children.push(p); });
    }
    if (mn === 'ADBE Text Animator') { this.env.stats.animators++; c._child('ADBE Text Selectors', true); c._child('ADBE Text Animator Properties', true); }
    if (mn === 'ADBE Mask Atom') { c.maskMode = MaskMode.ADD; c.inverted = false; c._child('ADBE Mask Shape', true); c._child('ADBE Mask Feather', true); c._child('ADBE Mask Opacity', true); c._child('ADBE Mask Offset', true); }
    if (mn === 'ADBE Vector Group') { c._child('ADBE Vectors Group', true); c._child('ADBE Vector Transform Group', true); }
    if (mn === 'ADBE Vector Filter - Repeater') c._child('ADBE Vector Repeater Transform', true);
    if (mn === 'ADBE Text Selector') c._child('ADBE Text Range Advanced', true);
    return c;
  }
  canAddProperty(mn) { return this.kind === 'indexed' && (!INDEXED[this.matchName] || INDEXED[this.matchName].indexOf(EFFECT_ALIASES[mn] || mn) >= 0); }
  // ---- values
  _check(v) {
    const mn = this.matchName;
    if (v === undefined || v === null) throw new Error(`bad value for ${mn}: ${v}`);
    if (v instanceof TextDocument) return v;
    if (v instanceof Shape) {     // values may come from another realm (the ES3 test realm): normalise to plain arrays
      const n = new Shape(), pts = a => Array.from(a || [], p => Array.from(p));
      n.vertices = pts(v.vertices); n.inTangents = pts(v.inTangents); n.outTangents = pts(v.outTangents); n.closed = v.closed !== false && v.closed !== 0;
      if (n.inTangents.length && n.inTangents.length !== n.vertices.length) this.problem('shape: inTangents length differs from vertices');
      return n;
    }
    if (v && typeof v === 'object' && typeof v.length === 'number') v = Array.from(v);
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') { if (!isFinite(v)) throw new Error(`bad value for ${mn}: ${v}`); return v; }
    if (Array.isArray(v)) {
      if (!v.length || v.some(x => typeof x !== 'number' || !isFinite(x))) throw new Error(`bad value for ${mn}: ${JSON.stringify(v)}`);
      if ((isColorName(mn) || (this._effectParam && isColorName(this.name))) && v.some(x => x > 1.0001 || x < -0.0001)) this.problem(`colour out of 0..1 range on ${this.name}: ${JSON.stringify(v)}`);
      return v.slice();
    }
    throw new Error(`bad value type for ${mn}: ${typeof v}`);
  }
  // real AE value ranges of effect parameters (from the probe of an actual After Effects); setValue outside throws like AE does
  _range() { const P = this.parentProperty; if (!this._effectParam || !P) return null; const r = EFFECT_RANGES[P.matchName]; return r ? r[this._effectParam] || null : null; }
  setValue(v) {
    if (this.kind !== 'prop') throw new Error(`cannot setValue on group ${this.matchName}`);
    const r = this._range();
    if (r && typeof v === 'number' && (v < r[0] - 1e-9 || v > r[1] + 1e-9)) throw new Error(`After Effects error: value ${v} out of range ${r[0]}..${r[1]} for ${this.parentProperty.matchName} #${this._effectParam} (${this.name})`);
    this._v = this._check(v); if (this.keys.length) this.problem(`setValue on keyframed ${this.name}`);
  }
  get value() {
    if (this.kind !== 'prop') return undefined;
    if (this.matchName === 'ADBE Text Document' && this._v == null) this._v = new TextDocument('');
    if (this.keys.length) return deep(this.keys[0].v);
    return deep(this._v);
  }
  valueAtTime(t) { return this.env.staticValueAt ? this.env.staticValueAt(this, t) : this.value; }
  setValueAtTime(t, v) {
    v = this._check(v);
    const i = this.keys.findIndex(k => Math.abs(k.t - t) < 1e-6);
    const k = { t, v, inI: 'linear', outI: 'linear' };
    if (i >= 0) this.keys[i] = k; else { this.keys.push(k); this.keys.sort((a, b) => a.t - b.t); }
    return this.keys.indexOf(k) + 1;
  }
  setValuesAtTimes(ts, vs) { Array.from(ts).forEach((t, i) => this.setValueAtTime(t, vs[i])); }
  get numKeys() { return this.keys.length; }
  keyTime(i) { return this.keys[i - 1].t; }
  keyValue(i) { return deep(this.keys[i - 1].v); }
  nearestKeyIndex(t) { let b = 1, bd = 1e9; this.keys.forEach((k, i) => { const d = Math.abs(k.t - t); if (d < bd) { bd = d; b = i + 1; } }); return b; }
  removeKey(i) { this.keys.splice(i - 1, 1); }
  setInterpolationTypeAtKey(i, inT, outT) { const k = this.keys[i - 1]; if (!k) throw new Error('no key ' + i); k.inI = inT; k.outI = outT == null ? inT : outT; }
  setTemporalEaseAtKey() {} setTemporalContinuousAtKey() {} setTemporalAutoBezierAtKey() {} setSpatialTangentsAtKey() {}
  get isTimeVarying() { return this.keys.length > 0 || !!this._expr; }
  set expression(s) {
    if (this.kind !== 'prop') throw new Error(`cannot set an expression on ${this.matchName}`);
    this.env.stats.exprs++;
    s = String(s);
    const err = checkSyntax(s);
    if (err) {
      const m = /\((\d+):(\d+)\)/.exec(err), ln = m ? s.split('\n')[+m[1] - 1] || '' : '', col = m ? +m[2] : 0;
      this.env.stats.exprErrors.push(`${this.name}: ${err}\n    …${ln.slice(Math.max(0, col - 120), col)}⟦${ln.slice(col, col + 60)}⟧`);
    }
    this._expr = s;
  }
  get expression() { return this._expr; }
  get expressionError() { return ''; }
  get dimensionsSeparated() { return false; } set dimensionsSeparated(v) { if (v) this.problem('dimensionsSeparated is not supported by JIZURA'); }
  remove() { const p = this.parentProperty; if (p) { p._mut = (p._mut | 0) + 1; p.children.splice(p.children.indexOf(this), 1); } this._dead = true; }
  moveTo(i) { const p = this.parentProperty; p._mut = (p._mut | 0) + 1; p.children.splice(p.children.indexOf(this), 1); p.children.splice(i - 1, 0, this); }
  duplicate() { const c = cloneProp(this, this.parentProperty); const p = this.parentProperty; p._mut = (p._mut | 0) + 1; p.children.splice(p.children.indexOf(this) + 1, 0, c); return wrap(c); }
}
function checkSyntax(s) {
  try {
    if (acorn) acorn.parse(s, { ecmaVersion: 2018, allowReturnOutsideFunction: true });
    else new Function(s);   // browser: compile check
    return null;
  } catch (e) { return e.message; }
}
function cloneProp(src, parent) {
  const c = new Prop(src.matchName, parent, src.env, src.kind);
  c.name = src.name; c._v = deep(src._v); c._expr = src._expr; c.expressionEnabled = src.expressionEnabled; c.enabled = src.enabled;
  c.keys = src.keys.map(k => Object.assign({}, k, { v: deep(k.v) }));
  c._isEffect = src._isEffect; c._effectParam = src._effectParam; c.maskMode = src.maskMode; c.inverted = src.inverted;
  c.children = src.children.map(ch => cloneProp(ch, c));
  return c;
}

// ---------------------------------------------------------------- layers
class Layer extends Prop {
  constructor(comp, kind, o) {
    super('ADBE ' + kind + ' Layer', null, comp.env, 'named');
    this.isLayer = true; this.comp = comp; this.kindName = kind; this.env.stats.layers++;
    this.name = (o && o.name) || kind; this._startTime = 0; this._in = 0; this._out = comp.duration; this._parent = null;
    this.blendingMode = BlendingMode.NORMAL; this.adjustmentLayer = false; this.trackMatteType = TrackMatteType.NO_TRACK_MATTE; this.enabled = true;
    this.shy = false; this.locked = false; this.solo = false; this.motionBlur = false; this.guideLayer = false; this.label = 0; this.nullLayer = kind === 'Null'; this.threeDLayer = false;
    this.timeRemapEnabledFlag = false; this.stretch = 100; this.comment = '';
    this.source = (o && o.source) || null;
    const tr = this.property('ADBE Transform Group');
    ['ADBE Anchor Point', 'ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity'].forEach(m => tr.property(m));
    tr.property('ADBE Position')._v = [comp.width / 2, comp.height / 2];
    if (kind === 'Text') { const tp = this.property('ADBE Text Properties'); tp.property('ADBE Text Document')._v = new TextDocument(o.text); tp.property('ADBE Text Path Options'); tp.property('ADBE Text More Options'); tp.property('ADBE Text Animators'); }
    if (kind === 'Shape') this.property('ADBE Root Vectors Group');
    if (this.source && this.source.width) tr.property('ADBE Anchor Point')._v = [this.source.width / 2, this.source.height / 2];
    if (kind === 'Null') tr.property('ADBE Anchor Point')._v = [50, 50];
    if (this.source && this.source.duration != null && kind === 'AV') this._out = Math.min(comp.duration, this.source.duration);
    this.property('ADBE Effect Parade'); this.property('ADBE Mask Parade');
  }
  property(k) {
    if (typeof k === 'string') {
      let c = this.children.find(x => x.matchName === k || x.name === k);
      if (c) return wrap(c);
      const allowed = ['ADBE Transform Group', 'ADBE Effect Parade', 'ADBE Mask Parade', 'ADBE Marker', 'ADBE Time Remapping'].concat(this.kindName === 'Text' ? ['ADBE Text Properties'] : []).concat(this.kindName === 'Shape' ? ['ADBE Root Vectors Group'] : []);
      if (allowed.indexOf(k) < 0) { this.env.stats.unknown.add(this.kindName + ' layer > ' + k); return null; }
      c = new Prop(k, this, this.env); this.children.push(c); return wrap(c);
    }
    return super.property(k);
  }
  get index() { return this.comp._layers.indexOf(this) + 1; }
  get containingComp() { return this.comp; }
  get width() { return this.source ? this.source.width : (this.kindName === 'Null' ? 100 : this.comp.width); }
  get height() { return this.source ? this.source.height : (this.kindName === 'Null' ? 100 : this.comp.height); }
  get startTime() { return this._startTime; }
  set startTime(t) { const d = t - this._startTime; this._startTime = t; this._in += d; this._out += d; }
  // AE keeps a (non-time-remapped) precomp / footage layer inside its source: in >= startTime, out <= startTime + source duration
  get _bounded() { return this.kindName === 'AV' && this.source && this.source.duration != null && !this.timeRemapEnabledFlag; }
  get inPoint() { return this._in; }
  set inPoint(t) { if (!isFinite(t)) throw new Error('bad inPoint'); this._in = this._bounded ? Math.max(t, this._startTime) : t; }
  get outPoint() { return this._out; }
  set outPoint(t) { if (!isFinite(t)) throw new Error('bad outPoint'); this._out = this._bounded ? Math.min(t, this._startTime + this.source.duration) : t; }
  get timeRemapEnabled() { return this.timeRemapEnabledFlag; }
  set timeRemapEnabled(v) {
    if (this.kindName !== 'AV') throw new Error('time remapping needs a precomp / footage layer');
    this.timeRemapEnabledFlag = !!v;
    if (v) { const p = this.property('ADBE Time Remapping'); if (!p.keys.length) { p.setValueAtTime(this.inPoint, 0); p.setValueAtTime(this.outPoint, this.source.duration - 1 / this.comp.frameRate); } }
  }
  get parent() { return this._parent; }
  // like AE's pick-whip: the child keeps its place on screen (its transform values are converted into the parent's space)
  set parent(p) {
    if (p && p.comp !== this.comp) throw new Error('parent must be in the same comp');
    const W = L => worldOf(L), from = this._parent ? W(this._parent) : ID, to = p ? W(p) : ID;
    this._parent = p || null;
    if (from.a === to.a && from.b === to.b && from.c === to.c && from.d === to.d && from.e === to.e && from.f === to.f) return;
    const tr = this.property('ADBE Transform Group'), P = tr.property('ADBE Position'), Sx = tr.property('ADBE Scale'), Rz = tr.property('ADBE Rotate Z');
    const inv = invert(to), M = mulM(inv, from);           // old parent space -> new parent space
    const rot = Math.atan2(M.b, M.a) * 180 / Math.PI, sx = Math.hypot(M.a, M.b), sy = Math.hypot(M.c, M.d);
    const mapP = v => [M.a * v[0] + M.c * v[1] + M.e, M.b * v[0] + M.d * v[1] + M.f].concat(v.length > 2 ? [v[2]] : []);
    if (P.keys.length) P.keys.forEach(k => { k.v = mapP(k.v); }); else P._v = mapP(P._v);
    const fixS = v => [v[0] * sx, v[1] * sy].concat(v.length > 2 ? [v[2]] : []);
    if (Math.abs(sx - 1) > 1e-6 || Math.abs(sy - 1) > 1e-6) { if (Sx.keys.length) Sx.keys.forEach(k => { k.v = fixS(k.v); }); else Sx._v = fixS(Sx._v); }
    if (Math.abs(rot) > 1e-6) { if (Rz.keys.length) Rz.keys.forEach(k => { k.v += rot; }); else Rz._v += rot; }
  }
  setParentWithJump(p) { this._parent = p || null; }
  sourceRectAtTime(t, ext) { return this.env.measureRect ? this.env.measureRect(this, t || 0, ext) : roughRect(this); }
  sourcePointToComp(p) { return p; } compPointToSource(p) { return p; }
  duplicate() {
    const L = new Layer(this.comp, this.kindName, { name: this.name, source: this.source, text: '' });
    L.children = this.children.map(ch => cloneProp(ch, L));
    ['_startTime', '_in', '_out', 'blendingMode', 'adjustmentLayer', 'trackMatteType', 'enabled', 'timeRemapEnabledFlag', 'nullLayer', 'guideLayer'].forEach(k => { L[k] = this[k]; });
    L._parent = this._parent;
    this.comp._layers.splice(this.comp._layers.indexOf(this), 0, L);
    return L;
  }
  _move(to) { const a = this.comp._layers; a.splice(a.indexOf(this), 1); a.splice(to, 0, this); }
  moveToBeginning() { this._move(0); } moveToEnd() { this._move(this.comp._layers.length); }
  moveBefore(o) { const a = this.comp._layers; const i = a.indexOf(this); if (i >= 0) a.splice(i, 1); a.splice(Math.max(0, a.indexOf(o)), 0, this); }
  moveAfter(o) { const a = this.comp._layers; const i = a.indexOf(this); if (i >= 0) a.splice(i, 1); a.splice(a.indexOf(o) + 1, 0, this); }
  remove() { const a = this.comp._layers; const i = a.indexOf(this); if (i >= 0) a.splice(i, 1); }
  get hasVideo() { return this.kindName !== 'Null' && !(this.source && this.source.audioOnly); } get hasAudio() { return !!(this.source && this.source.hasAudio); }
  applyPreset() { throw new Error('applyPreset is not available in JIZURA'); }
  openInViewer() {}
}
// 2D affine helpers for parenting (static / first-key values; expressions are not evaluated here)
const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
function mulM(m, n) { return { a: m.a * n.a + m.c * n.b, b: m.b * n.a + m.d * n.b, c: m.a * n.c + m.c * n.d, d: m.b * n.c + m.d * n.d, e: m.a * n.e + m.c * n.f + m.e, f: m.b * n.e + m.d * n.f + m.f }; }
function invert(m) { const det = m.a * m.d - m.b * m.c || 1e-9; return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det }; }
function localOf(L) {
  const tr = L.property('ADBE Transform Group'), a = tr.property('ADBE Anchor Point').value, p = tr.property('ADBE Position').value, s = tr.property('ADBE Scale').value, r = tr.property('ADBE Rotate Z').value * Math.PI / 180;
  const cs = Math.cos(r), sn = Math.sin(r), sx = s[0] / 100, sy = s[1] / 100;
  const m = { a: cs * sx, b: sn * sx, c: -sn * sy, d: cs * sy, e: 0, f: 0 };
  m.e = p[0] - (m.a * a[0] + m.c * a[1]); m.f = p[1] - (m.b * a[0] + m.d * a[1]);
  return m;
}
function worldOf(L) { let m = localOf(L), P = L._parent, g = 0; while (P && g++ < 30) { m = mulM(localOf(P), m); P = P._parent; } return m; }
function roughRect(L) {
  if (L.kindName !== 'Text') return { left: -50, top: -50, width: 100, height: 100 };
  const td = L.property('ADBE Text Properties').property('ADBE Text Document').value;
  const lines = String(td.text).split(/\r|\n/);
  const cw = ch => /[\u0000-ÿ]/.test(ch) ? 0.56 : 1;
  const maxW = Math.max(...lines.map(l => [...l].reduce((a, ch) => a + cw(ch), 0) + [...l].length * td.tracking / 1000)) * td.fontSize;
  const lead = td.autoLeading ? td.fontSize * 1.2 : td.leading;
  const h = td.fontSize * 0.88 + (lines.length - 1) * lead;
  const x0 = td.justification === 'center' ? -maxW / 2 : td.justification === 'right' ? -maxW : 0;
  return { left: x0, top: -td.fontSize * 0.8, width: maxW, height: h };
}

// ---------------------------------------------------------------- comps / project
class Comp {
  constructor(env, name, w, h, pa, d, fps) {
    if (!(w >= 4 && h >= 4 && w <= 30000 && h <= 30000 && d > 0 && fps > 0)) throw new Error(`bad comp ${name} ${w}x${h} d=${d} fps=${fps}`);
    if (Math.round(w) !== w || Math.round(h) !== h) env.stats.problems.push(`comp size must be integers: ${w}x${h}`);
    this.env = env; this.name = name; this.width = w; this.height = h; this.pixelAspect = pa; this.duration = d; this.frameRate = fps; this._layers = []; env.stats.comps++;
    this.bgColor = [0, 0, 0]; this.workAreaStart = 0; this.workAreaDuration = d; this.parentFolder = null; this.typeName = 'Composition';
    this.id = env.nextId = (env.nextId || 0) + 1; this.selectedLayers = [];
    const self = this;
    const add = (L) => { self._layers.unshift(L); return L; };
    this.layers = {
      addText(t) { if (typeof t !== 'string') throw new Error('addText needs a string'); return add(new Layer(self, 'Text', { text: t, name: t.replace(/\r/g, ' ').slice(0, 30) })); },
      addShape() { return add(new Layer(self, 'Shape', { name: 'Shape Layer' })); },
      addNull(dur) { const L = new Layer(self, 'Null', { name: 'Null' }); if (dur) L._out = dur; return add(L); },
      addSolid(c, n, w, h, pa, dur) {
        c = c && typeof c.length === 'number' ? Array.from(c) : c;
        if (!Array.isArray(c) || c.length !== 3 || c.some(x => !(x >= 0 && x <= 1))) throw new Error('solid colour must be [r,g,b] in 0..1: ' + JSON.stringify(c));
        if (!(w >= 1 && h >= 1)) throw new Error('bad solid size'); const src = { kind: 'solid', color: c.slice(), width: Math.round(w), height: Math.round(h), duration: null };
        const L = new Layer(self, 'Solid', { name: n, source: src }); if (dur) L._out = Math.min(self.duration, dur); return add(L);
      },
      add(item) { if (!item) throw new Error('add(undefined)'); const L = new Layer(self, 'AV', { name: item.name, source: item }); return add(L); },
      addCamera() { throw new Error('cameras are not used by JIZURA (2D only)'); },
      addLight() { throw new Error('lights are not used by JIZURA'); },
      addBoxText() { throw new Error('use point text (addText)'); },
      byName(n) { return self._layers.find(l => l.name === n) || null; },
      get length() { return self._layers.length; },
    };
    this.markerProperty = new Prop('ADBE Marker', null, env);
  }
  get numLayers() { return this._layers.length; }
  get frameDuration() { return 1 / this.frameRate; }
  layer(i) { return typeof i === 'number' ? this._layers[i - 1] : this._layers.find(l => l.name === i); }
  // like AE's CompItem.duplicate(): same layers (properties, expressions, parenting, switches), new comp
  duplicate() {
    const c = new Comp(this.env, this.name + ' 2', this.width, this.height, this.pixelAspect, this.duration, this.frameRate);
    this.env.comps.push(c); c.bgColor = this.bgColor.slice();
    const map = new Map();
    for (const L of this._layers) {
      const N = new Layer(c, L.kindName, { name: L.name, source: L.source, text: '' });
      N.children = L.children.map(ch => cloneProp(ch, N));
      ['_startTime', '_in', '_out', 'blendingMode', 'adjustmentLayer', 'trackMatteType', 'enabled', 'timeRemapEnabledFlag', 'nullLayer', 'guideLayer', 'comment', 'shy', 'motionBlur', 'label', 'stretch'].forEach(k => { N[k] = L[k]; });
      c._layers.push(N); map.set(L, N);
    }
    for (const L of this._layers) if (L._parent) map.get(L)._parent = map.get(L._parent) || null;
    return c;
  }
  openInViewer() {}
}
function makeEnv(opts) {
  opts = opts || {};
  const env = { stats: makeStats(), comps: [], measureRect: opts.measureRect || null, staticValueAt: opts.staticValueAt || null, refCheck: opts.refCheck !== false };
  const items = [];
  const project = {
    items: {
      addComp(...a) { const c = new Comp(env, ...a); env.comps.push(c); items.push(c); return c; },
      addFolder(n) { const f = { name: n, typeName: 'Folder', items: [] }; items.push(f); return f; },
      get length() { return items.length; },
    },
    // test hook (not AE API): an imported audio file
    _addFootage(o) { const f = { name: o.name, id: env.nextId = (env.nextId || 0) + 1, file: { fsName: o.path, name: o.name }, duration: o.duration || 10, hasAudio: true, audioOnly: true, width: 0, height: 0, typeName: 'Footage', parentFolder: null }; items.push(f); return f; },
    item(i) { return items[i - 1]; },
    get numItems() { return items.length; },
    activeItem: null, bitsPerChannel: 8,
  };
  const fontsInstalled = opts.fonts || null;   // function(psName) -> bool, or null (unknown)
  const app = {
    project, version: '24.0', language: 'ja',
    settings: { haveSetting: () => false, getSetting: () => '', saveSetting: () => {} },
    beginUndoGroup() {}, endUndoGroup() {}, beginSuppressDialogs() {}, endSuppressDialogs() {}, executeCommand() {}, findMenuCommandId: () => 0,
    fonts: fontsInstalled ? { getFontsByPostScriptName: ps => (fontsInstalled(ps) ? [{ postScriptName: ps }] : []) } : undefined,
  };
  const ctx = {
    app, Shape, TextDocument, KeyframeEase, BlendingMode, TrackMatteType, KeyframeInterpolationType, ParagraphJustification, MaskMode, PropertyType,
    alert: (m) => { ctx.__alerts.push(String(m)); }, __alerts: [], $: { writeln() {}, sleep() {} },
    Panel: class {}, Window: class {}, CompItem: Comp, FolderItem: Object, File: function () {}, Folder: function () {}, ScriptUI: {},
    JSON, Math, Date, String, Number, Array, Object, RegExp, Error, parseInt, parseFloat, isFinite, isNaN, encodeURIComponent, decodeURIComponent,
  };
  env.ctx = ctx; env.app = app;
  return env;
}
return { makeEnv, EFFECTS, DEFAULTS, GROUPS, INDEXED, Shape, TextDocument, Layer, Comp, Prop, BlendingMode, TrackMatteType, KeyframeInterpolationType, ParagraphJustification, MaskMode };
});
