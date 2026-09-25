/* English labels are applied after all expression packs register, before the editor starts.
   Internal IDs and project JSON remain language independent. */
(() => {
  'use strict';
  const titles = {
    layout: {
      vcols: 'Vertical text', marquee: 'Scrolling banner', tile: 'Tiled text',
      huge: 'Oversized text', gloss: 'Annotation', diag: 'Diagonal band',
      stack: 'Echo stack', lowerThird: 'Lower third', corners: 'Opposite corners',
      arcTop: 'Rainbow arc', gridCells: 'Grid cells', dropCap: 'Drop cap',
      frameBox: 'Picture frame', subtitleBar: 'Subtitle bar',
      sideways: 'Sideways text', edgeFrame: 'Edge frame', hanko: 'Signature seal',
      genkou: 'Manuscript paper', panels: 'Comic panels', ruler: 'Dimension lines',
      rain: 'Letter rain', bounceLine: 'Bouncing line', crossBands: 'Crossing bands',
      stickerBomb: 'Sticker collage', credits: 'End credits',
      columnsBig: 'Contrasting columns', circleWords: 'Concentric words',
      typeSpecimen: 'Type specimen', kanjiFocus: 'Character focus',
      halfVertical: 'Mixed vertical type', magazine: 'Magazine spread',
      headlineDeck: 'Headline and deck', proofread: 'Proof sheet',
      ema: 'Ema wish plaque', ransom: 'Cutout letters', vinyl: 'Vinyl record',
      bookSpine: 'Book spine', stampSheet: 'Stamp sheet',
      chochin: 'Paper lantern', noren: 'Noren curtain',
      tanzaku: 'Wish strip', omikuji: 'Fortune slip',
      kakejiku: 'Hanging scroll', shoji: 'Shoji screen',
      clapper: 'Clapperboard', karuta: 'Karuta card',
      flipCards: 'Flipping cards', pile: 'Letter pile', balloons: 'Letter balloons',
      tiles: 'Letter tiles', bulbs: 'Marquee bulbs', ledScroll: 'LED ticker',
      crowdBubbles: 'Speech bubble crowd', wordSearch: 'Word search',
      shadowPlay: 'Shadow puppets', kaleido: 'Kaleidoscope',
      fisheye: 'Fisheye lens', wall: 'Perspective wall',
      sliceStack: 'Sliced layers', maskReveal: 'Text window',
      halftoneBig: 'Oversized halftone text'
    },
    enter: {
      assemble: 'Break apart and assemble', riseMask: 'Reveal from below',
      dropMask: 'Reveal from above', slideL: 'Slide from left', slideR: 'Slide from right',
      slideWhole: 'Slide in together', flipX: 'Flip on vertical axis',
      flipY: 'Flip on horizontal axis', strokeDraw: 'Draw outlines, then fill',
      outlineFill: 'Outline to fill', splitJoin: 'Join from top and bottom',
      vSlice: 'Vertical slices', diagWipe: 'Diagonal wipe',
      randomOrder: 'Random letter order', bounceBig: 'Big bounce',
      squashDrop: 'Squash landing', echoIn: 'Echoes converge',
      trackIn: 'Tighten letter spacing', trackOut: 'Expand letter spacing',
      blurStagger: 'Staggered blur', fadeStagger: 'Letter by letter fade',
      spiralIn: 'Spiral assembly', zoomOut: 'Oversized to normal',
      cursorSweep: 'Cursor sweep', rockSettle: 'Wobble to rest',
      snapRail: 'Snap into alignment', fanOpen: 'Folding fan opens',
      stickerPeel: 'Apply sticker', crumple: 'Uncrumple',
      noteUnfold: 'Unfold letter', tornJoin: 'Join torn pieces',
      splitFlap: 'Split flap display', crtOn: 'CRT powers on',
      odometer: 'Rolling number drum', matrixRain: 'Data rain',
      brushReveal: 'Brush reveal', quarters: 'Converge from four sides',
      printRegister: 'Color plates align', echoCount: 'Count in',
      liquidFill: 'Liquid rises', strokeOrder: 'Stroke by stroke',
      shadowFirst: 'Shadow first', tokoroten: 'Extruded noodles'
    },
    hold: {
      still: 'Still', breathe: 'Breathe', glitchtick: 'Glitch tick',
      colorRun: 'Traveling color', trackBreathe: 'Breathing letter spacing',
      beatHop: 'Hop to the beat', hWave: 'Horizontal wave',
      orbitSmall: 'Small orbit', scanBand: 'Scanning band',
      noiseDrift: 'Drifting noise', zoomSlow: 'Slow push',
      stretchPulse: 'Stretch to the beat', glitchJump: 'Occasional glitch jump',
      echoTrail: 'Echo trail', glowFlicker: 'Flickering glow',
      windGust: 'Wind gust', eqBounce: 'Audio level bounce',
      flashBox: 'Invert to the beat', glintSweep: 'Passing highlight',
      flipSwap: 'Occasional flip', shadowSway: 'Swaying shadow',
      typeRattle: 'Typewriter rattle', focusRack: 'Rack focus',
      pluckString: 'Plucked string'
    },
    exit: {
      fall: 'Crumble and fall', drift: 'Drift away', sinkMask: 'Sink out',
      riseOut: 'Rise out', slideOutL: 'Slide left', slideOutR: 'Slide right',
      flipOutX: 'Doors close', flipOutY: 'Flip down',
      trackOutWide: 'Spread letter spacing', collapse: 'Collapse inward',
      zoomThrough: 'Zoom through', zoomFar: 'Recede into distance',
      spinOut: 'Spin away', blurOutStagger: 'Blur letters in sequence',
      undraw: 'Return to outlines', outlineOut: 'Fill fades to outline',
      irisClose: 'Iris closes', splitApart: 'Split top and bottom',
      vSliceDrop: 'Vertical slices fall', dissolve: 'Crumble away',
      scrambleOut: 'Become symbols', glitchDissolve: 'Glitch into blocks',
      gravity: 'Fall with gravity', burn: 'Burn away',
      sweepCover: 'Covered by a bar', shatterLite: 'Shatter into quarters',
      peelOff: 'Peel off sticker', crumpleOut: 'Crumple and toss',
      tearOut: 'Tear away', scorchOut: 'Scorch away',
      overexposeOut: 'Blow out to white', scanOut: 'Scanline erase',
      halftoneOut: 'Dissolve to halftone', eraserOut: 'Chalkboard erase',
      vacuumOut: 'Vacuum to a point', sandOut: 'Scatter as sand',
      hingeOut: 'Loose hinge', rocketOff: 'Rocket away',
      balloonOff: 'Float off like a balloon', deflateOut: 'Deflate and fly',
      glassBreak: 'Break like glass', clapShut: 'Close at center',
      lampOff: 'Lights out', matrixOut: 'Digital rain',
      tornadoOut: 'Tornado', snakeOut: 'Leave in a line',
      flutterOut: 'Flutter down', fanClose: 'Folding fan closes',
      rgbSplitOut: 'Split into RGB', shockOut: 'Shockwave',
      floodOut: 'Submerge', slashOut: 'Sliced in two',
      scribbleOut: 'Scribble away', candleOut: 'Blow out'
    },
    decor: {
      brackets: 'Corner marks', rings: 'Coordinate rings', dots: 'Dotted ring',
      leaders: 'Leader lines', blobs: 'Ink stains', bars: 'Rough bands',
      counter: 'Large numbers', cropMarks: 'Crop marks',
      indexNum: 'Sequence number', dateStamp: 'Photo date stamp',
      qrBlock: 'QR inspired blocks', guides: 'Guide lines',
      checkerStrip: 'Checker strip', beatRing: 'Beat ring',
      speedCorner: 'Speed lines', risingParticles: 'Rising particles',
      brushStroke: 'Brush stroke', tapePieces: 'Masking tape',
      scribbleUnder: 'Hand drawn underline', crossOut: 'Editorial marks',
      watermarkKanji: 'Large watermark character',
      verticalStrip: 'Vertical text strip', romajiLine: 'Romanized line',
      bracketsJP: 'Japanese corner brackets', seal: 'Red seal',
      kamon: 'Family crest', seigaiha: 'Seigaiha wave pattern',
      asanoha: 'Asanoha hemp leaf pattern', hanabi: 'Fireworks',
      chochin: 'Paper lantern', shimenawa: 'Sacred rope', sensu: 'Folding fan',
      tsukiKumo: 'Moon and clouds', momiji: 'Maple leaves',
      namiGashira: 'Wave crest', kasumi: 'Mist',
      registration: 'Registration marks', ruledLines: 'Ruled notebook',
      indexTabs: 'Index tabs', moonPhases: 'Moon phases',
      dandelion: 'Dandelion seeds', tally: 'Tally marks',
      windowChrome: 'Window frame', notifBell: 'Notification bell',
      likeCounter: 'Like counter', mediaControls: 'Playback controls'
    },
    treat: {
      none: 'None', outline: 'Hollow letters', outlineFill: 'Outlined text',
      doubleOutline: 'Double outline', extrude: 'Extruded text',
      marker: 'Marker highlight', strike: 'Strikethrough',
      boxed: 'Boxed text', gradientV: 'Vertical gradient',
      splitColor: 'Two tone split', halftone: 'Halftone',
      dotted: 'Dotted outline', alternate: 'Alternating colors',
      wide: 'Wide letters', tall: 'Tall letters',
      echoOutline: 'Echoed outline', emphasisDots: 'Emphasis dots',
      neonOutline: 'Neon tubing', glitchSplit: 'Misregistered colors',
      stencilGap: 'Stencil gaps', sizeWave: 'Rhythmic letter sizes',
      rotateAlt: 'Alternating angles', baselineShift: 'Staggered baseline',
      fauxBold: 'Extra bold', circled: 'Circled letters',
      bracketsQuote: 'Quotation marks', reflection: 'Reflection',
      sticker: 'Sticker outline', kerningWide: 'Wide letter spacing',
      monoGrid: 'Manuscript grid', outlineOffset: 'Offset outline',
      toneShadow: 'Halftone shadow', fadeChars: 'Fading letters',
      cutShift: 'Offset cut', focusPull: 'Focus shift',
      spotChar: 'Highlighted character', ransom: 'Cutout letters'
    },
    bg: {
      none: 'Solid color', seigaiha: 'Seigaiha waves',
      asanoha: 'Asanoha pattern', topoLines: 'Contour lines',
      ridgePlot: 'Mountain ridges', nightMoon: 'Moonlit night',
      filmStrip: 'Filmstrip', vhsBand: 'VHS noise band',
      godRays: 'Light rays', vignettePulse: 'Pulsing vignette',
      paperCut: 'Paper cutout', bigChar: 'Oversized letters',
      splitV: 'Vertical color split', splitH: 'Horizontal color split',
      splitDiag: 'Diagonal color split', tvBars: 'TV color bars',
      speedLines: 'Speed lines', bokehBg: 'Bokeh',
      particlesBg: 'Floating particles', eqBars: 'Equalizer bars',
      letterbox: 'Cinema letterbox', noiseField: 'Moving noise'
    },
    cam: {
      push: 'Slow push in', rackFocus: 'Rack focus',
      floatNoise: 'Floating camera', vertigo: 'Dolly zoom',
      spiralIn: 'Spiral zoom', jelly: 'Elastic wobble',
      pullOut: 'Pull out', panL: 'Pan left', panR: 'Pan right',
      dutch: 'Dutch angle', beatPunch: 'Zoom on beat',
      driftDiag: 'Diagonal drift', shakeHard: 'Strong shake',
      stepZoom: 'Stepped zoom'
    },
    fx: {
      chroma: 'Chromatic jump', slice: 'Slice glitch', block: 'Block glitch',
      zoom: 'Zoom blur', radialChroma: 'Radial color fringing',
      bulge: 'Fisheye distortion', macroBlock: 'Compression blocks',
      ditherBit: '1 bit dither', rotateSnap: 'Angle snap',
      echoFrames: 'Frame echoes', kaleido: 'Kaleidoscope',
      bandInvert: 'Inverted band', anamorphic: 'Anamorphic flare',
      tvStatic: 'TV static', dustScratches: 'Film scratches',
      filmAdvance: 'Film advance', perspectiveTilt: 'Perspective tilt',
      focusLines: 'Focus lines', starGlint: 'Star glint',
      negativeRing: 'Inverted ring', shatter: 'Glass shatter',
      defocus: 'Out of focus', rgbSplit: 'RGB separation',
      vhsRoll: 'VHS roll', trackingNoise: 'Tracking noise',
      posterize: 'Posterization', filmBurn: 'Film burn',
      crtOff: 'CRT powers off'
    },
    trans: {
      wipe: 'Edge wipe', diagonalWipe: 'Diagonal band wipe',
      irisOpen: 'Iris opens', pushSlide: 'Push',
      doorsOpen: 'Double doors', checker: 'Checkerboard',
      blockDissolve: 'Block dissolve', inkBlob: 'Ink blot',
      shatterTiles: 'Shattering tiles', sliceShift: 'Sliding strips',
      cubeTurn: 'Cube turn', flashCross: 'Flash cut', pixelate: 'Pixel transition'
    }
  };
  const acronym = { rgb: 'RGB', crt: 'CRT', vhs: 'VHS', qr: 'QR', tv: 'TV', led: 'LED', hud: 'HUD', jp: 'JP' };
  const label = key => key.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')
    .replace(/_/g, ' ').split(' ').map((part, i) => acronym[part.toLowerCase()] || (i ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1))).join(' ');
  for (const group of J.GROUP_KEYS) {
    for (const key of J.order(group)) {
      const item = J.registry(group)[key];
      if (item) item.name = (titles[group] || {})[key] || label(key);
    }
  }
  const styles = {
    noir: ['Noir Chroma', 'Black and white with cyan and amber color offsets'],
    crimson: ['Crimson Signal', 'Deep red, monochrome type and damaged data'],
    caution: ['Caution', 'Yellow, red and blue with instrument graphics'],
    magenta: ['Pop Magenta', 'Hot pink, round bold type and callout lines'],
    paper: ['Paper and Ink', 'Paper texture, indigo, magenta and serif echoes'],
    hud: ['Dark HUD', 'Charcoal, fine frames, orange accents and eclipses'],
    mint: ['Mint Terminal', 'Black, teal and lime with scan effects'],
    specimen: ['Type Specimen', 'Ink colored background with serif annotations'],
    transit: ['Transit', 'Olive and yellow with signage and halftone'],
    blueprint: ['Blueprint', 'Blue, white and black graphic collage'],
    rouge: ['Rouge Gradient', 'Light gray and red gradients with capsules'],
    mono: ['Mono RGB', 'Gray space, white serif and bold RGB separation'],
    sakura: ['Sakura', 'Soft cherry pink and plum with rounded and serif type'],
    ocean: ['Deep Sea', 'Navy, glowing cyan, bubbles and light sans type'],
    sunset: ['Sunset Gradient', 'Orange to violet, bold serif and backlight'],
    forest: ['Forest Notebook', 'Moss, natural paper and pencil lettering'],
    vapor: ['Vaporwave', 'Pastel pink and blue with VHS bloom'],
    newsprint: ['Newsprint', 'Gray paper, black and red with halftone registration'],
    synth80: ['Synth 80s', 'Black with neon magenta, cyan and scanlines'],
    kraft: ['Kraft Paper', 'Warm paper, red and indigo stamps and washi tape'],
    candy: ['Candy', 'Mint and fruit pastel colors with bouncing letters'],
    acid: ['Acid', 'Black, acid green and magenta with distressed type'],
    sumi: ['Ink and Vermilion', 'Japanese paper, brush lettering and red seals'],
    gold: ['Golden Night', 'Deep black, gold foil, ivory serif and glints']
  };
  for (const [key, [name, desc]] of Object.entries(styles)) {
    J.STYLES[key].name = name; J.STYLES[key].desc = desc;
  }
  for (const [key, name] of Object.entries({glitch:'Glitch', calm:'Gentle', pop:'Pop', graphic:'Graphic', editorial:'Editorial', emotional:'Emotional', chaos:'Anything goes'})) J.MOODS[key].name = name;
  J.SAMPLE_LYRICS = 'I remember/the color of dawn\nA voice faded into the distance\nCan we still make it in time?\n*Transparent* is not how this ends!';
})();

/* part sets (horror / typo / kinetic): names, styles and the horror mood */
(() => {
  'use strict';
  const P = {"layout": {"hrFlashlight": "Flashlight", "hrDoorGap": "Door Gap", "hrWallScrawl": "Wall Scrawl", "hrCctv": "CCTV Monitor", "hrOuija": "Spirit Board", "hrMissing": "Missing Poster", "hrWrongOne": "The Wrong Glyph", "hrRisingDark": "Out of the Dark", "hrRedacted": "Redacted File", "hrStaticTv": "Static TV", "hrSpiritPhoto": "Spirit Photo", "hrWrongShadow": "Wrong Shadow", "tyKeySplit": "Key Glyph Split", "tyCropGiant": "Cropped Giant", "tyCross": "Cross Setting", "tyBandHide": "Band Cover", "tyRuby": "Ruby Notes", "tyBaseline": "Ruled Lines", "tyScaleSteps": "Size Crescendo", "tyJustify": "Justified Stack", "tyIndexTable": "Glyph Table", "tySplitType": "Split Type", "tyErode": "Eroding Repeat", "tyVRuler": "Vertical Scale", "tyFullTrack": "Full-Width Tracking", "tyStatCount": "Glyph Count", "tyMargin": "White Space", "tyRotBlock": "Rotated Block", "tySquare": "Square Setting", "tyLineFocus": "Line Highlight", "knSlamStack": "Slam Stack", "knQuarterTurn": "Quarter Turn", "knSwapCenter": "Word Swap", "knZoomDive": "Dive Into Letter", "knFlowSnap": "Flow and Snap", "knSeesaw": "Seesaw", "knTypeSlam": "Type then Slam", "knRhythmCuts": "Word Jump Cuts", "knPathRide": "Loop Track", "knGearWords": "Gears", "knCollide": "Head-on Crash", "knTumble": "Tumbling Boxes", "knReflow": "Vertical to Line", "knPadGrid": "Drum Pads"}, "enter": {"hrBlinkCreep": "Between Blinks", "hrJumpScare": "Jump Scare", "hrUneasy": "Uneasy Timing", "hrVhold": "Vertical Hold", "hrMirrorSnap": "Mirror Writing", "hrManifest": "Manifest", "hrClawReveal": "Claw Marks", "tyKeyFirst": "Key Glyph First", "tyLineWipe": "Line-by-Line Wipe", "tyZoomOne": "One by One Zoom", "tyUnderLift": "Rise from Underline", "tyDotGrow": "Dot to Glyph", "tyBracketOpen": "Brackets Open", "tyRetype": "Retype", "tyRubyDrop": "From Ruby", "knWordSlam": "Word Slam", "knTypeToSlam": "Type and Grow", "knReplaceIn": "Swap In", "knHingeDrop": "Hinge Drop", "knLoopIn": "Loop In", "knPushIn": "Push In", "knInertia": "Hard Brake", "knWordSpin": "Word Spin", "knDiveIn": "Words From Camera", "knStretchOut": "Tape Stretch"}, "exit": {"hrPulledDown": "Pulled Under", "hrLookBack": "One Remains", "hrTurnAway": "Turn Away", "hrShiver": "Shiver Out", "hrSwallow": "Swallowed", "hrFlickerDie": "Dying Flicker", "hrDrain": "Drain", "tyStrike": "Strike Out", "tyToDot": "Back to Dots", "tyLineFeed": "Line Feed", "tyBracketClose": "Brackets Close", "tyToIndex": "Turn to Numbers", "tyKeyLast": "Key Glyph Last", "tyUnderSink": "Sink into Underline", "tyFoldVert": "Fold to Vertical", "knWordKick": "Word Kick", "knPushOut": "Push Out", "knDiveGlyph": "Dive Into Letter", "knLaunch": "Launch", "knWordBlink": "Words Blink Out", "knCloseGap": "Close the Gaps", "knJumpCutOut": "Jump Cut", "knStackAway": "Stack and Drop"}, "hold": {"hrTwitch": "Twitch", "hrStare": "Staring Glyph", "hrLagOne": "The Late One", "hrFlickerLight": "Failing Light", "tyKeyPulse": "Key Glyph Pulse", "tyReadCursor": "Reading Cursor", "tyOutlineBlink": "Outline Blink", "tyTrackStep": "Tracking Steps", "knWordPulse": "Word Pulse", "knCounterRock": "Counter Rock", "knWordRide": "Word Surf", "knTickShift": "Tick Shift", "knBeatLean": "Beat Lean", "knGapBreath": "Breathing Gaps"}, "decor": {"hrScratches": "Claw Scratches", "hrSigil": "Sigil", "hrWatchEye": "Watching Eye", "hrStaticPatch": "Static Patches", "hrDustBeam": "Dusty Light Beam", "hrDrips": "Ink Drips", "hrCracks": "Cracks", "tyColophon": "Colophon", "tyRunningHead": "Running Head & Folio", "tyGlyphBody": "Glyph Body Lines", "tyTextRule": "Text Rule", "tyTypeScale": "Type Scale", "tyBigPunct": "Big Quote Marks", "knSpeedTrail": "Trailing Speed Lines", "knWordTicks": "Word Counter"}, "treat": {"hrInkBleed": "Bleeding Ink", "hrEroded": "Eroded", "hrRedact": "Redacted", "hrDoubleExp": "Double Exposure", "tyHollowKey": "Hollow Key Glyph", "tyHeadRules": "Head & Foot Rules", "tyHeadBig": "Large Initial", "tyIndexSup": "Glyph Numbers", "knWordScale": "Big and Small Words", "knWordPlate": "Word Knockout"}, "bg": {"hrFailingLamp": "Failing Lamp", "hrCorridor": "Dark Corridor", "hrMold": "Spreading Stains", "hrDeadTrees": "Dead Forest"}, "cam": {"hrNervous": "Frightened Handheld", "hrDutchSnap": "Sudden Tilt", "knReadPan": "Reading Pan", "knTiltKick": "Tilt Kick", "knCardFlip": "Card Flip", "knShearKick": "Shear Kick", "knJumpCut": "Jump Cut", "knRushIn": "Rush In"}, "fx": {"hrSubliminal": "Subliminal", "hrSignalLoss": "Signal Loss", "hrPassingShadow": "Passing Shadow"}, "trans": {"hrStaticCut": "Static Cut", "hrBlink": "Blink", "tyRuleWipe": "Ruled Line Wipe", "tyGridCells": "Grid Cell Fill", "knCornerSwing": "Corner Swing", "knStutterCut": "Stutter Cut", "knStripSlam": "Strip Slam"}};
  for (const [g, m] of Object.entries(P)) { const t = J.registry(g) || {}; for (const [k, n] of Object.entries(m)) if (t[k]) t[k].name = n; }
  const S = {"hrRuin": ["Ruins", "Faded green-grey, rust red and echoing serif type"], "hrNightRec": ["Midnight Recording", "Pitch-black frames, CCTV white and red, static"], "hrCurse": ["Cursed Letter", "Yellowed paper, faded ink and dark red handwriting"]};
  for (const [k, [n, d]] of Object.entries(S)) if (J.STYLES[k]) { J.STYLES[k].name = n; J.STYLES[k].desc = d; }
  if (J.MOODS.horror) J.MOODS.horror.name = "Horror";
})();
