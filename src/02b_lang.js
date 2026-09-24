/* ============================================================
   JIZURA — lyric language: auto-detection + per-language faces
   The styles are designed around Japanese fonts. For Chinese
   (Traditional / Simplified) and Korean lyrics every font key is
   drawn with a face that has the glyphs, chosen to keep the same
   character (gothic → sans, mincho → serif, pop → rounded, …).
   project.lang: 'auto' | 'ja' | 'zh-Hant' | 'zh-Hans' | 'ko'
   ============================================================ */
(() => {
'use strict';

J.LANGS = ['auto', 'ja', 'zh-Hant', 'zh-Hans', 'ko'];
J.LANG_LABEL = { auto: '自動判定', ja: '日本語', 'zh-Hant': '繁體中文', 'zh-Hans': '简体中文', ko: '한국어' };

/* characters that differ between Traditional and Simplified Chinese (same order in both strings) */
const TC = '們個說這會對時來還後過國開關與為從問間見長東車門愛聽學讓話號發點無現體經電實樣聲變離氣夢給覺當歡陽戀邊頭淚誰歲遠嗎萬難寫應讀憶樂麼麗傷將總結終紅綠線顏風飛鳥謝語請認識熱燈願獨夠紀帶滿靜輕別腦臉懷謊錯顆陣場讚淺溫記憑護壞歸媽隨銀聞態虛遙';
const SC = '们个说这会对时来还后过国开关与为从问间见长东车门爱听学让话号发点无现体经电实样声变离气梦给觉当欢阳恋边头泪谁岁远吗万难写应读忆乐么丽伤将总结终红绿线颜风飞鸟谢语请认识热灯愿独够纪带满静轻别脑脸怀谎错颗阵场赞浅温记凭护坏归妈随银闻态虚遥';
const TCSET = new Set([...TC]), SCSET = new Set([...SC]);
// a few of the "Simplified" forms are also Japanese shinjitai (会 対 来 …) — kana decides Japanese first, so that is harmless

/* which language are these lyrics in? (kana → ja, hangul → ko, Han only → Traditional / Simplified by the distinctive forms) */
J.detectLang = (text) => {
  let kana = 0, hangul = 0, han = 0, tc = 0, sc = 0;
  for (const c of String(text || '')) {
    const u = c.codePointAt(0);
    if ((u >= 0x3041 && u <= 0x30ff && u !== 0x30fb && u !== 0x30fc) || (u >= 0xff66 && u <= 0xff9d)) kana++;
    else if ((u >= 0xac00 && u <= 0xd7a3) || (u >= 0x1100 && u <= 0x11ff) || (u >= 0x3130 && u <= 0x318f)) hangul++;
    else if ((u >= 0x4e00 && u <= 0x9fff) || (u >= 0x3400 && u <= 0x4dbf) || (u >= 0x20000 && u <= 0x2ffff)) {
      han++;
      if (TCSET.has(c)) tc++;
      if (SCSET.has(c)) sc++;
    }
  }
  if (hangul >= 2 && hangul > kana) return 'ko';
  if (kana >= 2 || (kana > 0 && kana >= han * 0.03)) return 'ja';
  if (han >= 2 && (tc || sc)) return tc >= sc ? 'zh-Hant' : 'zh-Hans';
  return 'ja';
};
/* project → the language actually used */
J.resolveLang = (project) => {
  const l = project && project.lang;
  if (l && l !== 'auto' && J.LANG_LABEL[l]) return l;
  return J.detectLang(((project && project.lyrics) || '') + ' ' + ((project && project.title) || ''));
};

/* per-language faces: key → [family, weight, Google Fonts spec]; keys left out keep their Japanese face
   (with the language's fallback in front of the Japanese one, so missing glyphs never land in a Japanese face) */
const F = (family, weight, gf) => ({ family, weight, gf });
const NSTC = 'Noto+Sans+TC:wght@300;500;700;900', NSRTC = 'Noto+Serif+TC:wght@300;500;700;800;900';
const NSSC = 'Noto+Sans+SC:wght@300;500;700;900', NSRSC = 'Noto+Serif+SC:wght@300;500;700;800;900';
const NSKR = 'Noto+Sans+KR:wght@300;500;700;900', NSRKR = 'Noto+Serif+KR:wght@300;500;700;800;900';
J.LANG_FACES = {
  'zh-Hant': {
    sans: F('Noto Sans TC', 500, NSTC), serif: F('Noto Serif TC', 500, NSRTC),
    fbSans: '"Noto Sans TC","Noto Sans CJK TC","PingFang TC","Microsoft JhengHei"', fbSerif: '"Noto Serif TC","Noto Serif CJK TC","PMingLiU"',
    map: {
      gothic_black: F('Noto Sans TC', 900, NSTC), gothic_bold: F('Noto Sans TC', 700, NSTC), gothic_med: F('Noto Sans TC', 500, NSTC),
      gothic_light: F('Noto Sans TC', 300, NSTC), zenkaku: F('Noto Sans TC', 900, NSTC), sansui: F('Noto Sans TC', 500, NSTC),
      mincho_black: F('Noto Serif TC', 900, NSRTC), mincho_bold: F('Noto Serif TC', 700, NSRTC), mincho: F('Noto Serif TC', 500, NSRTC),
      mincho_light: F('Noto Serif TC', 300, NSRTC), tokumin: F('Noto Serif TC', 800, NSRTC), shippori: F('Noto Serif TC', 800, NSRTC),
      dela: F('WDXL Lubrifont TC', 400, 'WDXL+Lubrifont+TC'), round: F('Chiron GoRound TC', 800, 'Chiron+GoRound+TC:wght@800'),
      pop: F('Huninn', 400, 'Huninn'), kiwi: F('Huninn', 400, 'Huninn'),
      klee: F('LXGW WenKai TC', 700, 'LXGW+WenKai+TC:wght@700'), brush: F('LXGW WenKai TC', 700, 'LXGW+WenKai+TC:wght@700'),
      reggae: F('LXGW Marker Gothic', 400, 'LXGW+Marker+Gothic'), rampart: F('LXGW Marker Gothic', 400, 'LXGW+Marker+Gothic'), potta: F('LXGW Marker Gothic', 400, 'LXGW+Marker+Gothic'),
    },
  },
  'zh-Hans': {
    sans: F('Noto Sans SC', 500, NSSC), serif: F('Noto Serif SC', 500, NSRSC),
    fbSans: '"Noto Sans SC","Noto Sans CJK SC","PingFang SC","Microsoft YaHei"', fbSerif: '"Noto Serif SC","Noto Serif CJK SC","SimSun"',
    map: {
      gothic_black: F('Noto Sans SC', 900, NSSC), gothic_bold: F('Noto Sans SC', 700, NSSC), gothic_med: F('Noto Sans SC', 500, NSSC),
      gothic_light: F('Noto Sans SC', 300, NSSC), zenkaku: F('Noto Sans SC', 900, NSSC), sansui: F('Noto Sans SC', 500, NSSC),
      mincho_black: F('Noto Serif SC', 900, NSRSC), mincho_bold: F('Noto Serif SC', 700, NSRSC), mincho: F('Noto Serif SC', 500, NSRSC),
      mincho_light: F('Noto Serif SC', 300, NSRSC), tokumin: F('Noto Serif SC', 800, NSRSC), shippori: F('Noto Serif SC', 800, NSRSC),
      dela: F('ZCOOL QingKe HuangYou', 400, 'ZCOOL+QingKe+HuangYou'), round: F('ZCOOL KuaiLe', 400, 'ZCOOL+KuaiLe'),
      pop: F('ZCOOL KuaiLe', 400, 'ZCOOL+KuaiLe'), kiwi: F('ZCOOL KuaiLe', 400, 'ZCOOL+KuaiLe'),
      klee: F('ZCOOL XiaoWei', 400, 'ZCOOL+XiaoWei'), brush: F('Ma Shan Zheng', 400, 'Ma+Shan+Zheng'),
      reggae: F('ZCOOL QingKe HuangYou', 400, 'ZCOOL+QingKe+HuangYou'), rampart: F('ZCOOL QingKe HuangYou', 400, 'ZCOOL+QingKe+HuangYou'), potta: F('Ma Shan Zheng', 400, 'Ma+Shan+Zheng'),
    },
  },
  ko: {
    sans: F('Noto Sans KR', 500, NSKR), serif: F('Noto Serif KR', 500, NSRKR),
    fbSans: '"Noto Sans KR","Noto Sans CJK KR","Apple SD Gothic Neo","Malgun Gothic"', fbSerif: '"Noto Serif KR","Noto Serif CJK KR","AppleMyungjo","Batang"',
    map: {
      gothic_black: F('Noto Sans KR', 900, NSKR), gothic_bold: F('Noto Sans KR', 700, NSKR), gothic_med: F('Noto Sans KR', 500, NSKR),
      gothic_light: F('Noto Sans KR', 300, NSKR), zenkaku: F('Noto Sans KR', 900, NSKR), sansui: F('IBM Plex Sans KR', 500, 'IBM+Plex+Sans+KR:wght@500'),
      mincho_black: F('Noto Serif KR', 900, NSRKR), mincho_bold: F('Noto Serif KR', 700, NSRKR), mincho: F('Noto Serif KR', 500, NSRKR),
      mincho_light: F('Noto Serif KR', 300, NSRKR), tokumin: F('Noto Serif KR', 800, NSRKR), shippori: F('Noto Serif KR', 800, NSRKR),
      dela: F('Black Han Sans', 400, 'Black+Han+Sans'), round: F('Jua', 400, 'Jua'),
      pop: F('Do Hyeon', 400, 'Do+Hyeon'), kiwi: F('Gowun Dodum', 400, 'Gowun+Dodum'),
      klee: F('Gowun Batang', 700, 'Gowun+Batang:wght@700'), brush: F('Nanum Brush Script', 400, 'Nanum+Brush+Script'),
      reggae: F('Black Han Sans', 400, 'Black+Han+Sans'), rampart: F('Black Han Sans', 400, 'Black+Han+Sans'), potta: F('Nanum Brush Script', 400, 'Nanum+Brush+Script'),
    },
  },
};

/* the language fonts are drawn in right now (set by the planner / renderer from plan.lang) */
J.lang = 'ja';
J.setLang = (l) => {
  l = J.LANG_FACES[l] ? l : 'ja';
  if (l === J.lang) return;
  J.lang = l;
  if (J.glyphs) J.glyphs.clear();
  if (J.metrics) J.metrics.clear();
};
const SERIF_KINDS = { mincho: 1, brush: 1, hand: 1 };
const faceCache = new Map();
/* the face a font key is drawn with in the current language: {family (quoted), weight, fb, gf, label, name (family, for captions)} */
J.faceOf = (key) => {
  const f = J.FONTS[key] || J.FONTS.gothic_bold;
  const L = J.LANG_FACES[J.lang];
  if (!L || f.user) return f;                               // Japanese: the catalogue face itself (fontCSS runs per draw — no allocation)
  const ck = J.lang + '|' + key; let r = faceCache.get(ck);
  if (r) return r;
  const m = L.map[key], fb = (SERIF_KINDS[f.kind] ? L.fbSerif : L.fbSans) + ',' + f.fb;
  r = !m ? { family: f.family, weight: f.weight, fb, gf: f.gf, label: f.label, name: f.label, kind: f.kind }
    : { family: '"' + m.family + '"', weight: m.weight, fb, gf: m.gf, label: m.family + (m.weight !== 400 ? ' ' + m.weight : ''), name: m.family, kind: f.kind };
  faceCache.set(ck, r);
  return r;
};
/* extra faces to load for the current language (the fallback sans / serif that covers glyphs the mapped faces lack) */
J.langBaseFaces = (keys) => {
  const L = J.LANG_FACES[J.lang]; if (!L) return [];
  const out = [L.sans];
  if ((keys || []).some(k => J.FONTS[k] && SERIF_KINDS[J.FONTS[k].kind])) out.push(L.serif);
  return out;
};
/* segmenter locale for chunking */
J.segLocale = () => (J.lang === 'zh-Hant' ? 'zh-Hant' : J.lang === 'zh-Hans' ? 'zh-Hans' : J.lang === 'ko' ? 'ko' : 'ja');
})();
