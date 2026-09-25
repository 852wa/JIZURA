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

J.LANGS = ['auto', 'ja', 'zh-Hant', 'zh-Hans', 'ko', 'en'];
J.LANG_LABEL = { auto: '自動判定', ja: '日本語', 'zh-Hant': '繁體中文', 'zh-Hans': '简体中文', ko: '한국어', en: 'English' };

/* characters that differ between Traditional and Simplified Chinese (same order in both strings) */
const TC = '們個說這會對時來還後過國開關與為從問間見長東車門愛聽學讓話號發點無現體經電實樣聲變離氣夢給覺當歡陽戀邊頭淚誰歲遠嗎萬難寫應讀憶樂麼麗傷將總結終紅綠線顏風飛鳥謝語請認識熱燈願獨夠紀帶滿靜輕別腦臉懷謊錯顆陣場讚淺溫記憑護壞歸媽隨銀聞態虛遙';
const SC = '们个说这会对时来还后过国开关与为从问间见长东车门爱听学让话号发点无现体经电实样声变离气梦给觉当欢阳恋边头泪谁岁远吗万难写应读忆乐么丽伤将总结终红绿线颜风飞鸟谢语请认识热灯愿独够纪带满静轻别脑脸怀谎错颗阵场赞浅温记凭护坏归妈随银闻态虚遥';
const TCSET = new Set([...TC]), SCSET = new Set([...SC]);
// a few of the "Simplified" forms are also Japanese shinjitai (会 対 来 …) — kana decides Japanese first, so that is harmless

/* which language are these lyrics in? (almost only Latin letters → en (English / romaji), kana → ja, hangul → ko,
   Han only → Traditional / Simplified by the distinctive forms, Traditional when there are none) */
J.detectLang = (text) => {
  let kana = 0, hangul = 0, han = 0, tc = 0, sc = 0, latin = 0;
  for (const c of String(text || '')) {
    const u = c.codePointAt(0);
    if ((u >= 0x41 && u <= 0x5a) || (u >= 0x61 && u <= 0x7a) || (u >= 0xc0 && u <= 0x24f && u !== 0xd7 && u !== 0xf7) || (u >= 0xff21 && u <= 0xff5a && (u <= 0xff3a || u >= 0xff41))) latin++;
    else if ((u >= 0x3041 && u <= 0x30ff && u !== 0x30fb && u !== 0x30fc) || (u >= 0xff66 && u <= 0xff9d)) kana++;
    else if ((u >= 0xac00 && u <= 0xd7a3) || (u >= 0x1100 && u <= 0x11ff) || (u >= 0x3130 && u <= 0x318f)) hangul++;
    else if ((u >= 0x4e00 && u <= 0x9fff) || (u >= 0x3400 && u <= 0x4dbf) || (u >= 0x20000 && u <= 0x2ffff)) {
      han++;
      if (TCSET.has(c)) tc++;
      if (SCSET.has(c)) sc++;
    }
  }
  // a CJK character carries about as much as a short word — weigh it ×3 against single Latin letters
  const cjk = kana + hangul + han;
  if (latin >= 6 && latin >= (latin + cjk * 3) * 0.9) return 'en';
  if (hangul >= 2 && hangul > kana) return 'ko';
  if (kana >= 2 || (kana > 0 && kana >= han * 0.03)) return 'ja';
  // Han without kana is Chinese even when no distinctive form appears (the shared forms render fine in the TC faces)
  if (han >= 2) return sc > tc ? 'zh-Hans' : 'zh-Hant';
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
  l = J.LANG_FACES[l] || l === 'en' ? l : 'ja';               // en: the styles' own faces (they all have Latin glyphs)
  if (l === J.lang) return;
  J.lang = l;
  if (J.glyphs) J.glyphs.clear();
  if (J.metrics) J.metrics.clear();
};
/* random characters for scrambles, rain, slot reels, sign boards… — in the lyric's own writing system, so Chinese,
   Korean or English lyrics don't get Japanese katakana around them (issue #16). Japanese keeps the original sets. */
const ZH_T = '的一是不了人我在有他這中大來上國個到說們為子和你地出道也時年得就那要下以生會自著去之過家學對可她裡後小麼心多天而能好都然沒日於起還發成事只作當想看文無開手十用主行方又如前所本見經頭面公同三已老從動兩長知民樣現分將外但身些與高意進把法此實回二理美點月明其種聲全工己話兒者向情部正名定女問力機給等幾很最間新什打便位因重被走電四第門相次東海口使西再平真聽世氣信北少關愛夢光影空夜星雨淚戀花風';
const ZH_S = '的一是不了人我在有他这中大来上国个到说们为子和你地出道也时年得就那要下以生会自着去之过家学对可她里后小么心多天而能好都然没日于起还发成事只作当想看文无开手十用主行方又如前所本见经头面公同三已老从动两长知民样现分将外但身些与高意进把法此实回二理美点月明其种声全工己话儿者向情部正名定女问力机给等几很最间新什打便位因重被走电四第门相次东海口使西再平真听世气信北少关爱梦光影空夜星雨泪恋花风';
const KO = '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후그느드르므브스으즈츠크트프흐기니디리미비시이지치키티피히사랑별빛마음노래하늘바람꿈눈물너나우리';
const EN_U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', EN_L = 'abcdefghijklmnopqrstuvwxyz', DIG = '0123456789', SYM = '＃＊＋＝／＜＞※◇◆□△○';
J.POOLS = {
  ja: { kana: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン', hira: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
    half: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789', reel: '夢光影空夜星雨涙心恋声花月風愛嘘罪色音海アイウエオカキクケコサシスセソ0123456789',
    scramble: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン愛哀夢嘘声光影空夜星雨涙心恋罪神嘘壊叫虚★◆▲●■※＃＄％＆01234567ABCDEFGHJKLMNPQRSTUVWXYZ',
    signs: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン＃＊＋＝／＜＞※◇◆□△○01' },
  'zh-Hant': { kana: ZH_T, hira: ZH_T, half: ZH_T.slice(0, 60) + DIG, reel: ZH_T.slice(-40) + DIG, scramble: ZH_T + '★◆▲●■※＃＄％＆' + DIG, signs: ZH_T.slice(0, 60) + SYM + '01' },
  'zh-Hans': { kana: ZH_S, hira: ZH_S, half: ZH_S.slice(0, 60) + DIG, reel: ZH_S.slice(-40) + DIG, scramble: ZH_S + '★◆▲●■※＃＄％＆' + DIG, signs: ZH_S.slice(0, 60) + SYM + '01' },
  ko: { kana: KO, hira: KO, half: KO.slice(0, 60) + DIG, reel: KO.slice(-30) + DIG, scramble: KO + '★◆▲●■※＃＄％＆' + DIG, signs: KO.slice(0, 60) + SYM + '01' },
  en: { kana: EN_U, hira: EN_L, half: '0123456789ABCDEF', reel: EN_U + DIG, scramble: EN_U + EN_L + '★◆▲●■#$%&' + DIG, signs: EN_U + '#*+=/<>' + '01' },
};
J.pool = (kind) => { const P = J.POOLS[J.lang] || J.POOLS.ja; return P[kind] || J.POOLS.ja[kind]; };
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
J.segLocale = () => (J.lang === 'zh-Hant' ? 'zh-Hant' : J.lang === 'zh-Hans' ? 'zh-Hans' : J.lang === 'ko' ? 'ko' : J.lang === 'en' ? 'en' : 'ja');
})();
