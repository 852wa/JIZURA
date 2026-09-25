/* Korean labels are applied after all expression packs register, before the editor starts.
   Internal IDs and project JSON remain language independent. */
(() => {
  'use strict';
  const titles = {
    layout: {
      vcols: '세로쓰기', marquee: '흐르는 배너', tile: '타일 텍스트',
      huge: '초대형 텍스트', gloss: '주석', diag: '대각선 띠',
      stack: '잔상 스택', lowerThird: '로어 서드', corners: '양쪽 모서리',
      arcTop: '무지개 아치', gridCells: '그리드 셀', dropCap: '드롭 캡',
      frameBox: '액자 프레임', subtitleBar: '자막 바',
      sideways: '가로 회전 텍스트', edgeFrame: '테두리 프레임', hanko: '낙관',
      genkou: '원고지', panels: '만화 패널', ruler: '치수선',
      rain: '글자 비', bounceLine: '바운드 라인', crossBands: '교차 띠',
      stickerBomb: '스티커 콜라주', credits: '엔드 크레딧',
      columnsBig: '대비 컬럼', circleWords: '동심원 텍스트',
      typeSpecimen: '타이포 견본', kanjiFocus: '한 글자 강조',
      halfVertical: '혼합 세로쓰기', magazine: '매거진 스프레드',
      headlineDeck: '헤드라인과 덱', proofread: '교정지',
      ema: '에마 소원패', ransom: '오려붙인 글자', vinyl: '바이닐 레코드',
      bookSpine: '책등', stampSheet: '우표 시트',
      chochin: '종이 초롱', noren: '노렌 커튼',
      tanzaku: '소원 띠', omikuji: '오미쿠지',
      kakejiku: '족자', shoji: '쇼지 문',
      clapper: '클래퍼보드', karuta: '카루타 카드',
      flipCards: '플립 카드', pile: '글자 더미', balloons: '글자 풍선',
      tiles: '글자 타일', bulbs: '전구 간판', ledScroll: 'LED 티커',
      crowdBubbles: '말풍선 군중', wordSearch: '단어 찾기',
      shadowPlay: '그림자극', kaleido: '만화경',
      fisheye: '어안 렌즈', wall: '원근 벽면',
      sliceStack: '슬라이스 레이어', maskReveal: '텍스트 창',
      halftoneBig: '대형 하프톤 텍스트'
    },
    enter: {
      assemble: '분해 후 조립', riseMask: '아래에서 나타나기',
      dropMask: '위에서 나타나기', slideL: '왼쪽에서 슬라이드', slideR: '오른쪽에서 슬라이드',
      slideWhole: '전체 슬라이드 인', flipX: '세로축 플립',
      flipY: '가로축 플립', strokeDraw: '윤곽선 그린 뒤 채우기',
      outlineFill: '윤곽선에서 채움', splitJoin: '위아래에서 합치기',
      vSlice: '세로 슬라이스', diagWipe: '대각선 와이프',
      randomOrder: '글자 랜덤 순서', bounceBig: '큰 바운스',
      squashDrop: '찌그러지며 착지', echoIn: '잔상 수렴',
      trackIn: '자간 좁히기', trackOut: '자간 넓히기',
      blurStagger: '순차 블러', fadeStagger: '글자별 페이드',
      spiralIn: '나선 조립', zoomOut: '초대형에서 정상 크기',
      cursorSweep: '커서 스윕', rockSettle: '흔들리며 정착',
      snapRail: '정렬선에 스냅', fanOpen: '부채 펼치기',
      stickerPeel: '스티커 붙이기', crumple: '구겨짐 펴기',
      noteUnfold: '편지 펼치기', tornJoin: '찢긴 조각 합치기',
      splitFlap: '스플릿 플랩', crtOn: 'CRT 켜짐',
      odometer: '숫자 드럼 회전', matrixRain: '데이터 비',
      brushReveal: '붓으로 나타내기', quarters: '네 방향에서 수렴',
      printRegister: '색판 정합', echoCount: '카운트 인',
      liquidFill: '액체 차오르기', strokeOrder: '획순대로',
      shadowFirst: '그림자 먼저', tokoroten: '압출 면발'
    },
    hold: {
      still: '정지', breathe: '호흡', glitchtick: '글리치 틱',
      colorRun: '색상 이동', trackBreathe: '자간 호흡',
      beatHop: '비트에 점프', hWave: '가로 웨이브',
      orbitSmall: '작은 공전', scanBand: '스캔 밴드',
      noiseDrift: '노이즈 드리프트', zoomSlow: '천천히 줌 인',
      stretchPulse: '비트에 늘어나기', glitchJump: '간헐적 글리치 점프',
      echoTrail: '잔상 트레일', glowFlicker: '글로우 깜빡임',
      windGust: '돌풍', eqBounce: '음압 바운스',
      flashBox: '비트 반전', glintSweep: '광택 스윕',
      flipSwap: '간헐적 뒤집기', shadowSway: '그림자 흔들림',
      typeRattle: '타자기 떨림', focusRack: '포커스 이동',
      pluckString: '현 진동'
    },
    exit: {
      fall: '무너져 낙하', drift: '흩어져 사라짐', sinkMask: '아래로 잠기기',
      riseOut: '위로 퇴장', slideOutL: '왼쪽으로 슬라이드', slideOutR: '오른쪽으로 슬라이드',
      flipOutX: '문 닫힘', flipOutY: '아래로 플립',
      trackOutWide: '자간 벌어짐', collapse: '안쪽으로 붕괴',
      zoomThrough: '줌 통과', zoomFar: '멀리 후퇴',
      spinOut: '회전하며 퇴장', blurOutStagger: '글자별 블러 퇴장',
      undraw: '윤곽선으로 되돌리기', outlineOut: '채움이 윤곽선으로',
      irisClose: '아이리스 닫힘', splitApart: '위아래로 분리',
      vSliceDrop: '세로 조각 낙하', dissolve: '부서져 사라짐',
      scrambleOut: '기호로 변환', glitchDissolve: '블록 글리치로 해체',
      gravity: '중력 낙하', burn: '타서 사라짐',
      sweepCover: '바로 덮기', shatterLite: '네 조각으로 파손',
      peelOff: '스티커 떼기', crumpleOut: '구겨서 버리기',
      tearOut: '찢어 버리기', scorchOut: '그을려 사라짐',
      overexposeOut: '과노출로 소멸', scanOut: '스캔라인 삭제',
      halftoneOut: '하프톤으로 분해', eraserOut: '칠판 지우기',
      vacuumOut: '한 점으로 흡입', sandOut: '모래처럼 흩어짐',
      hingeOut: '힌지 풀림', rocketOff: '로켓처럼 퇴장',
      balloonOff: '풍선처럼 떠남', deflateOut: '바람 빠져 날아감',
      glassBreak: '유리 파손', clapShut: '중앙으로 닫힘',
      lampOff: '불 꺼짐', matrixOut: '디지털 비',
      tornadoOut: '토네이도', snakeOut: '한 줄로 퇴장',
      flutterOut: '팔랑이며 낙하', fanClose: '부채 닫기',
      rgbSplitOut: 'RGB 분리', shockOut: '충격파',
      floodOut: '물에 잠김', slashOut: '두 조각으로 베기',
      scribbleOut: '낙서로 지우기', candleOut: '불어 끄기'
    },
    decor: {
      brackets: '모서리 마크', rings: '좌표 링', dots: '점선 링',
      leaders: '인출선', blobs: '잉크 얼룩', bars: '거친 띠',
      counter: '큰 숫자', cropMarks: '재단선',
      indexNum: '순번', dateStamp: '사진 날짜 스탬프',
      qrBlock: 'QR풍 블록', guides: '가이드선',
      checkerStrip: '체커 스트립', beatRing: '비트 링',
      speedCorner: '속도선', risingParticles: '상승 입자',
      brushStroke: '붓 터치', tapePieces: '마스킹 테이프',
      scribbleUnder: '손그림 밑줄', crossOut: '교정 마크',
      watermarkKanji: '대형 워터마크 문자',
      verticalStrip: '세로 텍스트 띠', romajiLine: '로마자 라인',
      bracketsJP: '일본식 괄호', seal: '붉은 낙관',
      kamon: '가문 문양', seigaiha: '세이가이하 파도무늬',
      asanoha: '아사노하 무늬', hanabi: '불꽃놀이',
      chochin: '종이 초롱', shimenawa: '시메나와', sensu: '부채',
      tsukiKumo: '달과 구름', momiji: '단풍잎',
      namiGashira: '파도 마루', kasumi: '안개',
      registration: '정합 마크', ruledLines: '노트 줄',
      indexTabs: '인덱스 탭', moonPhases: '달의 위상',
      dandelion: '민들레 씨앗', tally: '계수표',
      windowChrome: '창 프레임', notifBell: '알림 벨',
      likeCounter: '좋아요 카운터', mediaControls: '재생 컨트롤'
    },
    treat: {
      none: '없음', outline: '속 빈 글자', outlineFill: '외곽선 글자',
      doubleOutline: '이중 외곽선', extrude: '입체 글자',
      marker: '마커 강조', strike: '취소선',
      boxed: '박스 글자', gradientV: '세로 그라디언트',
      splitColor: '2색 분할', halftone: '하프톤',
      dotted: '점선 외곽선', alternate: '교대 색상',
      wide: '넓은 글자', tall: '긴 글자',
      echoOutline: '잔상 외곽선', emphasisDots: '강조점',
      neonOutline: '네온 튜브', glitchSplit: '색판 어긋남',
      stencilGap: '스텐실 틈', sizeWave: '글자 크기 리듬',
      rotateAlt: '교대 회전', baselineShift: '기준선 엇갈림',
      fauxBold: '초굵게', circled: '원형 글자',
      bracketsQuote: '인용부호', reflection: '반사',
      sticker: '스티커 외곽선', kerningWide: '넓은 자간',
      monoGrid: '원고지 그리드', outlineOffset: '오프셋 외곽선',
      toneShadow: '하프톤 그림자', fadeChars: '글자별 페이드',
      cutShift: '절단 오프셋', focusPull: '포커스 전환',
      spotChar: '한 글자 강조', ransom: '오려붙인 글자'
    },
    bg: {
      none: '단색', seigaiha: '세이가이하 파도',
      asanoha: '아사노하 무늬', topoLines: '등고선',
      ridgePlot: '산 능선', nightMoon: '달밤',
      filmStrip: '필름 스트립', vhsBand: 'VHS 노이즈 밴드',
      godRays: '빛줄기', vignettePulse: '비네트 펄스',
      paperCut: '종이 오리기', bigChar: '대형 글자',
      splitV: '세로 색상 분할', splitH: '가로 색상 분할',
      splitDiag: '대각선 색상 분할', tvBars: 'TV 컬러바',
      speedLines: '속도선', bokehBg: '보케',
      particlesBg: '부유 입자', eqBars: '이퀄라이저 바',
      letterbox: '시네마 레터박스', noiseField: '움직이는 노이즈'
    },
    cam: {
      push: '천천히 줌 인', rackFocus: '포커스 이동',
      floatNoise: '부유 카메라', vertigo: '돌리 줌',
      spiralIn: '나선 줌', jelly: '탄성 흔들림',
      pullOut: '줌 아웃', panL: '왼쪽 팬', panR: '오른쪽 팬',
      dutch: '더치 앵글', beatPunch: '비트 줌',
      driftDiag: '대각선 드리프트', shakeHard: '강한 흔들림',
      stepZoom: '계단식 줌'
    },
    fx: {
      chroma: '색수차 점프', slice: '슬라이스 글리치', block: '블록 글리치',
      zoom: '줌 블러', radialChroma: '방사형 색수차',
      bulge: '어안 왜곡', macroBlock: '압축 블록',
      ditherBit: '1비트 디더', rotateSnap: '각도 스냅',
      echoFrames: '프레임 잔상', kaleido: '만화경',
      bandInvert: '반전 밴드', anamorphic: '아나모픽 플레어',
      tvStatic: 'TV 노이즈', dustScratches: '필름 스크래치',
      filmAdvance: '필름 이동', perspectiveTilt: '원근 틸트',
      focusLines: '집중선', starGlint: '별빛 반짝임',
      negativeRing: '반전 링', shatter: '유리 파손',
      defocus: '초점 흐림', rgbSplit: 'RGB 분리',
      vhsRoll: 'VHS 롤', trackingNoise: '트래킹 노이즈',
      posterize: '포스터라이즈', filmBurn: '필름 번',
      crtOff: 'CRT 꺼짐'
    },
    trans: {
      wipe: '에지 와이프', diagonalWipe: '대각선 띠 와이프',
      irisOpen: '아이리스 열기', pushSlide: '푸시',
      doorsOpen: '양문 열기', checker: '체커보드',
      blockDissolve: '블록 디졸브', inkBlob: '잉크 번짐',
      shatterTiles: '타일 파손', sliceShift: '슬라이스 이동',
      cubeTurn: '큐브 회전', flashCross: '플래시 컷', pixelate: '픽셀 전환'
    }
  };

  // For newer pack entries that do not have an explicit Korean title yet,
  // build a readable label from the language-independent camelCase key.
  const words = {
    big:'대형', small:'소형', text:'텍스트', line:'라인', lines:'라인', grid:'그리드',
    frame:'프레임', box:'박스', circle:'원형', ring:'링', dot:'점', dots:'점',
    wave:'웨이브', split:'분할', wipe:'와이프', slide:'슬라이드', zoom:'줌',
    blur:'블러', glow:'글로우', shadow:'그림자', color:'색상', rgb:'RGB',
    noise:'노이즈', film:'필름', paper:'종이', ink:'잉크', light:'빛',
    flash:'플래시', beat:'비트', pulse:'펄스', rotate:'회전', spin:'회전',
    fall:'낙하', drop:'낙하', rise:'상승', float:'부유', drift:'드리프트',
    mask:'마스크', reveal:'리빌', focus:'포커스', camera:'카메라',
    vertical:'세로', horizontal:'가로', diagonal:'대각선', random:'랜덤',
    letter:'글자', letters:'글자', word:'단어', words:'단어', type:'타이포',
    stamp:'스탬프', sticker:'스티커', brush:'붓', neon:'네온', glass:'유리',
    cut:'컷', tile:'타일', tiles:'타일', block:'블록', blocks:'블록',
    screen:'화면', scan:'스캔', retro:'레트로', star:'별', moon:'달',
    rain:'비', cloud:'구름', clouds:'구름', smoke:'연기', fire:'불',
    bounce:'바운스', pop:'팝', stretch:'늘이기', squash:'찌그러짐',
    fold:'접기', unfold:'펼치기', open:'열기', close:'닫기', out:'아웃',
    in:'인', slow:'느리게', fast:'빠르게', hard:'강하게', soft:'부드럽게'
  };
  const acronym = { rgb: 'RGB', crt: 'CRT', vhs: 'VHS', qr: 'QR', tv: 'TV', led: 'LED', hud: 'HUD', jp: '일본풍' };
  const label = key => key.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')
    .replace(/_/g, ' ').split(' ').map(part => acronym[part.toLowerCase()] || words[part.toLowerCase()] || part).join(' ');

  for (const group of J.GROUP_KEYS) {
    for (const key of J.order(group)) {
      const item = J.registry(group)[key];
      if (item) item.name = (titles[group] || {})[key] || label(key);
    }
  }

  const styles = {
    noir: ['누아르 크로마', '흑백 화면에 시안과 앰버 색 어긋남'],
    crimson: ['크림슨 시그널', '짙은 빨강, 모노크롬 타이포와 손상된 데이터'],
    caution: ['코션', '노랑·빨강·파랑과 계기판 그래픽'],
    magenta: ['팝 마젠타', '강한 핑크, 둥근 굵은 글자와 콜아웃 라인'],
    paper: ['종이와 잉크', '종이 질감, 남색·마젠타와 명조 잔상'],
    hud: ['다크 HUD', '차콜, 얇은 프레임, 주황 포인트와 이클립스'],
    mint: ['민트 터미널', '검정, 틸, 라임과 스캔 효과'],
    specimen: ['타이포 견본', '잉크색 배경과 명조 주석'],
    transit: ['트랜짓', '올리브와 노랑, 사인 그래픽과 하프톤'],
    blueprint: ['블루프린트', '파랑·흰색·검정 그래픽 콜라주'],
    rouge: ['루주 그라디언트', '밝은 회색과 빨강 그라디언트, 캡슐'],
    mono: ['모노 RGB', '회색 공간, 흰 명조와 강한 RGB 분리'],
    sakura: ['사쿠라', '부드러운 벚꽃색과 자주색, 둥근 글자와 명조'],
    ocean: ['심해', '남색, 빛나는 시안, 거품과 가는 고딕'],
    sunset: ['선셋 그라디언트', '주황에서 보라, 굵은 명조와 역광'],
    forest: ['숲 노트', '이끼색, 자연 종이와 연필 느낌 글자'],
    vapor: ['베이퍼웨이브', '파스텔 핑크·블루와 VHS 블룸'],
    newsprint: ['신문 인쇄', '회색 종이, 검정·빨강과 하프톤 정합'],
    synth80: ['신스 80s', '검정 바탕의 네온 마젠타·시안과 스캔라인'],
    kraft: ['크라프트지', '따뜻한 종이, 빨강·남색 스탬프와 와시 테이프'],
    candy: ['캔디', '민트와 과일 파스텔, 튀는 글자'],
    acid: ['애시드', '검정, 애시드 그린과 마젠타, 거친 타이포'],
    sumi: ['먹과 주홍', '일본 종이, 붓글씨와 붉은 낙관'],
    gold: ['골든 나이트', '깊은 검정, 금박, 아이보리 명조와 반짝임']
  };
  for (const [key, [name, desc]] of Object.entries(styles)) {
    J.STYLES[key].name = name; J.STYLES[key].desc = desc;
  }
  for (const [key, name] of Object.entries({
    glitch:'글리치', calm:'차분함', pop:'팝', graphic:'그래픽',
    editorial:'에디토리얼', emotional:'감성', chaos:'전부 사용'
  })) J.MOODS[key].name = name;

  J.SAMPLE_LYRICS = '새벽의 색을/기억하고 있어\n멀리서 풀려 버린 목소리\n있잖아, 아직 늦지 않았을까\n*투명*한 채로 끝낼 수는 없어!';
})();
