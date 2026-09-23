#target aftereffects
/*  JIZURA \u5B57\u9762 \u2014 lyric motion panel for Adobe After Effects
    Put this file in:  After Effects <version>/Support Files/Scripts/ScriptUI Panels/
    Restart AE, then open  Window > JIZURA_AE.jsx
    (Or run it once via File > Scripts > Run Script File... as a floating window.)
    License: see LICENSE in the source repository.
*/
(function (thisObj) {
var JZ_DATA = {"styles": {"noir": {"name": "\u30ce\u30ef\u30fc\u30eb\u30fb\u30af\u30ed\u30de", "desc": "\u9ed2\u5730\u30fb\u767d\u6587\u5b57\u30fb\u30b7\u30a2\u30f3/\u7425\u73c0\u306e\u8272\u30ba\u30ec", "schemes": [{"bg": "#060607", "fg": "#F5EEEA", "sub": "#BDB6B2", "accent": "#F5A50C", "accent2": "#16F4D4", "ink": "#F5EEEA", "dim": "#2A2A2E", "ghostA": "#F5A50C", "ghostB": "#16F4D4"}, {"bg": "#F2EDE8", "fg": "#0B0B0C", "sub": "#4A4644", "accent": "#E0600C", "accent2": "#0FAE98", "ink": "#0B0B0C", "dim": "#D9D2CC", "ghostA": "#F5A50C", "ghostB": "#16C4B4", "swap": true}], "fonts": {"display": ["gothic_black", "dela", "zenkaku"], "serif": ["mincho_light", "mincho"], "body": ["gothic_med"], "mono": ["mono"]}, "texture": {"grain": 0.9, "paper": 0, "scan": 0}, "ghost": 1, "bias": {"layout": {"vcols": 2, "condensed": 2, "marquee": 1.6, "tile": 1.4, "center": 1.2}, "enter": {"assemble": 2.2, "slice": 1.8, "stretch": 1.4}, "exit": {"explode": 1.8, "fall": 1.2, "drift": 1.4}}, "decor": {"rings": 0.8, "hud": 0.4, "slash": 0.6}, "hud": false}, "crimson": {"name": "\u30af\u30ea\u30e0\u30be\u30f3\u30fb\u30b7\u30b0\u30ca\u30eb", "desc": "\u6df1\u7d05\u5730\u30fb\u767d\u3068\u9ed2\u306e\u4e8c\u6bb5\u7d44\u307f\u30fb\u30c7\u30fc\u30bf\u7834\u640d", "schemes": [{"bg": "#C8103F", "fg": "#FFFFFF", "sub": "#FFD9E2", "accent": "#140509", "accent2": "#39F2C8", "ink": "#140509", "dim": "#B00D37", "ghostA": "#FFFFFF", "ghostB": "#39F2C8"}, {"bg": "#FF6F98", "fg": "#FFFFFF", "sub": "#FFE3EB", "accent": "#1A0710", "accent2": "#39F2C8", "ink": "#1A0710", "dim": "#F25C87", "ghostA": "#FFFFFF", "ghostB": "#1A0710"}, {"bg": "#150509", "fg": "#FF3D6E", "sub": "#FF9DB6", "accent": "#FFFFFF", "accent2": "#39F2C8", "ink": "#FF3D6E", "dim": "#2A0B14", "ghostA": "#FF3D6E", "ghostB": "#39F2C8"}], "fonts": {"display": ["gothic_black", "zenkaku"], "serif": ["mincho"], "body": ["gothic_med", "sansui"], "mono": ["mono"]}, "texture": {"grain": 0.6, "paper": 0, "scan": 0.4}, "ghost": 0.8, "bias": {"layout": {"huge": 2, "marquee": 1.6, "scatter": 1.5, "stack": 1.3, "type": 1.3}, "enter": {"scramble": 1.6, "slice": 1.6, "type": 1.3}, "exit": {"glitch": 2, "slice": 1.6}}, "decor": {"hud": 1, "arrows": 0.8, "rings": 0.8}, "hud": true, "glitchBoost": 1.4}, "caution": {"name": "\u30b3\u30fc\u30b7\u30e7\u30f3", "desc": "\u9ec4\u8272\u5730\u30fb\u8d64\u3068\u9752\u306e\u30a2\u30af\u30bb\u30f3\u30c8\u30fb\u8a08\u5668UI", "schemes": [{"bg": "#F4D21F", "fg": "#141414", "sub": "#3A3510", "accent": "#E0231C", "accent2": "#1F3FD8", "ink": "#141414", "dim": "#E6C413", "ghostA": "#E0231C", "ghostB": "#1F3FD8"}, {"bg": "#E0231C", "fg": "#F4D21F", "sub": "#FFE9A0", "accent": "#141414", "accent2": "#FFFFFF", "ink": "#141414", "dim": "#C81E17", "ghostA": "#141414", "ghostB": "#F4D21F"}, {"bg": "#18181A", "fg": "#F4D21F", "sub": "#DDD6B0", "accent": "#E0231C", "accent2": "#FFFFFF", "ink": "#F4D21F", "dim": "#26262A", "ghostA": "#E0231C", "ghostB": "#1F3FD8"}], "fonts": {"display": ["mincho_black", "gothic_black"], "serif": ["mincho_black", "mincho_bold"], "body": ["gothic_bold"], "mono": ["mono"]}, "texture": {"grain": 0.5, "paper": 0.25, "scan": 0}, "ghost": 0.55, "bias": {"layout": {"ring": 2.2, "mixed": 2, "circle": 1.4, "gloss": 1.2}, "enter": {"pop": 1.6, "spin": 1.5, "wipe": 1.2}, "exit": {"scatter": 1.5, "shrink": 1.2}}, "decor": {"hud": 1, "rings": 1, "arrows": 1, "counter": 0.8, "barcode": 0.8}, "hud": true}, "magenta": {"name": "\u30dd\u30c3\u30d7\u30fb\u30de\u30bc\u30f3\u30bf", "desc": "\u30b7\u30e7\u30c3\u30ad\u30f3\u30b0\u30d4\u30f3\u30af\u00d7\u767d\u30fb\u592a\u4e38\u30b4\u30b7\u30c3\u30af\u30fb\u5f15\u304d\u51fa\u3057\u7dda", "schemes": [{"bg": "#FF0A8C", "fg": "#FFFFFF", "sub": "#FFD2EA", "accent": "#FFFFFF", "accent2": "#2B2BD9", "ink": "#FFFFFF", "dim": "#F0077F", "ghostA": "#FF8CC8", "ghostB": "#2B2BD9"}, {"bg": "#FFFFFF", "fg": "#FF0A8C", "sub": "#FF6DB6", "accent": "#2B2BD9", "accent2": "#FF0A8C", "ink": "#FF0A8C", "dim": "#FFE4F2", "ghostA": "#2B2BD9", "ghostB": "#FF8CC8"}, {"bg": "#2B2BD9", "fg": "#FFFFFF", "sub": "#C9C9FF", "accent": "#FF0A8C", "accent2": "#FFFFFF", "ink": "#FFFFFF", "dim": "#2424C4", "ghostA": "#FF0A8C", "ghostB": "#FFFFFF"}], "fonts": {"display": ["round", "pop", "gothic_black"], "serif": ["mincho_bold"], "body": ["round", "gothic_bold"], "mono": ["mono"]}, "texture": {"grain": 0.3, "paper": 0, "scan": 0}, "ghost": 0.35, "bias": {"layout": {"wave": 2.2, "gloss": 1.6, "huge": 1.6, "pill": 1.4, "scatter": 1.2}, "enter": {"pop": 2, "drop": 1.6, "spin": 1.3, "blur": 1.2}, "exit": {"scatter": 1.6, "shrink": 1.4, "blur": 1.2}}, "decor": {"leaders": 1, "counter": 1, "sparks": 0.8, "shapes": 0.6}, "hud": false}, "paper": {"name": "\u30da\u30fc\u30d1\u30fc\u30fb\u30a4\u30f3\u30af", "desc": "\u7d19\u306e\u8cea\u611f\u30fb\u85cd\u3068\u30de\u30bc\u30f3\u30bf\u30fb\u660e\u671d\u306e\u6b8b\u50cf", "schemes": [{"bg": "#ECE9E3", "fg": "#1B2350", "sub": "#4D5270", "accent": "#C2185B", "accent2": "#111111", "ink": "#111111", "dim": "#DAD6CE", "ghostA": "#C2185B", "ghostB": "#1B2350", "paper": true}, {"bg": "#151515", "fg": "#F0EDE7", "sub": "#B8B4AC", "accent": "#C2185B", "accent2": "#1B2350", "ink": "#F0EDE7", "dim": "#232323", "ghostA": "#C2185B", "ghostB": "#3A4690", "paper": true}, {"bg": "#C2185B", "fg": "#FFFFFF", "sub": "#F6C6D8", "accent": "#1B2350", "accent2": "#111111", "ink": "#1B2350", "dim": "#B5154F", "ghostA": "#1B2350", "ghostB": "#FFFFFF", "paper": true}, {"bg": "#1B2350", "fg": "#F0EDE7", "sub": "#AEB2CC", "accent": "#C2185B", "accent2": "#FFFFFF", "ink": "#F0EDE7", "dim": "#1F2858", "ghostA": "#C2185B", "ghostB": "#FFFFFF", "paper": true}], "fonts": {"display": ["mincho_black", "tokumin"], "serif": ["mincho_black", "mincho_bold"], "body": ["mincho"], "mono": ["mono"]}, "texture": {"grain": 0.7, "paper": 1, "scan": 0}, "ghost": 0.5, "bias": {"layout": {"stack": 2.2, "mixed": 1.8, "huge": 1.6, "vcols": 1.4, "circle": 1.2}, "enter": {"wipe": 1.6, "stretch": 1.4, "blur": 1.2, "slice": 1.2}, "exit": {"drift": 1.6, "wipe": 1.4}}, "decor": {"bars": 1, "blobs": 0.8, "shapes": 0.6, "waveform": 0.4}, "hud": false}, "hud": {"name": "\u30c0\u30fc\u30afHUD", "desc": "\u70ad\u8272\u5730\u30fb\u7d30\u7dda\u30d5\u30ec\u30fc\u30e0\u30fb\u6a59\u306e\u5dee\u3057\u8272\u30fb\u65e5\u98df", "schemes": [{"bg": "#131315", "fg": "#EFEDEA", "sub": "#8E8B88", "accent": "#F25A2B", "accent2": "#FFFFFF", "ink": "#EFEDEA", "dim": "#1E1E21", "ghostA": "#F25A2B", "ghostB": "#7FD7FF"}, {"bg": "#0B0B0C", "fg": "#FFFFFF", "sub": "#9A9796", "accent": "#F25A2B", "accent2": "#FFFFFF", "ink": "#F25A2B", "dim": "#18181A", "ghostA": "#F25A2B", "ghostB": "#FFFFFF"}], "fonts": {"display": ["gothic_black", "zenkaku"], "serif": ["mincho_bold", "mincho_light"], "body": ["gothic_med"], "mono": ["mono"]}, "texture": {"grain": 1, "paper": 0, "scan": 0.2}, "ghost": 0.6, "bias": {"layout": {"circle": 2, "ring": 1.6, "vcols": 1.4, "center": 1.2, "gloss": 1}, "enter": {"blur": 1.6, "type": 1.4, "assemble": 1.3}, "exit": {"blur": 1.4, "drift": 1.4, "explode": 1.2}}, "decor": {"hud": 1, "rings": 1, "arrows": 1, "grid": 0.8, "slash": 0.6}, "hud": true, "glow": 1.4}, "mint": {"name": "\u30df\u30f3\u30c8\u30fb\u30bf\u30fc\u30df\u30ca\u30eb", "desc": "\u9ed2\u00d7\u9752\u7dd1\u00d7\u30e9\u30a4\u30e0\u30fb\u30e9\u30d9\u30eb\u8cbc\u308a\u30fb\u30b9\u30ea\u30c3\u30c8\u30b9\u30ad\u30e3\u30f3", "schemes": [{"bg": "#0A0E0D", "fg": "#E6FFF5", "sub": "#7FB9A8", "accent": "#9CFF3A", "accent2": "#2E8C74", "ink": "#E6FFF5", "dim": "#142420", "ghostA": "#FF3B6B", "ghostB": "#2EE6C8"}, {"bg": "#3FAE93", "fg": "#0A0E0D", "sub": "#123A31", "accent": "#FFFFFF", "accent2": "#9CFF3A", "ink": "#0A0E0D", "dim": "#39A087", "ghostA": "#FFFFFF", "ghostB": "#0A0E0D"}, {"bg": "#F2F2EE", "fg": "#0A0E0D", "sub": "#40504B", "accent": "#2E8C74", "accent2": "#9CFF3A", "ink": "#0A0E0D", "dim": "#E2E4DE", "ghostA": "#2E8C74", "ghostB": "#9CFF3A"}], "fonts": {"display": ["gothic_black", "dela"], "serif": ["mincho"], "body": ["gothic_med", "sansui"], "mono": ["mono", "dot"]}, "texture": {"grain": 0.8, "paper": 0, "scan": 0.6}, "ghost": 0.9, "bias": {"layout": {"labels": 2.4, "tile": 1.6, "marquee": 1.4, "type": 1.4, "diag": 1.2}, "enter": {"scramble": 1.8, "type": 1.6, "flicker": 1.4}, "exit": {"glitch": 1.6, "slice": 1.4}}, "decor": {"hud": 1, "grid": 0.8, "barcode": 0.8, "sparks": 0.5}, "hud": true}, "specimen": {"name": "\u30b9\u30da\u30b7\u30e1\u30f3", "desc": "\u58a8\u8272\u5730\u30fb\u660e\u671d\u30fb\u8f9e\u66f8\u306e\u6ce8\u91c8\u3068\u5f15\u304d\u51fa\u3057\u7dda", "schemes": [{"bg": "#1B1A1C", "fg": "#F2F0EC", "sub": "#A19E99", "accent": "#F2F0EC", "accent2": "#C8B98C", "ink": "#F2F0EC", "dim": "#2A292C", "ghostA": "#6E6A66", "ghostB": "#C8B98C"}, {"bg": "#F2F0EC", "fg": "#1B1A1C", "sub": "#5E5B57", "accent": "#1B1A1C", "accent2": "#8A7A4E", "ink": "#1B1A1C", "dim": "#E3E0DA", "ghostA": "#B9B4AD", "ghostB": "#8A7A4E"}], "fonts": {"display": ["mincho_bold", "mincho_black"], "serif": ["mincho", "mincho_light"], "body": ["mincho"], "mono": ["mono"]}, "texture": {"grain": 0.6, "paper": 0.3, "scan": 0}, "ghost": 0.25, "bias": {"layout": {"gloss": 2.6, "vcols": 1.8, "mixed": 1.4, "center": 1.2, "tile": 1}, "enter": {"type": 1.8, "blur": 1.6, "wipe": 1.2}, "exit": {"blur": 1.6, "drift": 1.2, "wipe": 1.2}}, "decor": {"leaders": 1, "slash": 0.8, "rings": 0.4}, "hud": false}, "transit": {"name": "\u30c8\u30e9\u30f3\u30b8\u30c3\u30c8", "desc": "\u30aa\u30ea\u30fc\u30d6\u00d7\u9ec4\u8272\u30fb\u77e2\u5370\u3068\u6a19\u8b58\u30fb\u7db2\u70b9", "schemes": [{"bg": "#5B582B", "fg": "#FFFFFF", "sub": "#E6E2BC", "accent": "#E8C21A", "accent2": "#1A1A1A", "ink": "#E8C21A", "dim": "#67633A", "ghostA": "#E8C21A", "ghostB": "#1A1A1A"}, {"bg": "#1A1A1A", "fg": "#FFFFFF", "sub": "#B8B5A0", "accent": "#E8C21A", "accent2": "#FFFFFF", "ink": "#E8C21A", "dim": "#242424", "ghostA": "#E8C21A", "ghostB": "#7C7A55"}, {"bg": "#9C9A94", "fg": "#FFFFFF", "sub": "#F0EEE6", "accent": "#E8C21A", "accent2": "#1A1A1A", "ink": "#1A1A1A", "dim": "#A6A49E", "ghostA": "#E8C21A", "ghostB": "#1A1A1A"}], "fonts": {"display": ["zenkaku", "gothic_black"], "serif": ["mincho_bold"], "body": ["gothic_bold"], "mono": ["mono"]}, "texture": {"grain": 0.8, "paper": 0.2, "scan": 0}, "ghost": 0.5, "bias": {"layout": {"mixed": 2, "scatter": 1.6, "diag": 1.4, "huge": 1.2}, "enter": {"spin": 1.6, "drop": 1.4, "pop": 1.2, "stretch": 1.2}, "exit": {"scatter": 1.4, "stretch": 1.4}}, "decor": {"arrows": 1.4, "shapes": 1, "counter": 0.8, "rings": 0.6}, "hud": false}, "blueprint": {"name": "\u30d6\u30eb\u30fc\u30d7\u30ea\u30f3\u30c8", "desc": "\u9bae\u9752\u00d7\u767d\u00d7\u9ed2\u30fb\u56f3\u5f62\u30b3\u30e9\u30fc\u30b8\u30e5\u30fb\u659c\u3081\u5e2f", "schemes": [{"bg": "#1B1BE8", "fg": "#FFFFFF", "sub": "#C7C7FF", "accent": "#000000", "accent2": "#FFFFFF", "ink": "#000000", "dim": "#2323F0", "ghostA": "#000000", "ghostB": "#8C8CFF"}, {"bg": "#000000", "fg": "#FFFFFF", "sub": "#9A9AFF", "accent": "#1B1BE8", "accent2": "#FFFFFF", "ink": "#1B1BE8", "dim": "#0A0A30", "ghostA": "#1B1BE8", "ghostB": "#FFFFFF"}, {"bg": "#FFFFFF", "fg": "#1B1BE8", "sub": "#5A5AF0", "accent": "#000000", "accent2": "#1B1BE8", "ink": "#1B1BE8", "dim": "#EDEDFF", "ghostA": "#000000", "ghostB": "#8C8CFF"}], "fonts": {"display": ["dela", "gothic_black"], "serif": ["mincho_bold"], "body": ["gothic_bold"], "mono": ["mono", "dot"]}, "texture": {"grain": 0.4, "paper": 0, "scan": 0}, "ghost": 0.6, "bias": {"layout": {"diag": 2.2, "labels": 1.4, "huge": 1.4, "condensed": 1.2}, "enter": {"wipe": 1.6, "slice": 1.6, "stretch": 1.3}, "exit": {"wipe": 1.6, "slice": 1.4, "glitch": 1.2}}, "decor": {"shapes": 1.4, "stripes": 1, "slash": 1, "grid": 0.6}, "hud": false}, "rouge": {"name": "\u30eb\u30fc\u30b8\u30e5\u30fb\u30b0\u30e9\u30c7", "desc": "\u660e\u308b\u3044\u30b0\u30ec\u30fc\u5730\u30fb\u8d64\u306e\u30b0\u30e9\u30c7\u30fc\u30b7\u30e7\u30f3\u30fb\u30ab\u30d7\u30bb\u30eb", "schemes": [{"bg": "#E4E2E0", "fg": "#141414", "sub": "#6B6866", "accent": "#D40F1C", "accent2": "#141414", "ink": "#141414", "dim": "#D8D6D4", "ghostA": "#D40F1C", "ghostB": "#6B6866", "grad": ["#E3141F", "#4A0005"]}, {"bg": "#140405", "fg": "#FFFFFF", "sub": "#C98A8E", "accent": "#E3141F", "accent2": "#FFFFFF", "ink": "#E3141F", "dim": "#220A0C", "ghostA": "#E3141F", "ghostB": "#FFFFFF", "grad": ["#FF4A52", "#6A0008"]}], "fonts": {"display": ["gothic_black", "dela"], "serif": ["mincho_black"], "body": ["gothic_med"], "mono": ["mono"]}, "texture": {"grain": 0.4, "paper": 0, "scan": 0}, "ghost": 0.4, "bias": {"layout": {"huge": 2.2, "pill": 2, "mixed": 1.4, "labels": 1.2, "center": 1.2}, "enter": {"zoom": 1.6, "wipe": 1.4, "pop": 1.2}, "exit": {"shrink": 1.6, "wipe": 1.2}}, "decor": {"hud": 0.8, "leaders": 0.8, "stripes": 0.6}, "hud": true, "useGrad": true}, "mono": {"name": "\u30e2\u30ce\u30fbRGB", "desc": "\u7070\u8272\u306e\u7a7a\u9593\u30fb\u767d\u3044\u660e\u671d\u30fb\u5f37\u3044RGB\u5206\u96e2\u30fb\u5ea7\u6a19\u306e\u5186", "schemes": [{"bg": "#3B3D41", "fg": "#FFFFFF", "sub": "#B9BBBF", "accent": "#FFFFFF", "accent2": "#FFE34D", "ink": "#1A1B1D", "dim": "#45474C", "ghostA": "#FF2A2A", "ghostB": "#2AA8FF"}, {"bg": "#141517", "fg": "#FFFFFF", "sub": "#9EA0A4", "accent": "#FFE34D", "accent2": "#FFFFFF", "ink": "#FFFFFF", "dim": "#1E1F22", "ghostA": "#FF2A2A", "ghostB": "#2AFF7A"}], "fonts": {"display": ["mincho_black", "mincho_bold"], "serif": ["mincho_bold"], "body": ["mincho"], "mono": ["mono"]}, "texture": {"grain": 0.9, "paper": 0, "scan": 0.3}, "ghost": 1.3, "bias": {"layout": {"circle": 1.8, "ring": 1.6, "pill": 1.4, "tile": 1.4, "vcols": 1.3}, "enter": {"assemble": 1.4, "blur": 1.4, "zoom": 1.3}, "exit": {"explode": 1.4, "glitch": 1.4, "blur": 1.2}}, "decor": {"rings": 1.4, "hud": 0.6, "dots": 1}, "hud": false}}, "styleOrder": ["noir", "crimson", "caution", "magenta", "paper", "hud", "mint", "specimen", "transit", "blueprint", "rouge", "mono"], "layoutOrder": ["center", "mixed", "vcols", "marquee", "tile", "scatter", "ring", "wave", "huge", "labels", "condensed", "gloss", "type", "diag", "circle", "stack", "pill"], "enterOrder": ["cut", "assemble", "slice", "type", "pop", "drop", "stretch", "wipe", "blur", "spin", "flicker", "scramble", "zoom"], "holdOrder": ["still", "jitter", "drift", "breathe", "wave", "glitchtick"], "exitOrder": ["cut", "explode", "fall", "drift", "slice", "wipe", "shrink", "blur", "stretch", "scatter", "glitch"], "decorOrder": ["brackets", "rings", "dots", "arrows", "slash", "sparks", "leaders", "waveform", "barcode", "grid", "stripes", "blobs", "bars", "shapes", "counter"], "names": {"layout": {"center": "\u4e2d\u592e", "mixed": "\u5927\u5c0f\u30df\u30c3\u30af\u30b9", "vcols": "\u7e26\u66f8\u304d", "marquee": "\u6d41\u308c\u308b\u5e2f", "tile": "\u6577\u304d\u8a70\u3081", "scatter": "\u6563\u3089\u3057", "ring": "\u5186\u74b0", "wave": "\u6ce2\u306e\u8ecc\u8de1", "huge": "\u753b\u9762\u7a81\u304d\u629c\u3051", "labels": "\u30e9\u30d9\u30eb\u8cbc\u308a", "condensed": "\u7e26\u9577\u5727\u7e2e", "gloss": "\u6ce8\u91c8", "type": "\u30bf\u30a4\u30d7", "diag": "\u659c\u3081\u5e2f", "circle": "\u5186\u7a93", "stack": "\u6b8b\u50cf\u30b9\u30bf\u30c3\u30af", "pill": "\u30ab\u30d7\u30bb\u30eb", "title": "\u30bf\u30a4\u30c8\u30eb", "interlude": "\u9593\u594f"}, "enter": {"cut": "\u30ab\u30c3\u30c8", "assemble": "\u5206\u89e3\u2192\u96c6\u5408", "slice": "\u30b9\u30e9\u30a4\u30b9", "type": "\u30bf\u30a4\u30d7", "pop": "\u30dd\u30c3\u30d7", "drop": "\u843d\u4e0b", "stretch": "\u4f38\u7e2e", "wipe": "\u30ef\u30a4\u30d7", "blur": "\u30d6\u30e9\u30fc", "spin": "\u56de\u8ee2", "flicker": "\u70b9\u6ec5", "scramble": "\u30b9\u30af\u30e9\u30f3\u30d6\u30eb", "zoom": "\u30ba\u30fc\u30e0"}, "hold": {"still": "\u9759\u6b62", "jitter": "\u30b8\u30c3\u30bf\u30fc", "drift": "\u30c9\u30ea\u30d5\u30c8", "breathe": "\u547c\u5438", "wave": "\u30a6\u30a7\u30fc\u30d6", "glitchtick": "\u30b0\u30ea\u30c3\u30c1"}, "exit": {"cut": "\u30ab\u30c3\u30c8", "explode": "\u7206\u6563", "fall": "\u5d29\u843d", "drift": "\u9727\u6563", "slice": "\u30b9\u30e9\u30a4\u30b9\u9000\u5834", "wipe": "\u30ef\u30a4\u30d7\u9000\u5834", "shrink": "\u53ce\u7e2e", "blur": "\u30d6\u30e9\u30fc\u9000\u5834", "stretch": "\u4f38\u7e2e\u9000\u5834", "scatter": "\u98db\u6563", "glitch": "\u30b0\u30ea\u30c3\u30c1\u9000\u5834"}, "decor": {"grid": "\u30b0\u30ea\u30c3\u30c9", "stripes": "\u30b9\u30c8\u30e9\u30a4\u30d7", "blobs": "\u30a4\u30f3\u30af\u306e\u67d3\u307f", "bars": "\u8352\u3044\u5e2f", "shapes": "\u56f3\u5f62", "counter": "\u5927\u304d\u306a\u6570\u5b57", "brackets": "\u67a0\u30de\u30fc\u30af", "rings": "\u5ea7\u6a19\u306e\u5186", "dots": "\u30c9\u30c3\u30c8\u306e\u8f2a", "arrows": "\u77e2\u5370", "slash": "\u30b9\u30e9\u30c3\u30b7\u30e5", "sparks": "\u30b9\u30d1\u30fc\u30af", "leaders": "\u5f15\u304d\u51fa\u3057\u7dda", "waveform": "\u6ce2\u5f62", "barcode": "\u30d0\u30fc\u30b3\u30fc\u30c9"}}, "moods": {"glitch": {"name": "\u30b0\u30ea\u30c3\u30c1", "fx": {"motion": [0.6, 0.9], "glitch": [0.75, 1], "chroma": [0.75, 1], "decor": [0.3, 0.6], "density": [0.6, 0.9], "texture": [0.5, 0.9], "bgSwitch": [0.3, 0.6]}, "layout": ["center", "condensed", "huge", "tile", "marquee", "vcols", "scatter", "stack"], "enter": ["slice", "scramble", "assemble", "flicker", "zoom", "stretch"], "exit": ["glitch", "slice", "explode", "fall"], "styles": ["noir", "crimson", "mint", "mono", "hud"]}, "calm": {"name": "\u3057\u3063\u3068\u308a", "fx": {"motion": [0.3, 0.55], "glitch": [0.05, 0.25], "chroma": [0.2, 0.5], "decor": [0.2, 0.5], "density": [0.25, 0.45], "texture": [0.5, 0.85], "bgSwitch": [0.1, 0.3]}, "layout": ["center", "vcols", "gloss", "stack", "circle", "type", "mixed"], "enter": ["blur", "type", "wipe", "assemble"], "exit": ["blur", "drift", "wipe", "shrink"], "styles": ["specimen", "paper", "hud", "noir"], "noHold": ["glitchtick", "jitter"]}, "pop": {"name": "\u30dd\u30c3\u30d7", "fx": {"motion": [0.7, 1], "glitch": [0.1, 0.35], "chroma": [0.3, 0.6], "decor": [0.6, 1], "density": [0.5, 0.8], "texture": [0.2, 0.5], "bgSwitch": [0.4, 0.8]}, "layout": ["mixed", "scatter", "wave", "labels", "pill", "ring", "huge", "diag", "center"], "enter": ["pop", "drop", "spin", "stretch", "zoom"], "exit": ["scatter", "shrink", "stretch", "blur"], "styles": ["magenta", "caution", "transit", "blueprint", "rouge"]}, "graphic": {"name": "\u30b0\u30e9\u30d5\u30a3\u30c3\u30af", "fx": {"motion": [0.5, 0.8], "glitch": [0.2, 0.5], "chroma": [0.4, 0.7], "decor": [0.7, 1], "density": [0.5, 0.8], "texture": [0.4, 0.7], "bgSwitch": [0.3, 0.7]}, "layout": ["diag", "labels", "marquee", "tile", "condensed", "huge", "circle", "pill"], "enter": ["wipe", "slice", "stretch", "zoom"], "exit": ["wipe", "slice", "stretch"], "styles": ["blueprint", "caution", "rouge", "mint", "transit"]}, "editorial": {"name": "\u30a8\u30c7\u30a3\u30c8\u30ea\u30a2\u30eb", "fx": {"motion": [0.4, 0.65], "glitch": [0.1, 0.3], "chroma": [0.2, 0.45], "decor": [0.4, 0.7], "density": [0.35, 0.6], "texture": [0.6, 0.9], "bgSwitch": [0.2, 0.4]}, "layout": ["gloss", "vcols", "mixed", "stack", "type", "center", "circle"], "enter": ["type", "blur", "wipe", "assemble"], "exit": ["blur", "drift", "wipe"], "styles": ["specimen", "paper", "noir", "mono", "hud"]}, "emotional": {"name": "\u30a8\u30e2\u30fc\u30b7\u30e7\u30ca\u30eb", "fx": {"motion": [0.55, 0.85], "glitch": [0.3, 0.6], "chroma": [0.5, 0.85], "decor": [0.3, 0.6], "density": [0.4, 0.7], "texture": [0.6, 1], "bgSwitch": [0.2, 0.5]}, "layout": ["huge", "center", "vcols", "stack", "condensed", "mixed", "circle"], "enter": ["assemble", "blur", "zoom", "wipe", "slice"], "exit": ["drift", "explode", "fall", "blur"], "styles": ["noir", "paper", "hud", "mono", "crimson"]}, "chaos": {"name": "\u5168\u90e8\u5165\u308a", "fx": {"motion": [0.5, 1], "glitch": [0.3, 1], "chroma": [0.4, 1], "decor": [0.4, 1], "density": [0.45, 0.9], "texture": [0.3, 1], "bgSwitch": [0.3, 0.9]}, "layout": null, "enter": null, "exit": null, "styles": null}}, "moodOrder": ["glitch", "calm", "pop", "graphic", "editorial", "emotional", "chaos"], "ghostPairs": [["#16F4D4", "#F5A50C"], ["#FF2A2A", "#2AA8FF"], ["#FF2BD6", "#2BFF88"], ["#FFE600", "#7B2BFF"], ["#FF6A00", "#00C2B8"], ["#FF6FAE", "#B6FF3B"], ["#00E0FF", "#FF3D6E"], ["#C8FF00", "#FF00A8"], ["#4D6BFF", "#FFB000"], ["#FF4B2B", "#2BD9FF"]], "fonts": {"gothic_black": {"label": "Noto Sans JP Black", "family": "Noto Sans JP", "weight": 900}, "gothic_bold": {"label": "Noto Sans JP Bold", "family": "Noto Sans JP", "weight": 700}, "gothic_med": {"label": "Noto Sans JP Medium", "family": "Noto Sans JP", "weight": 500}, "gothic_light": {"label": "Noto Sans JP Light", "family": "Noto Sans JP", "weight": 300}, "dela": {"label": "Dela Gothic One", "family": "Dela Gothic One", "weight": 400}, "zenkaku": {"label": "Zen Kaku Gothic New Black", "family": "Zen Kaku Gothic New", "weight": 900}, "mincho_black": {"label": "Zen Old Mincho Black", "family": "Zen Old Mincho", "weight": 900}, "mincho_bold": {"label": "Noto Serif JP Bold", "family": "Noto Serif JP", "weight": 700}, "mincho": {"label": "Noto Serif JP Medium", "family": "Noto Serif JP", "weight": 500}, "mincho_light": {"label": "Noto Serif JP Light", "family": "Noto Serif JP", "weight": 300}, "tokumin": {"label": "Kaisei Tokumin", "family": "Kaisei Tokumin", "weight": 800}, "round": {"label": "M PLUS Rounded 1c", "family": "M PLUS Rounded 1c", "weight": 800}, "pop": {"label": "Mochiy Pop One", "family": "Mochiy Pop One", "weight": 400}, "dot": {"label": "DotGothic16", "family": "DotGothic16", "weight": 400}, "brush": {"label": "Yuji Syuku", "family": "Yuji Syuku", "weight": 400}, "mono": {"label": "IBM Plex Mono", "family": "IBM Plex Mono", "weight": 500}, "sansui": {"label": "IBM Plex Sans JP", "family": "IBM Plex Sans JP", "weight": 500}}};
/*  JIZURA for After Effects \u2014 lyric motion panel
    ScriptUI panel: builds editable compositions (text animators, expressions,
    shape layers, effects) from lyrics or from a JIZURA plan JSON.
    Install: copy this file to
      After Effects/Support Files/Scripts/ScriptUI Panels/
    then open it from the Window menu.                                         */

// ---------------------------------------------------------------- utilities
function jzClamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function jzLerp(a, b, t) { return a + (b - a) * t; }
function jzTrim(s) { return String(s).replace(/^[\s\u3000]+|[\s\u3000]+$/g, ''); }
function jzIndexOf(arr, v) { for (var i = 0; i < arr.length; i++) if (arr[i] === v) return i; return -1; }
function jzKeys(o) { var r = []; for (var k in o) if (o.hasOwnProperty(k)) r.push(k); return r; }
function jzPad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
function jzHex(h) {
    h = String(h || '#000000').replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h.substr(0, 6), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function jzLum(h) { var c = jzHex(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
function jzParseJSON(s) {
    s = String(s).replace(/^\uFEFF/, '');
    if (typeof JSON !== 'undefined' && JSON.parse) return JSON.parse(s);
    return eval('(' + s + ')');
}
function jzChars(s) {
    var out = [], i = 0; s = String(s);
    while (i < s.length) {
        var c = s.charCodeAt(i);
        if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) { out.push(s.substr(i, 2)); i += 2; }
        else { out.push(s.charAt(i)); i++; }
    }
    return out;
}
function jzCode(ch) { return ch.charCodeAt(0); }
function jzIsKanji(ch) { var c = jzCode(ch); return (c >= 0x3400 && c <= 0x9FFF) || (c >= 0xF900 && c <= 0xFAFF) || ch === '\u3005' || ch === '\u3006'; }
function jzIsHira(ch) { var c = jzCode(ch); return c >= 0x3041 && c <= 0x309F; }
function jzIsKata(ch) { var c = jzCode(ch); return (c >= 0x30A0 && c <= 0x30FF) || (c >= 0x31F0 && c <= 0x31FF); }
function jzIsLatin(ch) { return /[A-Za-z0-9]/.test(ch); }
function jzIsPunct(ch) { return /[\u3001\u3002\uFF0C\uFF0E,.!?\uFF01\uFF1F\u2026\u2025\u30FB\u300C\u300D\u300E\u300F\uFF08\uFF09()\u3010\u3011~\u301C\uFF5E:\uFF1A;\uFF1B\-\u2014\u2015]/.test(ch); }
function jzCount(s) { return jzChars(String(s).replace(/[\s\u3000]+/g, '')).length; }

// deterministic hashing + seeded stream
function jzImul(a, b) {
    var ah = (a >>> 16) & 0xffff, al = a & 0xffff, bh = (b >>> 16) & 0xffff, bl = b & 0xffff;
    return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0)) | 0;
}
function jzHash(a, b, c, d) {
    var s = String(a) + '|' + String(b) + '|' + String(c) + '|' + String(d);
    var h = -2128831035;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = jzImul(h, 16777619); }
    h ^= h >>> 15; h = jzImul(h, 0x2c1b3c6d); h ^= h >>> 12; h = jzImul(h, 0x297a2d39); h ^= h >>> 15;
    return h >>> 0;
}
function jzR(a, b, c, d) { return jzHash(a, b, c, d) / 4294967296; }
function JzRng(seed) {
    this.s = (seed % 2147483647 + 2147483647) % 2147483647 || 1;
}
JzRng.prototype.next = function () { this.s = (this.s * 48271) % 2147483647; return (this.s - 1) / 2147483646; };
JzRng.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
JzRng.prototype.int = function (a, b) { return Math.floor(a + (b - a + 1) * this.next()); };
JzRng.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length) % arr.length]; };
JzRng.prototype.chance = function (p) { return this.next() < p; };
JzRng.prototype.wpick = function (list) { // [[value, weight], ...]
    var tot = 0, i; for (i = 0; i < list.length; i++) tot += list[i][1];
    var x = this.next() * tot;
    for (i = 0; i < list.length; i++) { x -= list[i][1]; if (x <= 0) return list[i][0]; }
    return list[list.length - 1][0];
};

// ---------------------------------------------------------------- lyric parsing
function jzParseLyrics(raw) {
    var lines = [], meta = {}, gap = false;
    var rows = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
    for (var r = 0; r < rows.length; r++) {
        var s0 = jzTrim(rows[r]);
        if (!s0) { if (lines.length) gap = true; continue; }
        if (s0.charAt(0) === '#') continue;
        var mm = s0.match(/^\[(ti|ar|al|by|offset):(.*)\]$/i);
        if (mm) { meta[mm[1].toLowerCase()] = jzTrim(mm[2]); continue; }
        var s = s0, times = [], m;
        while ((m = s.match(/^\[(\d+):(\d+(?:[.:]\d+)?)\]/))) { times.push(parseInt(m[1], 10) * 60 + parseFloat(m[2].replace(':', '.'))); s = s.substr(m[0].length); }
        s = jzTrim(s);
        var note = null, bar = s.indexOf('|');
        if (bar >= 0) { note = jzTrim(s.substr(bar + 1)) || null; s = jzTrim(s.substr(0, bar)); }
        var impact = false;
        if (s.length > 1 && s.charAt(s.length - 1) === '!') { impact = true; s = jzTrim(s.substr(0, s.length - 1)); }
        var emph = [];
        s = s.replace(/\*([^*]+)\*/g, function (all, w) { emph.push(w); return w; });
        var manual = null;
        if (s.indexOf('/') >= 0) {
            var parts = s.split('/'), mp = [];
            for (var p = 0; p < parts.length; p++) { var tp = jzTrim(parts[p]); if (tp) mp.push(tp); }
            manual = mp; s = mp.join(/[A-Za-z]/.test(s) ? ' ' : '');
        }
        if (!s) continue;
        var base = { text: s, note: note, impact: impact, emph: emph, manual: manual, gapBefore: gap, lrc: null };
        gap = false;
        if (times.length) { for (var t = 0; t < times.length; t++) { var c = jzCopy(base); c.lrc = times[t]; lines.push(c); } }
        else lines.push(base);
    }
    return { lines: lines, meta: meta };
}
function jzCopy(o) { var r = {}; for (var k in o) if (o.hasOwnProperty(k)) r[k] = o[k]; return r; }

// bunsetsu-ish chunking without a dictionary: script runs + trailing kana
function jzChunk(text) {
    var cs = jzChars(text), chunks = [], cur = '', curType = '', hasH = false, i;
    function typeOf(ch) {
        if (/[\s\u3000]/.test(ch)) return 'S';
        if (jzIsPunct(ch)) return 'P';
        if (jzIsKanji(ch)) return 'K';
        if (jzIsHira(ch) || ch === '\u30FC') return 'H';
        if (jzIsKata(ch)) return 'T';
        if (jzIsLatin(ch)) return 'L';
        return 'O';
    }
    function close() { if (jzTrim(cur)) chunks.push(jzTrim(cur)); cur = ''; curType = ''; hasH = false; }
    var hRun = 0;
    for (i = 0; i < cs.length; i++) {
        var ch = cs[i], t = typeOf(ch);
        if (t === 'S') { close(); continue; }
        if (t === 'P') { if (cur) cur += ch; else if (chunks.length) chunks[chunks.length - 1] += ch; continue; }
        if (!cur) { cur = ch; curType = t; hasH = t === 'H'; hRun = t === 'H' ? 1 : 0; continue; }
        if (t === 'H') {
            // kana after kanji/katakana (okurigana, particles) stays; long pure-kana runs split at ~6
            if (curType !== 'H' || jzChars(cur).length < 6) { cur += ch; hasH = true; hRun++; continue; }
            close(); cur = ch; curType = 'H'; hasH = true; hRun = 1; continue;
        }
        if (t === 'K' && curType === 'K' && !hasH) { cur += ch; continue; }
        if (t === 'T' && curType === 'T' && !hasH) { cur += ch; continue; }
        if (t === 'L' && curType === 'L') { cur += ch; continue; }
        // kanji right after a short kana particle run starts a new chunk
        close(); cur = ch; curType = t; hasH = t === 'H'; hRun = 0;
    }
    close();
    var out = [];
    for (i = 0; i < chunks.length; i++) {
        var n = jzChars(chunks[i]).length;
        if (n > 10) { var half = Math.ceil(n / 2), cc = jzChars(chunks[i]); out.push(cc.slice(0, half).join('')); out.push(cc.slice(half).join('')); }
        else out.push(chunks[i]);
    }
    for (i = out.length - 1; i > 0; i--) if (jzChars(out[i]).length === 1 && !jzIsKanji(out[i])) { out[i - 1] += out[i]; out.splice(i, 1); }
    return out.length ? out : [text];
}

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
    sansui: ['IBMPlexSansJP-Medium', 'NotoSansJP-Medium', 'YuGothic-Medium', 'Meiryo']
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
    if (/mincho|tokumin|brush/.test(key)) return 'serif';
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
function jzVertical(str) { return jzChars(String(str).replace(/[\s\u3000]+/g, '')).join('\r'); }
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

// ================================================================ planner (AE standalone mode)
// Same decisions as the browser app: chunks -> cuts -> weighted recipe picks -> events.
function jzW(obj, k, d) { return (obj && obj[k] != null) ? obj[k] : d; }
function jzNovelty(hist, key, val) {
    var w = 1;
    for (var i = hist.length - 1, d = 0; i >= 0 && d < 6; i--, d++) if (hist[i][key] === val) w *= d < 2 ? 0.2 : 0.6;
    return w;
}
var JZ_FITS = { center: [1, 99], mixed: [2, 16], vcols: [1, 18], marquee: [1, 12], tile: [1, 12], scatter: [2, 14], ring: [2, 16], wave: [2, 16], huge: [1, 8], labels: [1, 16], condensed: [1, 10], gloss: [1, 12], type: [1, 28], diag: [1, 14], circle: [1, 10], stack: [1, 12], pill: [1, 14] };
var JZ_LAYOUT_ENTER = { type: { type: 4, scramble: 1.5 }, ring: { pop: 2, spin: 2, cut: 1, assemble: 0.4, slice: 0.2, wipe: 0.2 }, labels: { cut: 3, pop: 1 }, wave: { pop: 1.5, drop: 1.5, blur: 1, slice: 0.3 }, tile: { assemble: 1.3, slice: 1.4, zoom: 1.4 }, huge: { zoom: 1.5, wipe: 1.5, slice: 1.4, stretch: 1.3, type: 0.2 }, mixed: { pop: 1.6, drop: 1.6, spin: 1.3 }, scatter: { pop: 1.5, spin: 1.5, drop: 1.2, assemble: 1.3 }, vcols: { assemble: 1.8, type: 1.2 }, pill: { wipe: 1.8, type: 1.2 } };

function jzPickLayout(rng, st, en, n, dur, hist, emph, recap) {
    var c = [], order = JZ_DATA.layoutOrder;
    for (var i = 0; i < order.length; i++) {
        var k = order[i], f = JZ_FITS[k];
        if (!en[k] || !f || n < f[0] || n > f[1]) continue;
        var w = jzW(st.bias.layout, k, 1) * jzNovelty(hist, 'layout', k);
        if (emph && /^(huge|center|tile|marquee|condensed)$/.test(k)) w *= 2;
        if (recap && /^(center|stack|marquee|tile|mixed|type|gloss)$/.test(k)) w *= 1.8;
        if (dur < 0.5 && /^(wave|ring|labels|gloss|type|tile)$/.test(k)) w *= 0.3;
        if (dur < 0.5 && /^(center|huge|condensed|vcols)$/.test(k)) w *= 1.4;
        c.push([k, w]);
    }
    return c.length ? rng.wpick(c) : 'center';
}
function jzPickEnter(rng, st, en, layout, dur, hist, emph, n) {
    var c = [], order = JZ_DATA.enterOrder;
    for (var i = 0; i < order.length; i++) {
        var k = order[i]; if (!en[k]) continue;
        var w = jzW(st.bias.enter, k, 1) * jzNovelty(hist, 'enter', k) * jzW(JZ_LAYOUT_ENTER[layout], k, 1);
        if (k === 'cut') w *= 0.5;
        if (dur < 0.45 && /^(type|assemble|drop|spin|pop|flicker)$/.test(k)) w *= 0.25;
        if (dur < 0.45 && /^(cut|slice|zoom|stretch)$/.test(k)) w *= 1.8;
        if (k === 'type' && n > 18) w *= 0.3;
        if (emph && /^(zoom|assemble|slice)$/.test(k)) w *= 1.8;
        c.push([k, w]);
    }
    return c.length ? rng.wpick(c) : 'cut';
}
function jzPickExit(rng, st, en, layout, dur, last, hist) {
    var c = [], order = JZ_DATA.exitOrder;
    for (var i = 0; i < order.length; i++) {
        var k = order[i]; if (!en[k]) continue;
        var w = jzW(st.bias.exit, k, 1) * jzNovelty(hist, 'exit', k);
        if (k === 'cut') w *= dur < 0.6 ? 4 : (last ? 1.2 : 2.2);
        if (dur < 0.6 && k !== 'cut') w *= 0.4;
        if (/^(labels|ring|tile)$/.test(layout) && /^(explode|fall|drift)$/.test(k)) w *= 0.3;
        c.push([k, w]);
    }
    return c.length ? rng.wpick(c) : 'cut';
}
function jzParams(layout, rng, st, text) {
    var n = jzCount(text), D = st.fonts.display, S = st.fonts.serif, B = st.fonts.body;
    function both(a, b) { return a.concat(b); }
    switch (layout) {
        case 'center': return { font: rng.pick(rng.chance(0.7) ? D : S), sx: rng.pick([1, 1, 1, 1.25, 1.45, 0.78]), track: rng.range(0.02, 0.14), sub: rng.chance(0.45), under: rng.chance(0.3), accent: rng.chance(0.18), ox: rng.range(-0.05, 0.05), oy: rng.range(-0.06, 0.06) };
        case 'mixed': return { fontBig: rng.pick(both(D, S)), fontSmall: rng.pick(both(S, B)), mode: rng.pick(['line', 'stair', 'line', 'wave']), rotAmp: rng.range(2, 10), smallK: rng.range(0.42, 0.6), accentIdx: rng.int(0, 20) };
        case 'vcols': return { variant: n <= 5 ? rng.pick(['repeat', 'repeat', 'split']) : (n <= 9 ? rng.pick(['split', 'repeat']) : 'split'), cols: n <= 4 ? rng.pick([3, 5, 5]) : 3, font: rng.pick(both(S, D)), side: rng.pick(['same', 'outline', 'dim']), perCol: rng.int(3, 6) };
        case 'marquee': return { rows: rng.pick([2, 4, 4, 2]), rowStyle: rng.pick(['outline', 'dim', 'box']), speed: rng.range(0.5, 1.2), font: rng.pick(D), sx: rng.pick([1.25, 1.45, 1.6]) };
        case 'tile': return { unit: rng.pick(['chunk', 'line', 'chunk']), knock: rng.pick(['stroke', 'box']), font: rng.pick(D), tileFont: rng.pick(both(S, B)), rowsN: rng.pick([12, 14, 16]) };
        case 'scatter': return { font: rng.pick(D), fontB: rng.pick(both(S, D)), extras: rng.chance(0.65) };
        case 'ring': return { center: rng.pick(['word', 'disc', 'word', 'none']), speed: rng.range(4, 12) * rng.pick([1, -1]), R: rng.range(0.28, 0.35), font: rng.pick(both(D, S)), fontC: rng.pick(both(D, S)) };
        case 'wave': return { amp: rng.range(0.08, 0.17), freq: rng.range(0.8, 1.6), trail: rng.pick([5, 7, 9]), font: rng.pick(D), travel: rng.range(0.25, 0.5) * rng.pick([1, -1]) };
        case 'huge': return { font: rng.pick(D), grad: !!st.useGrad && rng.chance(0.75), dir: rng.pick([1, -1]), label: rng.chance(0.8) };
        case 'labels': return { variant: rng.pick(['radial', 'rows', 'scatter']), unit: n <= 6 ? 'char' : rng.pick(['char', 'word']), center: rng.pick(['orb', 'word', 'none']), font: rng.pick(both(D, B)), fontC: rng.pick(D) };
        case 'condensed': return { count: n <= 4 ? rng.pick([3, 2, 1]) : (n <= 7 ? rng.pick([2, 1]) : 1), sx: rng.range(0.42, 0.58), sy: rng.range(1.1, 1.3), font: rng.pick(both(D, B)) };
        case 'gloss': return { font: rng.pick(both(S, D)), side: rng.pick(['right', 'left']), bgText: rng.chance(0.6), vertNote: rng.chance(0.45) };
        case 'type': return { font: rng.pick(both(B, S)), align: rng.pick(['left', 'center']), prompt: rng.chance(0.6) };
        case 'diag': return { ang: rng.range(10, 22) * rng.pick([1, -1]), band: rng.pick(['accent', 'ink']), second: rng.chance(0.7), font: rng.pick(D) };
        case 'circle': return { variant: rng.pick(['disc', 'eclipse', 'ring']), vertical: n <= 4 && rng.chance(0.5), font: rng.pick(both(D, S)), off: rng.range(-0.12, 0.12) };
        case 'stack': return { copies: rng.pick([3, 4, 5]), dir: rng.pick([1, -1]), style: rng.pick(['fade', 'outline', 'fade']), font: rng.pick(both(D, S)), gap: rng.range(0.82, 1.02), xs: rng.range(-0.04, 0.04) };
        case 'pill': return { grad: !!st.useGrad || rng.chance(0.35), font: rng.pick(both(D, B)), smalls: rng.chance(0.75) };
    }
    return {};
}
function jzPickDecor(rng, st, en, fx) {
    var count = Math.round(fx.decor * 2.8 * rng.range(0.45, 1.15)), c = [], out = [], order = JZ_DATA.decorOrder, i;
    for (i = 0; i < order.length; i++) if (en[order[i]]) c.push([order[i], jzW(st.decor, order[i], 0.12)]);
    for (i = 0; i < count && c.length; i++) {
        var k = rng.wpick(c);
        for (var j = 0; j < c.length; j++) if (c[j][0] === k) { c.splice(j, 1); break; }
        out.push({ id: k, seed: rng.int(1, 999999999), n: rng.int(1, 3) + (k === 'shapes' ? 3 : 0) + (k === 'sparks' ? 4 : 0), right: rng.chance(0.5), low: rng.chance(0.5), accent: rng.chance(0.4), corner: rng.chance(0.5), big: rng.chance(0.4), mode: rng.pick(['count', 'index']), from: rng.int(0, 20), to: rng.int(30, 999) });
    }
    return out;
}
function jzPartition(chunks, k) {
    var lens = [], tot = 0, i;
    for (i = 0; i < chunks.length; i++) { lens.push(jzChars(chunks[i]).length + 1); tot += lens[i]; }
    var target = tot / k, groups = [], cur = [], acc = 0, remG = k;
    for (i = 0; i < chunks.length; i++) {
        var remC = chunks.length - i;
        if (cur.length && (acc + lens[i] / 2 > target || remC < remG) && groups.length < k - 1) { groups.push(cur); cur = []; acc = 0; remG--; }
        cur.push(chunks[i]); acc += lens[i];
    }
    if (cur.length) groups.push(cur);
    return groups;
}

// o: {lyrics, title, artist, style, seed, fx, width, height, fps, bpm, starts[], enabled{layout,enter,exit,hold,decor}, offset, lineScale, duration}
function jzMakePlan(o) {
    var st = JZ_DATA.styles[o.style] || JZ_DATA.styles.noir;
    var fx = o.fx, parsed = jzParseLyrics(o.lyrics), lines = parsed.lines;
    var title = o.title || parsed.meta.ti || '', artist = o.artist || parsed.meta.ar || '';
    var en = o.enabled, beat = o.bpm > 0 ? 60 / o.bpm : 0, starts = [], ends = [], i, allLrc = lines.length > 0;
    for (i = 0; i < lines.length; i++) if (lines[i].lrc == null) allLrc = false;
    for (i = 0; i < lines.length; i++) {
        var s;
        if (o.starts && o.starts[i] != null) s = o.starts[i];
        else if (allLrc) s = lines[i].lrc;
        else if (i === 0) s = o.offset || 0.4;
        else {
            var n0 = jzChars(lines[i - 1].text).length, d0 = jzClamp(0.8 + n0 * 0.17, 1.3, 5.2) * (o.lineScale || 1);
            if (beat) d0 = Math.max(2, Math.round(d0 / beat)) * beat;
            s = starts[i - 1] + d0 + (lines[i].gapBefore ? (beat ? beat * 2 : 0.8) : 0);
        }
        starts.push(s);
    }
    for (i = 0; i < lines.length; i++) {
        if (i < lines.length - 1) ends.push(Math.max(starts[i] + 0.35, starts[i + 1]));
        else { var nl = jzChars(lines[i].text).length, dl = jzClamp(0.8 + nl * 0.17, 1.5, 5.2) * (o.lineScale || 1); if (beat) dl = Math.max(2, Math.round(dl / beat)) * beat; ends.push(starts[i] + dl); }
    }
    var duration = o.duration || ((ends.length ? ends[ends.length - 1] : 3) + 0.9);
    var plan = { version: 1, generator: 'JIZURA-AE', title: title, artist: artist, W: o.width, H: o.height, width: o.width, height: o.height, fps: o.fps, duration: duration, style: st, styleKey: o.style, fx: fx, lines: [], cuts: [], events: [], hud: fx.hud };
    var hist = [], schemeIdx = 0, nS = st.schemes.length;
    function ev(t, type, amp, dur) { plan.events.push({ t: t, type: type, amp: amp, dur: dur }); }
    if (title && starts.length && starts[0] >= 1.1) {
        var tr = new JzRng(jzHash(o.seed, 999));
        plan.cuts.push({ text: title, note: artist, lineText: title, line: -1, start: 0.1, end: starts[0] - 0.04, layout: 'title', enter: tr.pick(['blur', 'type', 'wipe', 'assemble']), exit: tr.pick(['blur', 'drift', 'wipe']), hold: 'still', inDur: 0.3, outDur: 0.3, params: { font: tr.pick(st.fonts.display) }, decor: [], scheme: 0, seed: jzHash(o.seed, 999, 1) % 1000000 });
    }
    for (var li = 0; li < lines.length; li++) {
        var ln = lines[li], s0 = starts[li], e0 = ends[li], rng = new JzRng(jzHash(o.seed, li + 1));
        var nch = jzCount(ln.text), visEnd = Math.min(e0, s0 + Math.max(3.6, nch * 0.5 + 1.2)), D = visEnd - s0;
        plan.lines.push({ index: li, text: ln.text, start: s0, end: e0, visEnd: visEnd, note: ln.note, impact: ln.impact });
        var chunks = ln.manual || jzChunk(ln.text), L = jzLerp(1.3, 0.5, fx.density), nC = Math.round(D / L);
        var maxC = chunks.length + (chunks.length >= 2 && D > 2 ? 1 : 0); nC = jzClamp(nC, 1, Math.max(1, maxC));
        var nG = Math.min(nC, chunks.length), groups = [];
        if (nG <= 1) groups = [ln.text];
        else { var pg = jzPartition(chunks, nG); for (i = 0; i < pg.length; i++) groups.push(pg[i].join(/[A-Za-z]/.test(pg[i].join('')) ? ' ' : '')); }
        var recap = nC > groups.length && groups.length >= 2, units = [], tot = 0;
        for (i = 0; i < groups.length; i++) { units.push({ text: groups[i], w: jzChars(groups[i]).length + 1.6 }); tot += units[i].w; }
        if (recap) { var rw = tot / units.length * 1.25; units.push({ text: ln.text, w: rw, recap: true }); tot += rw; }
        var bounds = [s0], acc = s0;
        for (i = 0; i < units.length; i++) { acc += D * units[i].w / tot; bounds.push(i === units.length - 1 ? visEnd : acc); }
        if (nS > 1 && li > 0 && rng.chance(fx.bgSwitch * (ln.impact ? 1.8 : 1))) schemeIdx = (schemeIdx + 1 + rng.int(0, nS - 2)) % nS;
        for (var k = 0; k < units.length; k++) {
            var u = units[k], cs = bounds[k], ce = bounds[k + 1], dur = ce - cs, nn = jzCount(u.text);
            var emph = (ln.impact && (k === 0 || u.recap));
            for (var q = 0; q < ln.emph.length; q++) if (u.text.indexOf(ln.emph[q]) >= 0) emph = true;
            var layout = jzPickLayout(rng, st, en.layout, nn, dur, hist, emph, u.recap);
            var enter = jzPickEnter(rng, st, en.enter, layout, dur, hist, emph, nn);
            var exit = jzPickExit(rng, st, en.exit, layout, dur, k === units.length - 1, hist);
            var holds = [['still', 1], ['jitter', 1.2 * fx.motion], ['drift', 1], ['breathe', 0.7], ['wave', 0.4], ['glitchtick', 0.9 * fx.glitch]], hc = [];
            for (q = 0; q < holds.length; q++) if (en.hold[holds[q][0]] !== false) hc.push(holds[q]);
            var hold = hc.length ? rng.wpick(hc) : 'still';
            var inDur = jzClamp(dur * 0.36, 0.12, 0.6);
            if (enter === 'type') inDur = jzClamp(nn * 0.055 + 0.1, 0.15, dur * 0.65);
            if (enter === 'assemble') inDur = jzClamp(dur * 0.45, 0.22, 0.75);
            if (enter === 'cut') inDur = 0.12;
            var outDur = exit === 'cut' ? 0 : jzClamp(dur * 0.3, 0.14, 0.55);
            if (/^(explode|fall|drift)$/.test(exit)) outDur = jzClamp(dur * 0.38, 0.25, 0.7);
            if (inDur + outDur > dur * 0.92) { var f = dur * 0.92 / (inDur + outDur); inDur *= f; outDur *= f; }
            var sch = schemeIdx; if (nS > 1 && k > 0 && rng.chance(0.12 * fx.bgSwitch)) sch = (schemeIdx + 1) % nS;
            plan.cuts.push({ index: plan.cuts.length, text: u.text, lineText: ln.text, note: ln.note, line: li, start: cs, end: ce, dur: dur, layout: layout, enter: enter, exit: exit, hold: hold, inDur: inDur, outDur: outDur, params: jzParams(layout, rng, st, u.text), decor: jzPickDecor(rng, st, en.decor, fx), scheme: sch, seed: jzHash(o.seed, li, k) % 1000000, emph: emph, recap: !!u.recap, words: jzChunk(u.text), stagger: rng.range(0.025, 0.06) });
            hist.push({ layout: layout, enter: enter, exit: exit });
            var g = fx.glitch * (st.glitchBoost || 1);
            ev(cs, 'chroma', 1.4 + rng.range(0, 2) * fx.chroma + (emph ? 2.5 : 0), 0.25);
            if (rng.chance(g * 0.5 + (emph ? 0.3 : 0))) ev(cs, 'slice', 0.6 + rng.range(0, 0.8) * g + (emph ? 0.5 : 0), rng.pick([2, 3, 4]) / o.fps);
            if (emph || rng.chance(fx.motion * 0.18)) ev(cs, 'shake', (emph ? 1 : 0.5) * fx.motion, 0.3);
            if (fx.flash && ln.impact && k === 0) ev(cs, 'flash', 1, 3 / o.fps);
            if (rng.chance(0.035 * g)) ev(cs, 'invert', 1, 2 / o.fps);
            if ((emph && rng.chance(0.6)) || rng.chance(0.06 * fx.motion)) ev(cs, 'zoom', 0.7 + 0.5 * fx.motion, 0.22);
            if (dur > 0.8 && rng.chance(g * 0.4)) ev(cs + rng.range(0.35, 0.8) * dur, 'slice', 0.4 + g * 0.4, 2 / o.fps);
        }
        if (li < lines.length - 1 && starts[li + 1] - visEnd > 1.3) {
            var r2 = new JzRng(jzHash(o.seed, li, 404));
            plan.cuts.push({ index: plan.cuts.length, text: title || '', lineText: '', line: li, start: visEnd, end: starts[li + 1], layout: 'interlude', enter: 'blur', exit: 'blur', hold: 'still', inDur: 0.3, outDur: 0.3, params: { variant: r2.pick(['counter', 'rings']) }, decor: jzPickDecor(r2, st, en.decor, { decor: 1 }), scheme: schemeIdx, seed: jzHash(o.seed, li, 405) % 1000000 });
        }
    }
    plan.cuts.sort(function (a, b) { return a.start - b.start; });
    for (i = 0; i < plan.cuts.length; i++) plan.cuts[i].index = i;
    plan.events.sort(function (a, b) { return a.t - b.t; });
    return plan;
}

// ================================================================ \u304A\u307E\u304B\u305B + random accent / ghost colours (ES3 port of the web engine)
function jzToHex(r, g, b) {  // 0..255 -> #RRGGBB
    function h2(v) { v = Math.round(jzClamp(v, 0, 255)); var s = v.toString(16).toUpperCase(); return s.length < 2 ? '0' + s : s; }
    return '#' + h2(r) + h2(g) + h2(b);
}
function jzHsl(h, s, l) {    // h 0..360, s/l 0..1 -> hex
    h = ((h % 360) + 360) % 360 / 360;
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    return jzToHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
}
function jzToHsl(hex) {
    var c = jzHex(hex), r = c[0], g = c[1], b = c[2];
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    var d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    var h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
    return [h * 60, s, l];
}
function jzRelLum(hex) {
    var c = jzHex(hex), o = [], k, v;
    for (k = 0; k < 3; k++) { v = c[k]; o.push(v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); }
    return 0.2126 * o[0] + 0.7152 * o[1] + 0.0722 * o[2];
}
function jzContrast(a, b) { var x = jzRelLum(a), y = jzRelLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
// nudge lightness away from the background until the colour reads
function jzFitContrast(hex, bg, min) {
    if (jzContrast(hex, bg) >= min) return String(hex).toUpperCase();
    var hsl = jzToHsl(hex), l = hsl[2], dark = jzLum(bg) < 0.5, i, c;
    for (i = 0; i < 24; i++) {
        l = dark ? Math.min(0.96, l + 0.035) : Math.max(0.04, l - 0.035);
        c = jzHsl(hsl[0], hsl[1], l);
        if (jzContrast(c, bg) >= min) return c;
    }
    return dark ? '#FFFFFF' : '#111111';
}
function jzMixHex(h1, h2, t) { var a = jzHex(h1), b = jzHex(h2); return jzToHex((a[0] + (b[0] - a[0]) * t) * 255, (a[1] + (b[1] - a[1]) * t) * 255, (a[2] + (b[2] - a[2]) * t) * 255); }
function jzCleanHex(s) {     // '#abc123' / 'abc123' -> '#ABC123', anything else -> null
    s = jzTrim(s || '').replace(/^#/, '');
    if (/^[0-9A-Fa-f]{3}$/.test(s)) s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2);
    return /^[0-9A-Fa-f]{6}$/.test(s) ? '#' + s.toUpperCase() : null;
}
// accent + chromatic ghost pair that works on the given background
function jzRandomPalette(bg, rnd) {
    rnd = rnd || Math.random;
    var dark = jzLum(bg) < 0.5, a, b, t;
    if (rnd() < 0.4) {
        var pr = JZ_DATA.ghostPairs[Math.floor(rnd() * JZ_DATA.ghostPairs.length) % JZ_DATA.ghostPairs.length];
        a = pr[0]; b = pr[1];
        if (rnd() < 0.5) { t = a; a = b; b = t; }
        if (!dark) { a = jzHsl(jzToHsl(a)[0], 0.95, 0.47); b = jzHsl(jzToHsl(b)[0], 0.95, 0.47); }
    } else {
        var h = rnd() * 360, gap = [180, 165, 150, 135][Math.floor(rnd() * 4) % 4] * (rnd() < 0.5 ? 1 : -1);
        var s = 0.82 + rnd() * 0.18, l = dark ? 0.52 + rnd() * 0.1 : 0.44 + rnd() * 0.08;
        a = jzHsl(h, s, l); b = jzHsl(h + gap, s, l);
    }
    var r = rnd(), ha = jzToHsl(a)[0], hb = jzToHsl(b)[0];
    var acc = r < 0.35 ? a : (r < 0.6 ? b : jzHsl((ha + hb) / 2 + (rnd() < 0.5 ? 0 : 180), 0.9, dark ? 0.6 : 0.45));
    return { accent: jzFitContrast(acc, bg, 3), ghostA: a, ghostB: b };
}
// copy of a style pack with the accent / ghost colours replaced in every scheme (the shared data is never mutated)
function jzStyleWithPalette(st, pal) {
    var o = jzCopy(st), out = [], i, s, acc;
    for (i = 0; i < st.schemes.length; i++) {
        s = jzCopy(st.schemes[i]);
        if (pal.accent) {
            acc = jzFitContrast(pal.accent, s.bg, 2.4);
            if (s.ink === s.accent) s.ink = acc;
            s.accent = acc;
            if (s.grad) s.grad = [acc, jzMixHex(pal.accent, '#000000', 0.7)];
        }
        if (pal.ghostA) s.ghostA = jzFitContrast(pal.ghostA, s.bg, 1.35);
        if (pal.ghostB) s.ghostB = jzFitContrast(pal.ghostB, s.bg, 1.35);
        out.push(s);
    }
    o.schemes = out;
    return o;
}
// technique on/off map for a mood \u2014 deterministic from the seed so a rebuild reproduces it
function jzAllEnabled() {
    var en = { layout: {}, enter: {}, exit: {}, hold: {}, decor: {} }, groups = [['layout', JZ_DATA.layoutOrder], ['enter', JZ_DATA.enterOrder], ['exit', JZ_DATA.exitOrder], ['hold', JZ_DATA.holdOrder], ['decor', JZ_DATA.decorOrder]], k, j;
    for (k = 0; k < groups.length; k++) for (j = 0; j < groups[k][1].length; j++) en[groups[k][0]][groups[k][1][j]] = true;
    return en;
}
function jzMoodEnabled(moodKey, seed) {
    var M = moodKey ? JZ_DATA.moods[moodKey] : null;
    if (!M) return jzAllEnabled();
    var rng = new JzRng((jzHash(seed || 1, 4242) % 2147483646) + 1), en = jzAllEnabled(), k;
    function subset(group, order, prefer, min) {
        var on = {}, n = 0, i;
        for (i = 0; i < order.length; i++) { on[order[i]] = prefer ? (jzIndexOf(prefer, order[i]) >= 0 || rng.chance(0.22)) : rng.chance(0.8); if (on[order[i]]) n++; }
        for (i = 0; i < order.length && n < min; i++) if (!on[order[i]]) { on[order[i]] = true; n++; }
        en[group] = on;
    }
    subset('layout', JZ_DATA.layoutOrder, M.layout, 4);
    subset('enter', JZ_DATA.enterOrder, M.enter, 3);
    subset('exit', JZ_DATA.exitOrder, M.exit, 3);
    en.enter.cut = true; en.exit.cut = true;
    for (k = 0; k < JZ_DATA.holdOrder.length; k++) en.hold[JZ_DATA.holdOrder[k]] = jzIndexOf(M.noHold || [], JZ_DATA.holdOrder[k]) < 0;
    subset('decor', JZ_DATA.decorOrder, null, 4);
    return en;
}
// roll a whole new look: mood, style, effect strengths, switches, seed, maybe a palette
function jzOmakase(curMood, curStyle, rnd) {
    rnd = rnd || Math.random;
    function pick(a) { return a[Math.floor(rnd() * a.length) % a.length]; }
    function range(r) { return r[0] + (r[1] - r[0]) * rnd(); }
    var moods = [], i, k;
    for (i = 0; i < JZ_DATA.moodOrder.length; i++) if (JZ_DATA.moodOrder[i] !== curMood) moods.push(JZ_DATA.moodOrder[i]);
    var mood = pick(moods), M = JZ_DATA.moods[mood];
    var base = (M.styles && rnd() < 0.72) ? M.styles : JZ_DATA.styleOrder, pool = [];
    for (i = 0; i < base.length; i++) if (base[i] !== curStyle && JZ_DATA.styles[base[i]]) pool.push(base[i]);
    if (!pool.length) for (i = 0; i < JZ_DATA.styleOrder.length; i++) if (JZ_DATA.styleOrder[i] !== curStyle) pool.push(JZ_DATA.styleOrder[i]);
    var style = pick(pool), fx = {};
    for (k in M.fx) if (M.fx.hasOwnProperty(k)) fx[k] = range(M.fx[k]);
    var r = { mood: mood, style: style, fx: fx, onTwos: rnd() < 0.75, flash: rnd() < 0.65, hud: pick([0, 0, 1, 2]), seed: Math.floor(rnd() * 999999999), palette: null };
    if (rnd() < 0.38) r.palette = jzRandomPalette(JZ_DATA.styles[style].schemes[0].bg, rnd);
    return r;
}

// ================================================================ motion (enter / hold / exit)
// Everything is expressed as text-animator Expression Selectors or layer
// transform expressions, so the result stays editable and re-timable in AE.
var JZ_FNS = 'function cl(x){return Math.max(0,Math.min(1,x));}' +
    'function oe(x){x=cl(x);return x>=1?1:1-Math.pow(2,-10*x);}' +
    'function ioe(x){x=cl(x);if(x<=0||x>=1)return x;return x<0.5?Math.pow(2,20*x-10)/2:(2-Math.pow(2,-20*x+10))/2;}' +
    'function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}' +
    'function ic(x){x=cl(x);return x*x*x;}' +
    'function iq(x){x=cl(x);return x*x;}' +
    'function ie(x){x=cl(x);return x<=0?0:Math.pow(2,10*x-10);}' +
    'function ob(x,s){x=cl(x);var c=s+1;return 1+c*Math.pow(x-1,3)+s*Math.pow(x-1,2);}' +
    'function bo(x){x=cl(x);var n=7.5625,d=2.75;if(x<1/d)return n*x*x;if(x<2/d){x-=1.5/d;return n*x*x+0.75;}if(x<2.5/d){x-=2.25/d;return n*x*x+0.9375;}x-=2.625/d;return n*x*x+0.984375;}\n';

function jzHead(ctx, o) {
    var c = ctx.cut;
    return 'var IN=' + jzN(Math.max(0.02, c.inDur || 0.3)) + ',DL=' + jzN((o.mi || 0) * (c.stagger || 0.04)) +
        ',OS=' + jzN(c.dur - (c.outDur || 0)) + ',OD=' + jzN(Math.max(0.001, c.outDur || 0)) + ',DUR=' + jzN(c.dur) +
        ',SD=' + ((c.seed % 99991) + (o.mi || 0) * 101) + ',M=' + jzN(ctx.fx.motion) + ',G=' + jzN(ctx.fx.glitch) + ',SZ=' + jzN(o.size || 100) + ';\n' + JZ_FNS +
        'var P=cl((time-DL)/IN), PO=(OD>0.002?cl((time-OS)/OD):0), AMT=cl((time-DL-IN*0.85)/0.25)*(1-PO);\n';
}

function jzMotion(ctx, L, o) {
    var c = ctx.cut, isText = o.text !== false;
    var en = o.enter || c.enter || 'cut', ex = o.exit || c.exit || 'cut', ho = o.noHold ? 'still' : (c.hold || 'still');
    var size = o.size || 100, W = ctx.W, H = ctx.H;
    var HD = jzHead(ctx, o);
    var parts = { sc: [], pos: [], op: [], rot: [] };
    var seedR = 'seedRandom(textIndex*7919+SD,true);';
    if (!isText) {       // shapes / groups: map to layer-level motion
        if (en !== 'cut') { parts.sc.push('var q=oe(P);f=[f[0]*(q<1?ob(P,2):1),f[1]*(q<1?ob(P,2):1)];'); }
        if (ex !== 'cut') parts.sc.push('f=[f[0]*(1-ic(PO)),f[1]*(1-ic(PO))];');
        parts.op.push('f*=time<DL?0:1;');
    } else {
        // -------- enter
        if (en === 'assemble') {
            var sp = size * 3.2 * (0.6 + ctx.fx.motion * 0.7);
            var core = HD + seedR + 'var dl=random(0,IN*0.45);var x=(time-DL-dl)/(IN*0.62);var k=(1-oe(x))*100;';
            jzAnimator(L, 'JZ In Move', [['ADBE Text Position 3D', [sp, sp, 0]], ['ADBE Text Rotation', 190]], core + 'var a=random(0,Math.PI*2);var r=random(0.35,1);[Math.cos(a)*k*r,Math.sin(a)*k*r,0]');
            jzAnimator(L, 'JZ In Scale', [['ADBE Text Scale 3D', [210, 210, 100]]], core + 'Math.max(-55,Math.min(100,k*random(-0.55,1.1)))');
            jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], core + 'x<0?100:0');
        } else if (en === 'slice') {
            var ww = jzEffect(L, 'ADBE Wave Warp', 'JZ In Slice');
            jzEP(ww, 1, 2); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
            jzEX(ww, 2, HD + '(1-oe(P*1.15))*thisComp.width*0.45');
            jzEX(ww, 3, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12),true);random(SZ*0.18,SZ*0.9)');
            jzEX(ww, 7, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)+3,true);random(0,360)');
        } else if (en === 'type') {
            jzAnimator(L, 'JZ In Type', [['ADBE Text Opacity', 0]], HD + 'textIndex>Math.floor(P*(textTotal+0.999))?100:0');
        } else if (en === 'pop' || en === 'spin') {
            var qs = HD + 'var d=textTotal>1?(textIndex-1)/(textTotal-1)*0.45:0;var q=cl((P-d)/0.55);';
            if (en === 'pop') {
                jzAnimator(L, 'JZ In Pop', [['ADBE Text Scale 3D', [0, 0, 100]]], qs + 'q<=0?100:(1-ob(q,2.6))*100');
                jzAnimator(L, 'JZ In Tilt', [['ADBE Text Rotation', 28]], qs + seedR + '(1-oc(q))*100*random(-1,1)');
            } else {
                jzAnimator(L, 'JZ In Spin', [['ADBE Text Rotation', 200]], qs + seedR + '(1-oe(q))*100*(random()<0.5?-1:1)');
                jzAnimator(L, 'JZ In SpinScale', [['ADBE Text Scale 3D', [15, 15, 100]]], qs + '(1-oe(q))*100');
            }
            jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], qs + 'q<=0?100:0');
        } else if (en === 'drop') {
            var qd = HD + seedR + 'var d=textTotal>1?random(0,0.5):0;var q=cl((P-d)/0.5);';
            jzAnimator(L, 'JZ In Drop', [['ADBE Text Position 3D', [0, -size * 2.4, 0]]], qd + 'q<=0?100:(1-bo(q))*100');
            jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], qd + 'q<=0?100:0');
        } else if (en === 'stretch') {
            parts.sc.push('var e=oe(P);f=[f[0]*(4.2+(1-4.2)*e),f[1]];');
            var db = jzEffect(L, 'ADBE Motion Blur', 'JZ In Streak');
            jzEP(db, 1, 90); jzEX(db, 2, HD + '(1-oe(P))*SZ*0.7');
        } else if (en === 'wipe') {
            var lw = jzEffect(L, 'ADBE Linear Wipe', 'JZ In Wipe');
            jzEP(lw, 2, (c.seed % 2) ? 90 : 270); jzEP(lw, 3, 0);
            jzEX(lw, 1, HD + '100*(1-ioe(P))');
        } else if (en === 'blur') {
            jzAnimator(L, 'JZ In Blur', [['ADBE Text Blur', [26, 26]], ['ADBE Text Opacity', 0], ['ADBE Text Tracking Amount', 60]], HD + '(1-oc(P))*100');
        } else if (en === 'flicker') {
            jzAnimator(L, 'JZ In Flicker', [['ADBE Text Opacity', 0]], HD + 'posterizeTime(12);seedRandom(textIndex*31+SD+Math.floor(time*12)*7,true);P>=1?0:(random()<P*1.25?0:100)');
        } else if (en === 'scramble') {
            jzAnimator(L, 'JZ In Scramble', [['ADBE Text Character Offset', 60]], HD + 'var st=0.25+0.75*(textTotal>1?(textIndex-1)/(textTotal-1):1);posterizeTime(12);seedRandom(textIndex+SD+Math.floor(time*12)*97,true);P>=st?0:random(15,100)');
            jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], HD + 'var st=0.25+0.75*(textTotal>1?(textIndex-1)/(textTotal-1):1);posterizeTime(12);seedRandom(textIndex*3+SD+Math.floor(time*12),true);(P<st*0.25&&random()<0.5)||time<DL?100:0');
        } else if (en === 'zoom') {
            parts.sc.push('var e=oe(P);f=[f[0]*(1.7+(1-1.7)*e),f[1]*(1.7+(1-1.7)*e)];');
            parts.op.push('f*=Math.min(1,P*4);');
            var gb = jzEffect(L, 'ADBE Gaussian Blur 2', 'JZ In Blur');
            jzEX(gb, 1, HD + '(1-oe(P))*14');
        }
        if (en !== 'assemble' && en !== 'type' && en !== 'pop' && en !== 'spin' && en !== 'drop' && en !== 'flicker' && en !== 'scramble') parts.op.push('f*=time<DL?0:1;');
        // -------- hold
        if (ho === 'jitter') {
            var A = size * 0.025 * ctx.fx.motion;
            jzAnimator(L, 'JZ Hold Jitter', [['ADBE Text Position 3D', [A, A, 0]], ['ADBE Text Rotation', 4]], HD + 'posterizeTime(12);seedRandom(textIndex*13+SD+Math.floor(time*12)*7,true);[random(-100,100)*AMT,random(-100,100)*AMT,0]');
        } else if (ho === 'wave') {
            jzAnimator(L, 'JZ Hold Wave', [['ADBE Text Position 3D', [0, size * 0.07, 0]], ['ADBE Text Rotation', 5]], HD + 'var v=Math.sin(time*7+textIndex*0.75)*100*AMT;[v,v,0]');
        } else if (ho === 'drift') {
            parts.pos.push('d=[d[0]+' + ((c.seed % 2) ? 1 : -1) + '*(time/DUR-0.5)*thisComp.width*0.035*M,d[1]];');
            parts.sc.push('f=[f[0]*(1+0.05*time/DUR*M),f[1]*(1+0.05*time/DUR*M)];');
        } else if (ho === 'breathe') {
            parts.sc.push('var b=1+0.035*Math.sin(time*Math.PI*1.8)*AMT;f=[f[0]*b,f[1]*b];');
        } else if (ho === 'glitchtick') {
            var gw = jzEffect(L, 'ADBE Wave Warp', 'JZ Hold Glitch');
            jzEP(gw, 1, 2); jzEP(gw, 4, 0); jzEP(gw, 5, 0); jzEP(gw, 6, 1);
            jzEX(gw, 2, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12),true);random()<0.22*G+0.02?random(0.1,0.35)*SZ*AMT:0');
            jzEX(gw, 3, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)+5,true);random(SZ*0.2,SZ*0.8)');
        }
        // -------- exit
        if (ex === 'explode' || ex === 'scatter') {
            var big = ex === 'explode' ? Math.max(W, H) * 0.9 * (0.5 + ctx.fx.motion * 0.6) : W * 0.7;
            var xe = HD + 'seedRandom(textIndex*977+SD,true);var dl=random(0,OD*0.3);var x=cl((time-OS-dl)/(OD*0.7));var e=x*x*x;';
            jzAnimator(L, 'JZ Out ' + (ex === 'explode' ? 'Explode' : 'Scatter'), [['ADBE Text Position 3D', [big, big, 0]], ['ADBE Text Rotation', ex === 'explode' ? 260 : 540]],
                xe + 'var mid=(textTotal+1)/2;var dx=(textIndex-mid)/Math.max(1,textTotal)*1.6+random(-0.6,0.6);var dy=random(-1,1);var l=Math.sqrt(dx*dx+dy*dy)+0.0001;var r=random(0.35,1);[dx/l*e*100*r,dy/l*e*100*r,0]');
            jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0], ['ADBE Text Scale 3D', [60, 60, 100]]], xe + 'x*x*100');
        } else if (ex === 'fall') {
            var G2 = H * 5.5;
            jzAnimator(L, 'JZ Out Fall', [['ADBE Text Position 3D', [0, H * 1.3, 0]], ['ADBE Text Rotation', 200]],
                HD + seedR + 'var x=time-OS-random(0,OD*0.4);var f=x<=0?0:Math.min(100,0.5*' + jzN(G2) + '*x*x/' + jzN(H * 1.3) + '*100);[random(-1,1)*Math.min(100,Math.max(0,x)*120),f,0]');
        } else if (ex === 'drift') {
            var ds = size * 1.6;
            var xd = HD + 'seedRandom(textIndex*433+SD,true);var x=cl((time-OS-random(0,OD*0.3))/(OD*0.7));var e=iq(x);';
            jzAnimator(L, 'JZ Out Drift', [['ADBE Text Position 3D', [ds, ds, 0]], ['ADBE Text Blur', [18, 18]]], xd + 'var a=random(0,Math.PI*2);[Math.cos(a)*e*100,Math.sin(a)*e*100-30*e,0]');
            jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], xd + 'e*e*100');
        } else if (ex === 'slice' || ex === 'glitch') {
            var sw = jzEffect(L, 'ADBE Wave Warp', ex === 'slice' ? 'JZ Out Slice' : 'JZ Out Glitch');
            jzEP(sw, 1, 2); jzEP(sw, 4, 0); jzEP(sw, 5, 0); jzEP(sw, 6, 1);
            if (ex === 'slice') jzEX(sw, 2, HD + 'ie(PO)*thisComp.width*0.55');
            else { jzEX(sw, 2, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)*3,true);PO>0?SZ*(0.3+PO*2.2)*random(0,1):0'); parts.op.push('if(PO>0.55){seedRandom(SD+Math.floor(time*12)*5,true);f*=random()<0.5?0.15:1;} f*=1-cl((PO-0.8)/0.2);'); }
            jzEX(sw, 3, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)+9,true);random(SZ*0.15,SZ*0.9)');
        } else if (ex === 'wipe') {
            var lw2 = jzEffect(L, 'ADBE Linear Wipe', 'JZ Out Wipe');
            jzEP(lw2, 2, (c.seed % 2) ? 90 : 270); jzEP(lw2, 3, 0);
            jzEX(lw2, 1, HD + '100*ioe(PO)');
        } else if (ex === 'shrink') {
            parts.sc.push('var s2=1-0.96*ic(PO);f=[f[0]*s2,f[1]*s2];'); parts.op.push('f*=1-ic(PO)*ic(PO);');
        } else if (ex === 'blur') {
            jzAnimator(L, 'JZ Out Blur', [['ADBE Text Blur', [30, 30]], ['ADBE Text Opacity', 0]], HD + 'iq(PO)*100');
        } else if (ex === 'stretch') {
            parts.sc.push('var e2=ie(PO);f=[f[0]*(1+5*e2),f[1]*(1-0.4*e2)];'); parts.op.push('f*=1-cl((PO-0.7)/0.3);');
        }
    }
    // compose layer transform expressions
    if (parts.sc.length) jzSetExpr(jzXf(L, 'ADBE Scale'), HD + 'var f=[1,1];' + parts.sc.join('') + '[value[0]*f[0],value[1]*f[1]]');
    if (parts.pos.length) jzSetExpr(jzXf(L, 'ADBE Position'), HD + 'var d=[0,0];' + parts.pos.join('') + '[value[0]+d[0],value[1]+d[1]]');
    if (parts.op.length) jzSetExpr(jzXf(L, 'ADBE Opacity'), HD + 'var f=1;' + parts.op.join('') + 'value*f');
    return L;
}

// simple pop for non-text elements (decor, labels): scale in with overshoot, out with the cut
function jzPop(ctx, L, delay, outToo) {
    var c = ctx.cut;
    var ex = 'var st=' + jzN(delay || 0) + ',du=0.24,OS=' + jzN(c.dur - (c.outDur || 0.15)) + ',OD=' + jzN(Math.max(0.12, c.outDur || 0.15)) + ';' + JZ_FNS +
        'var q=cl((time-st)/du);var s=q<=0?0:ob(q,1.9);' + (outToo !== false ? 's*=1-ic((time-OS)/OD);' : '') + '[value[0]*s,value[1]*s]';
    jzSetExpr(jzXf(L, 'ADBE Scale'), ex);
}
function jzFadeIO(ctx, L, delay, inDur) {
    var c = ctx.cut;
    jzSetExpr(jzXf(L, 'ADBE Opacity'), 'var st=' + jzN(delay || 0) + ',du=' + jzN(inDur || 0.3) + ',OS=' + jzN(c.dur - Math.max(0.12, c.outDur || 0.15)) + ',OD=' + jzN(Math.max(0.12, c.outDur || 0.15)) + ';' + JZ_FNS + 'value*oc((time-st)/du)*(1-ic((time-OS)/OD))');
}

// ================================================================ layouts (AE)
function jzSplitLines(text, maxPer) {
    var arr = jzChars(text);
    if (arr.length <= maxPer) return text;
    var nL = Math.ceil(arr.length / maxPer), per = arr.length / nL, out = [], start = 0;
    for (var l = 1; l < nL; l++) {
        var target = Math.round(per * l), best = target, bestS = -99;
        for (var k = Math.max(start + 1, target - 3); k <= Math.min(arr.length - 1, target + 3); k++) {
            var a = arr[k - 1], b = arr[k], s = 3 - Math.abs(k - target);
            if (jzIsHira(a) && !jzIsHira(b)) s += 3;
            if (jzIsPunct(a) || a === ' ' || a === '\u3000') s += 5;
            if ('\u3063\u3083\u3085\u3087\u30FC\u3001\u3002'.indexOf(b) >= 0) s -= 6;
            if (s > bestS) { bestS = s; best = k; }
        }
        out.push(jzTrim(arr.slice(start, best).join(''))); start = best;
    }
    out.push(jzTrim(arr.slice(start).join('')));
    return out.join('\r');
}
var JZ_KANA = { '\u3042': 'a', '\u3044': 'i', '\u3046': 'u', '\u3048': 'e', '\u304A': 'o', '\u304B': 'ka', '\u304D': 'ki', '\u304F': 'ku', '\u3051': 'ke', '\u3053': 'ko', '\u3055': 'sa', '\u3057': 'shi', '\u3059': 'su', '\u305B': 'se', '\u305D': 'so', '\u305F': 'ta', '\u3061': 'chi', '\u3064': 'tsu', '\u3066': 'te', '\u3068': 'to', '\u306A': 'na', '\u306B': 'ni', '\u306C': 'nu', '\u306D': 'ne', '\u306E': 'no', '\u306F': 'ha', '\u3072': 'hi', '\u3075': 'fu', '\u3078': 'he', '\u307B': 'ho', '\u307E': 'ma', '\u307F': 'mi', '\u3080': 'mu', '\u3081': 'me', '\u3082': 'mo', '\u3084': 'ya', '\u3086': 'yu', '\u3088': 'yo', '\u3089': 'ra', '\u308A': 'ri', '\u308B': 'ru', '\u308C': 're', '\u308D': 'ro', '\u308F': 'wa', '\u3092': 'wo', '\u3093': 'n', '\u304C': 'ga', '\u304E': 'gi', '\u3050': 'gu', '\u3052': 'ge', '\u3054': 'go', '\u3056': 'za', '\u3058': 'ji', '\u305A': 'zu', '\u305C': 'ze', '\u305E': 'zo', '\u3060': 'da', '\u3062': 'ji', '\u3065': 'zu', '\u3067': 'de', '\u3069': 'do', '\u3070': 'ba', '\u3073': 'bi', '\u3076': 'bu', '\u3079': 'be', '\u307C': 'bo', '\u3071': 'pa', '\u3074': 'pi', '\u3077': 'pu', '\u307A': 'pe', '\u307D': 'po' };
function jzRomaji(s) {
    var a = jzChars(s), out = '', i;
    for (i = 0; i < a.length; i++) { var c = a[i]; if (jzIsKata(c) && c !== '\u30FC') a[i] = String.fromCharCode(c.charCodeAt(0) - 0x60); }
    for (i = 0; i < a.length; i++) {
        var ch = a[i], nx = a[i + 1];
        if (ch === '\u3063') { var q = JZ_KANA[nx]; if (q) out += q.charAt(0); continue; }
        if (ch === '\u30FC') { out += out.charAt(out.length - 1); continue; }
        if ((nx === '\u3083' || nx === '\u3085' || nx === '\u3087') && JZ_KANA[ch]) {
            var b = JZ_KANA[ch], y = nx === '\u3083' ? 'ya' : nx === '\u3085' ? 'yu' : 'yo';
            out += (b === 'shi' || b === 'chi' || b === 'ji') ? b.substr(0, b.length - 1) + y.substr(1) : b.substr(0, b.length - 1) + y; i++; continue;
        }
        if (JZ_KANA[ch]) out += JZ_KANA[ch]; else if (/[A-Za-z0-9 ]/.test(ch)) out += ch; else return null;
    }
    return out;
}
function jzBB(L) {
    var s = jzSize(L), p = jzXf(L, 'ADBE Position').value;
    return { x0: p[0] - s[0] / 2, x1: p[0] + s[0] / 2, y0: p[1] - s[1] / 2, y1: p[1] + s[1] / 2, cx: p[0], cy: p[1] };
}
function jzUnion(a, b) { if (!a) return b; if (!b) return a; var r = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }; r.cx = (r.x0 + r.x1) / 2; r.cy = (r.y0 + r.y1) / 2; return r; }
function jzP(ctx, k, d) { return (ctx.P && ctx.P[k] != null) ? ctx.P[k] : d; }
function jzFontOf(ctx, k, role) { var v = jzP(ctx, k, null); return v || (ctx.st.fonts[role] ? ctx.st.fonts[role][0] : 'gothic_black'); }
function jzMain(ctx, str, o) { var L = jzText(ctx, str, o); jzMotion(ctx, L, { size: jzFontSize(L), mi: o.mi || 0, noHold: o.noHold, enter: o.enter, exit: o.exit }); return L; }
function jzSmall(ctx, str, o) { o.font = o.font || jzFontOf(ctx, '_', 'body'); var L = jzText(ctx, str, o); return L; }

var JZ_LAYOUTS = {};

JZ_LAYOUTS.center = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, sx = jzP(ctx, 'sx', 1);
    var L = jzMain(ctx, jzSplitLines(c.text, 11), { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: jzP(ctx, 'accent', false) ? sc.accent : sc.fg, x: W / 2 + jzP(ctx, 'ox', 0) * W, y: H / 2 + jzP(ctx, 'oy', 0) * H, track: jzP(ctx, 'track', 0.06), maxW: W * 0.84 / sx, maxH: H * 0.5, maxSize: H * 0.33, sx: sx });
    var bb = jzBB(L);
    if (jzP(ctx, 'sub', false) && c.lineText && c.lineText !== c.text) {
        var s = jzSmall(ctx, c.lineText, { size: Math.max(16, H * 0.026), color: sc.sub, x: bb.cx, y: bb.y1 + H * 0.07, track: 0.22 });
        jzFadeIO(ctx, s, c.inDur * 0.5, 0.3);
    }
    if (jzP(ctx, 'under', false)) {
        var U = jzShapeLayer(ctx, 'underline', bb.x0, bb.y1 + H * 0.02);
        var g = jzGrp(U, 'bar'); jzAddRect(g, bb.x1 - bb.x0, Math.max(3, H * 0.006), 0, (bb.x1 - bb.x0) / 2, 0); jzAddFill(g, sc.accent);
        jzSetExpr(jzXf(U, 'ADBE Scale'), JZ_FNS + 'var e=oe((time-' + jzN(c.inDur * 0.3) + ')/0.5);[value[0]*e,value[1]]');
    }
    return bb;
};

JZ_LAYOUTS.mixed = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, seed = c.seed;
    var chars = jzChars(c.text.replace(/[\s\u3000]+/g, '')), n = chars.length, rows = n > 9 ? 2 : 1, per = Math.ceil(n / rows);
    var fB = jzFontOf(ctx, 'fontBig', 'display'), fS = jzFontOf(ctx, 'fontSmall', 'serif'), smallK = jzP(ctx, 'smallK', 0.52), rotA = jzP(ctx, 'rotAmp', 6), mode = jzP(ctx, 'mode', 'line');
    var bb = null, r, i;
    for (r = 0; r < rows; r++) {
        var row = chars.slice(r * per, (r + 1) * per), Ls = [], ks = [], widths = [], sum = 0;
        for (i = 0; i < row.length; i++) {
            var ch = row[i], gi = r * per + i;
            var k = jzIsKanji(ch) ? 1 : jzIsKata(ch) ? 0.88 : jzIsLatin(ch) ? 0.8 : jzIsPunct(ch) ? 0.42 : smallK + jzR(seed, gi, 3) * 0.14;
            var font = (jzIsKanji(ch) || jzIsKata(ch)) ? fB : (jzR(seed, gi, 4) < 0.55 ? fS : fB);
            var L = jzText(ctx, ch, { font: font, size: 100 * k, color: sc.fg, x: 0, y: 0 });
            var sz = jzSize(L); Ls.push(L); ks.push(k); widths.push(Math.max(sz[0], 100 * k * 0.6)); sum += widths[i];
        }
        var s = Math.min(W * 0.86 / sum, (H * (rows > 1 ? 0.3 : 0.4)) / 100);
        var x = W / 2 - sum * s / 2, base = 100 * s, baseline = H / 2 + base * 0.38 + (r - (rows - 1) / 2) * base * 1.05;
        for (i = 0; i < Ls.length; i++) {
            var gi2 = r * per + i, src = Ls[i].property('ADBE Text Properties').property('ADBE Text Document'), td = src.value;
            td.fontSize = 100 * ks[i] * s; if (gi2 === (jzP(ctx, 'accentIdx', 99) % n) && !jzIsKanji(row[i])) td.fillColor = jzHex(sc.accent);
            src.setValue(td); jzAnchor(Ls[i]);
            var size = 100 * ks[i] * s, y = baseline - size / 2 + (jzR(seed, gi2, 5) * 2 - 1) * base * 0.06;
            if (mode === 'stair') y += (i - (Ls.length - 1) / 2) * base * 0.12;
            if (mode === 'wave') y += Math.sin(i * 1.1) * base * 0.1;
            jzXf(Ls[i], 'ADBE Position').setValue([x + widths[i] * s / 2, y]);
            jzXf(Ls[i], 'ADBE Rotate Z').setValue((jzR(seed, gi2, 6) * 2 - 1) * rotA);
            jzMotion(ctx, Ls[i], { size: size, mi: gi2 });
            bb = jzUnion(bb, jzBB(Ls[i]));
            x += widths[i] * s;
        }
    }
    return bb;
};

JZ_LAYOUTS.vcols = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text.replace(/[\s\u3000]+/g, ''), n = jzCount(text);
    var font = jzFontOf(ctx, 'font', 'serif'), variant = jzP(ctx, 'variant', n <= 5 ? 'repeat' : 'split'), bb = null, i;
    if (variant === 'repeat' && n <= 9) {
        var cols = jzP(ctx, 'cols', 3), size = Math.min(H * 0.8 / (n * 1.04), W * 0.86 / (cols * 1.75)), mid = (cols - 1) / 2, side = jzP(ctx, 'side', 'same');
        for (i = 0; i < cols; i++) {
            var isSide = i !== Math.round(mid);
            var o = { font: font, size: size, color: sc.fg, x: W / 2 + (i - mid) * size * 1.75, y: H / 2, leading: size * 1.04, mi: Math.abs(i - mid) * 2 };
            if (isSide && side === 'outline') { o.fill = false; o.stroke = Math.max(1.2, size * 0.012); o.strokeColor = sc.fg; }
            if (isSide && side === 'dim') o.opacity = 0.38;
            var L = jzMain(ctx, jzVertical(text), o);
            if (!isSide) bb = jzBB(L);
        }
        return bb;
    }
    var arr = jzChars(text), perCol = Math.max(2, Math.min(jzP(ctx, 'perCol', 4) + 1, Math.ceil(n / Math.ceil(n / 7)))), colsA = [];
    for (i = 0; i < arr.length; i += perCol) colsA.push(arr.slice(i, i + perCol).join(''));
    var sz = Math.min(H * 0.74 / (perCol * 1.03), W * 0.8 / (colsA.length * 1.4)), top = H / 2 - perCol * sz * 1.03 / 2;
    for (i = 0; i < colsA.length; i++) {
        var x = W / 2 + ((colsA.length - 1) / 2 - i) * sz * 1.4;
        var cL = jzText(ctx, jzVertical(colsA[i]), { font: font, size: sz, color: sc.fg, x: x, y: 0, leading: sz * 1.03 });
        var h = jzSize(cL)[1]; jzXf(cL, 'ADBE Position').setValue([x, top + h / 2]);
        jzMotion(ctx, cL, { size: sz, mi: i * 3 });
        bb = jzUnion(bb, jzBB(cL));
    }
    return bb;
};

function jzScrollRow(ctx, text, o) {
    // one repeated row that scrolls sideways forever (period measured from the unit)
    var unit = text + '\u3000';
    var probe = jzText(ctx, unit, { font: o.font, size: o.size, color: o.color, x: -9999, y: -9999, track: o.track || 0.05 });
    var per = Math.max(10, jzSize(probe)[0]); probe.remove();
    var reps = Math.ceil(ctx.W * 2.6 / per) + 1, s = '';
    for (var i = 0; i < reps; i++) s += unit;
    var L = jzText(ctx, s, { font: o.font, size: o.size, color: o.color, x: ctx.W / 2, y: o.y, track: o.track || 0.05, fill: o.fill, stroke: o.stroke, strokeColor: o.strokeColor, opacity: o.opacity, sx: o.sx });
    jzSetExpr(jzXf(L, 'ADBE Position'), 'var per=' + jzN(per * (o.sx || 1)) + ',sp=' + jzN(o.speed) + ',of=' + jzN(o.offset || 0) + ';var d=((time*sp+of)%per+per)%per-per/2;[value[0]+d,value[1]]');
    return L;
}

JZ_LAYOUTS.marquee = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, font = jzFontOf(ctx, 'font', 'display'), sx = jzP(ctx, 'sx', 1.4), style = jzP(ctx, 'rowStyle', 'outline'), rowsN = jzP(ctx, 'rows', 2), speed = jzP(ctx, 'speed', 0.8);
    var L = jzMain(ctx, c.text, { font: font, size: 200, color: sc.fg, x: W / 2, y: H / 2, track: 0.05, maxW: W * 0.84 / sx, maxH: H * 0.3, maxSize: H * 0.3, sx: sx });
    var size = jzFontSize(L), rs = size * 0.42, ks = rowsN === 2 ? [-1, 1] : [-2, -1, 1, 2];
    for (var r = 0; r < ks.length; r++) {
        var k = ks[r], y = H / 2 + (k > 0 ? 1 : -1) * (size * 0.5 + rs * 0.95) + (Math.abs(k) - 1) * (k > 0 ? 1 : -1) * rs * 1.25;
        var o = { font: font, size: rs, color: sc.fg, y: y, speed: (r % 2 ? 1 : -1) * speed * W * 0.22, offset: r * 137, sx: sx };
        if (style === 'outline') { o.fill = false; o.stroke = Math.max(1.2, rs * 0.02); o.strokeColor = sc.fg; }
        else if (style === 'dim') { o.color = sc.sub; o.opacity = 0.35; }
        else {
            var B = jzShapeLayer(ctx, 'row band', W / 2, y); var g = jzGrp(B); jzAddRect(g, W + 40, rs * 1.24); jzAddFill(g, sc.ink); B.moveToEnd();
            o.color = sc.bg;
        }
        var R = jzScrollRow(ctx, c.text, o);
        jzFadeIO(ctx, R, Math.abs(k) * 0.05, 0.12);
    }
    return jzBB(L);
};

JZ_LAYOUTS.tile = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, n = jzP(ctx, 'rowsN', 14), unit = jzP(ctx, 'unit', 'chunk') === 'line' ? c.lineText : c.text;
    var tf = jzFontOf(ctx, 'tileFont', 'serif'), rowH = H / n, ts = rowH * 0.72;
    for (var r = 0; r <= n; r++) {
        var R = jzScrollRow(ctx, unit, { font: tf, size: ts, color: sc.sub, y: (r + 0.5) * rowH, speed: (r % 2 ? 26 : -26), offset: r * 91, track: 0.02, opacity: 0.42 });
        jzFadeIO(ctx, R, jzR(c.seed, r, 91) * c.inDur * 1.6, 0.1);
    }
    var font = jzFontOf(ctx, 'font', 'display');
    var o = { font: font, size: 200, color: sc.fg, x: W / 2, y: H / 2, track: 0.04, maxW: W * 0.8, maxH: H * 0.34, maxSize: H * 0.3 };
    if (jzP(ctx, 'knock', 'stroke') === 'box') {
        var M = jzMain(ctx, c.text, o), bb = jzBB(M), pad = jzFontSize(M) * 0.35;
        var B = jzShapeLayer(ctx, 'knockout box', W / 2, H / 2); var g = jzGrp(B); jzAddRect(g, bb.x1 - bb.x0 + pad * 2, bb.y1 - bb.y0 + pad * 1.6); jzAddFill(g, sc.bg);
        B.moveAfter(M); jzSetExpr(jzXf(B, 'ADBE Scale'), JZ_FNS + 'var e=oe(time/0.4);[value[0]*e,value[1]]');
        return bb;
    }
    var K = jzText(ctx, c.text, { font: font, size: 200, color: sc.bg, x: W / 2, y: H / 2, track: 0.04, maxW: W * 0.8, maxH: H * 0.34, maxSize: H * 0.3, stroke: 1, strokeColor: sc.bg });
    var ks = jzFontSize(K), src = K.property('ADBE Text Properties').property('ADBE Text Document'), td = src.value; td.strokeWidth = ks * 0.16; src.setValue(td);
    jzMotion(ctx, K, { size: ks, mi: 0 });
    var M2 = jzMain(ctx, c.text, o);
    return jzBB(M2);
};

JZ_LAYOUTS.scatter = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, chars = jzChars(c.text.replace(/[\s\u3000]+/g, '')), n = chars.length, bb = null, i;
    if (jzP(ctx, 'extras', true)) for (i = 0; i < 8; i++) {
        var top = jzR(s, i, 82) < 0.5;
        var E = jzSmall(ctx, c.text, { size: jzLerp(H * 0.022, H * 0.045, jzR(s, i, 83)), color: sc.sub, x: jzLerp(W * 0.08, W * 0.92, jzR(s, i, 84)), y: top ? jzLerp(H * 0.08, H * 0.26, jzR(s, i, 85)) : jzLerp(H * 0.74, H * 0.92, jzR(s, i, 85)), rot: (jzR(s, i, 86) * 2 - 1) * 18, opacity: 0.75 });
        jzFadeIO(ctx, E, jzR(s, i, 81) * c.dur * 0.5, 0.1);
    }
    var base = Math.min(H * 0.3, W * 0.9 / n * 1.15), fA = jzFontOf(ctx, 'font', 'display'), fB = jzFontOf(ctx, 'fontB', 'serif');
    for (i = 0; i < n; i++) {
        var k = 0.62 + jzR(s, i, 73) * 0.85 * (jzIsKanji(chars[i]) ? 1 : 0.7);
        var L = jzMain(ctx, chars[i], { font: i % 3 === 1 ? fB : fA, size: base * k, color: jzR(s, i, 75) < 0.15 ? sc.accent : sc.fg, x: W * (0.1 + 0.8 * (i + 0.5) / n) + (jzR(s, i, 71) * 2 - 1) * W * 0.035, y: H / 2 + (jzR(s, i, 72) * 2 - 1) * H * 0.18, rot: (jzR(s, i, 74) * 2 - 1) * 24, mi: i });
        bb = jzUnion(bb, jzBB(L));
    }
    return bb;
};

function jzCircleShape(cx, cy, R) {
    var k = 0.5523 * R, sh = new Shape();
    sh.vertices = [[cx, cy - R], [cx + R, cy], [cx, cy + R], [cx - R, cy]];
    sh.inTangents = [[-k, 0], [0, -k], [k, 0], [0, k]];
    sh.outTangents = [[k, 0], [0, k], [-k, 0], [0, -k]];
    sh.closed = true; return sh;
}
function jzTextOnPath(L, shape, firstMarginExpr, ctx) {
    // anchor == position == comp centre, so layer space equals comp space and scaling happens about the centre
    L.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([ctx.W / 2, ctx.H / 2]);
    L.property('ADBE Transform Group').property('ADBE Position').setValue([ctx.W / 2, ctx.H / 2]);
    var m = L.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    m.property('ADBE Mask Shape').setValue(shape);
    try { m.maskMode = MaskMode.NONE; } catch (e) {}
    var po = L.property('ADBE Text Properties').property('ADBE Text Path Options');
    try { po.property('ADBE Text Path').setValue(1); } catch (e1) { jzWarn('text path: ' + e1.toString()); }
    try { po.property('ADBE Text Perpendicular To Path').setValue(1); } catch (e2) {}
    if (firstMarginExpr) { try { L.property('ADBE Text Properties').property('ADBE Text Path Options').property('ADBE Text First Margin').expression = firstMarginExpr; } catch (e3) { jzWarn('first margin: ' + e3.toString()); } }
}

JZ_LAYOUTS.ring = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text.replace(/[\s\u3000]+/g, ''), n = jzCount(text), R = H * jzP(ctx, 'R', 0.31), cx = W / 2, cy = H / 2;
    var font = jzFontOf(ctx, 'font', 'display'), fontC = jzFontOf(ctx, 'fontC', 'display'), center = jzP(ctx, 'center', 'word'), speed = jzP(ctx, 'speed', 8);
    var ringS = jzShapeLayer(ctx, 'ring lines', cx, cy), g = jzGrp(ringS); jzAddEllipse(g, R * 1.72, R * 1.72); jzAddStroke(g, sc.sub, 1.2, 55);
    var g2 = jzGrp(ringS); jzAddEllipse(g2, R * 2.3, R * 2.3); jzAddStroke(g2, sc.sub, 1.2, 35); ringS.moveToEnd();
    var bb = null;
    if (center === 'disc') {
        var D = jzShapeLayer(ctx, 'disc', cx, cy), gd = jzGrp(D); jzAddEllipse(gd, R * 1.44, R * 1.44); jzAddFill(gd, sc.accent); jzPop(ctx, D, 0, true);
        bb = jzBB(jzMain(ctx, text, { font: fontC, size: 200, color: sc.bg, x: cx, y: cy, maxW: R * 1.15, maxH: R * 0.8, maxSize: H * 0.2 }));
    } else if (center === 'word') {
        bb = jzBB(jzMain(ctx, text, { font: fontC, size: 200, color: sc.fg, x: cx, y: cy, maxW: R * 1.3, maxH: R * 0.85, maxSize: H * 0.22 }));
    }
    var sizeRing = Math.min(H * 0.07, 2 * Math.PI * R / ((n + 1) * 1.25));
    var unit = text + '\u30FB', probe = jzText(ctx, unit, { font: font, size: sizeRing, x: -9999, y: -9999, color: sc.fg });
    var uw = Math.max(10, jzSize(probe)[0]); probe.remove();
    var reps = Math.max(1, Math.floor(2 * Math.PI * R / uw)), s = '';
    for (var i = 0; i < reps; i++) s += unit;
    var T = jzText(ctx, s, { font: font, size: sizeRing, color: sc.fg, x: 0, y: 0, align: 'left' });
    jzTextOnPath(T, jzCircleShape(cx, cy, R), 'time*' + jzN(speed * R * Math.PI / 180), ctx);
    var okIn = { pop: 1, spin: 1, flicker: 1, scramble: 1, type: 1, blur: 1, drop: 1 };
    jzMotion(ctx, T, { size: sizeRing, mi: 0, noHold: true, enter: okIn[c.enter] ? c.enter : 'pop', exit: (c.exit === 'stretch' || c.exit === 'slice' || c.exit === 'wipe') ? 'blur' : c.exit });
    return bb || { x0: cx - R, x1: cx + R, y0: cy - R, y1: cy + R, cx: cx, cy: cy };
};

JZ_LAYOUTS.wave = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text.replace(/[\s\u3000]+/g, ''), n = jzCount(text);
    var amp = H * jzP(ctx, 'amp', 0.12), freq = jzP(ctx, 'freq', 1.2), size = Math.min(H * 0.2, W * 0.72 / n), travel = jzP(ctx, 'travel', 0.35);
    var sh = new Shape(), pts = [], seg = 24, i;
    for (i = 0; i <= seg; i++) { var u = i / seg; pts.push([jzLerp(-W * 0.1, W * 1.1, u), H / 2 + amp * Math.sin(Math.PI * 2 * freq * u)]); }
    sh.vertices = pts; sh.closed = false;
    var T = jzText(ctx, text, { font: jzFontOf(ctx, 'font', 'display'), size: size, color: sc.fg, x: 0, y: 0, align: 'left' });
    var pathLen = W * 1.2 * (1 + amp / W * 2);
    var tw = jzSize(T)[0];
    jzTextOnPath(T, sh, 'var u=time/' + jzN(c.dur) + ';' + jzN(pathLen / 2 - tw / 2) + '+(u-0.5)*' + jzN(-travel * W * (travel < 0 ? -1 : 1)), ctx);
    var ec = jzEffect(T, 'ADBE Echo', 'JZ Trails');
    jzEP(ec, 1, -0.033); jzEP(ec, 2, jzP(ctx, 'trail', 7)); jzEP(ec, 3, 1); jzEP(ec, 4, 0.72); jzEP(ec, 5, 5);
    var okW = { pop: 1, spin: 1, flicker: 1, scramble: 1, type: 1, blur: 1, drop: 1, assemble: 1 };
    jzMotion(ctx, T, { size: size, mi: 0, noHold: true, enter: okW[c.enter] ? c.enter : 'pop', exit: (c.exit === 'stretch' || c.exit === 'shrink') ? 'blur' : c.exit });
    return { x0: W * 0.2, x1: W * 0.8, y0: H / 2 - amp - size / 2, y1: H / 2 + amp + size / 2, cx: W / 2, cy: H / 2 };
};

JZ_LAYOUTS.huge = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, t0 = c.text.replace(/[\s\u3000]+/g, ''), n = jzCount(t0);
    var text = n >= 5 ? jzSplitLines(t0, Math.ceil(n / 2)) : t0, two = n >= 5;
    var size = two ? Math.min(H * 0.56, W * 1.2 / (Math.ceil(n / 2) * 0.98)) : Math.min(H * 0.98, W * 1.3 / (n * 0.96));
    var L = jzMain(ctx, text, { font: jzFontOf(ctx, 'font', 'display'), size: size, color: sc.fg, x: W / 2, y: H / 2 + H * 0.02, track: -0.02, leading: two ? size * 0.98 : null });
    var dir = jzP(ctx, 'dir', 1);
    jzSetExpr(jzXf(L, 'ADBE Anchor Point'), '[value[0]-(0.5-time/' + jzN(c.dur) + ')*thisComp.width*0.16*' + dir + ',value[1]]');
    if (sc.grad && jzP(ctx, 'grad', false)) {
        var gr = jzEffect(L, 'ADBE Ramp', 'JZ Gradient');
        jzEP(gr, 1, [W / 2, H / 2 - size / 2]); jzEP(gr, 2, jzHex(sc.grad[0])); jzEP(gr, 3, [W / 2, H / 2 + size / 2]); jzEP(gr, 4, jzHex(sc.grad[1]));
    }
    if (jzP(ctx, 'label', true)) {
        var ls = Math.max(16, H * 0.028);
        var T = jzSmall(ctx, c.text, { size: ls, color: sc.bg, x: W * 0.05 + ls * 0.7, y: H * 0.86, align: 'left', track: 0.12 });
        var tw = jzSize(T)[0];
        var B = jzShapeLayer(ctx, 'label box', W * 0.05 + (tw + ls * 1.4) / 2, H * 0.86), g = jzGrp(B); jzAddRect(g, tw + ls * 1.4, ls * 2); jzAddFill(g, sc.ink);
        B.moveAfter(T); jzFadeIO(ctx, B, c.inDur * 0.5, 0.2); jzFadeIO(ctx, T, c.inDur * 0.5, 0.2);
    }
    return jzBB(L);
};

JZ_LAYOUTS.labels = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, s = c.seed, text = c.text.replace(/[\s\u3000]+/g, ''), variant = jzP(ctx, 'variant', 'radial');
    var units = [], i, ch = jzChars(text);
    if (jzP(ctx, 'unit', 'char') === 'char' || !(c.words && c.words.length)) { for (i = 0; i < ch.length; i++) if (!jzIsPunct(ch[i])) units.push(ch[i]); }
    else units = c.words;
    if (!units.length) units = [text];
    var font = jzFontOf(ctx, 'font', 'display');
    function label(u, x, y, rot, fs, delay) {
        var T = jzText(ctx, u, { font: font, size: fs, color: sc.bg, x: x, y: y, track: 0.04 });
        var sz = jzSize(T), B = jzShapeLayer(ctx, 'label', x, y), g = jzGrp(B);
        jzAddRect(g, sz[0] + fs * 0.7, fs * 1.36); jzAddFill(g, sc.ink);
        jzXf(B, 'ADBE Rotate Z').setValue(rot); B.moveAfter(T);
        T.parent = B; jzPop(ctx, B, delay, true);
        return B;
    }
    if (variant === 'radial') {
        var m = Math.max(units.length, 10), R = H * 0.3, fs = H * 0.062;
        if (jzP(ctx, 'center', 'orb') === 'orb') { var O = jzShapeLayer(ctx, 'orb', W / 2, H / 2), go = jzGrp(O); jzAddEllipse(go, R * 1.04, R * 1.04); jzAddFill(go, sc.accent); jzPop(ctx, O, 0, true); O.moveToEnd(); }
        for (i = 0; i < m; i++) { var a = i / m * 360 - 90; label(units[i % units.length], W / 2 + Math.cos(a * Math.PI / 180) * R, H / 2 + Math.sin(a * Math.PI / 180) * R, a, fs, i * 0.025); }
        if (jzP(ctx, 'center', 'orb') === 'word') jzMain(ctx, text, { font: jzFontOf(ctx, 'fontC', 'display'), size: 200, color: sc.fg, x: W / 2, y: H / 2, maxW: R * 1.1, maxH: R * 0.7, maxSize: H * 0.18 });
        return { x0: W / 2 - R, x1: W / 2 + R, y0: H / 2 - R, y1: H / 2 + R, cx: W / 2, cy: H / 2 };
    }
    if (variant === 'rows') {
        var k = units.length, fr = Math.min(H * 0.14, H * 0.7 / (k * 1.5));
        for (i = 0; i < k; i++) label(units[i], W / 2 + (jzR(s, i, 5) * 2 - 1) * W * 0.12, H / 2 + (i - (k - 1) / 2) * fr * 1.55, (jzR(s, i, 6) * 2 - 1) * 4, fr, i * 0.05);
        return { x0: W * 0.3, x1: W * 0.7, y0: H / 2 - k * fr * 0.8, y1: H / 2 + k * fr * 0.8, cx: W / 2, cy: H / 2 };
    }
    var fsc = H * 0.085;
    for (i = 0; i < units.length; i++) label(units[i], W * (0.15 + 0.7 * ((i + 0.5) / units.length)) + (jzR(s, i, 7) * 2 - 1) * W * 0.04, H / 2 + (jzR(s, i, 8) * 2 - 1) * H * 0.25, (jzR(s, i, 9) * 2 - 1) * 22, fsc * (0.8 + jzR(s, i, 10) * 0.5), i * 0.05);
    return { x0: W * 0.15, x1: W * 0.85, y0: H * 0.3, y1: H * 0.7, cx: W / 2, cy: H / 2 };
};

JZ_LAYOUTS.condensed = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text.replace(/[\s\u3000]+/g, ''), count = jzP(ctx, 'count', 2), sx = jzP(ctx, 'sx', 0.5), sy = jzP(ctx, 'sy', 1.2);
    var slot = W * 0.92 / count, bb = null, order = [1, 0, 2, 3];
    for (var i = 0; i < count; i++) {
        var L = jzMain(ctx, text, { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: sc.fg, x: W / 2 + (i - (count - 1) / 2) * slot, y: H / 2, track: 0.04, maxW: slot * 0.94 / sx, maxH: H * 0.8 / sy, maxSize: H * 0.62, sx: sx, sy: sy, mi: count > 1 ? order[i] * 2 : 0 });
        bb = jzUnion(bb, jzBB(L));
    }
    return bb;
};

JZ_LAYOUTS.gloss = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text, font = jzFontOf(ctx, 'font', 'serif'), right = jzP(ctx, 'side', 'right') === 'right', r;
    if (jzP(ctx, 'bgText', true)) for (r = 0; r < 3; r++) jzScrollRow(ctx, text.replace(/[\s\u3000]+/g, ''), { font: font, size: H * 0.3, color: sc.dim, y: H * (0.18 + r * 0.32), speed: r % 2 ? 20 : -20, offset: r * 200 }).moveToEnd();
    var L = jzMain(ctx, text, { font: font, size: 200, color: sc.fg, x: right ? W * 0.4 : W * 0.6, y: H * 0.54, track: 0.03, maxW: W * 0.5, maxH: H * 0.3, maxSize: H * 0.24 });
    var bb = jzBB(L), size = jzFontSize(L);
    var ax = right ? bb.x1 + size * 0.1 : bb.x0 - size * 0.1, ay = bb.y0 + size * 0.2;
    var nx = right ? Math.min(W * 0.9, bb.x1 + W * 0.1) : Math.max(W * 0.1, bb.x0 - W * 0.1), ny = Math.max(H * 0.12, bb.y0 - H * 0.12);
    var S = jzShapeLayer(ctx, 'leader', 0, 0), g = jzGrp(S);
    jzAddPath(g, [[ax, ay], [jzLerp(ax, nx, 0.45), ay], [nx, ny]], false); jzAddStroke(g, sc.sub, 1.3);
    jzAddTrimPaths(g, JZ_FNS + '100*oe((time-' + jzN(c.inDur * 0.4) + ')/0.45)');
    var gd = jzGrp(S); jzAddEllipse(gd, 8, 8, ax, ay); jzAddFill(gd, sc.accent);
    var ns = Math.max(14, H * 0.024), al = right ? 'left' : 'right', body = jzFontOf(ctx, '_', 'body');
    var t1 = jzText(ctx, '\u3010' + text.replace(/[\s\u3000]+/g, '') + '\u3011', { font: font, size: ns * 1.2, color: sc.fg, x: nx, y: ny - ns * 1.2, align: al });
    var note = c.note || jzRomaji(text.replace(/[\s\u3000]+/g, '')) || c.lineText;
    var t2 = jzText(ctx, note, { font: body, size: ns, color: sc.sub, x: nx, y: ny + ns * 0.4, align: al, track: 0.08 });
    var t3 = jzText(ctx, 'No.' + jzPad((c.line || 0) + 1, 2), { font: 'mono', size: ns * 0.8, color: sc.accent, x: nx, y: ny + ns * 2, align: al });
    jzFadeIO(ctx, t1, c.inDur * 0.5, 0.3); jzFadeIO(ctx, t2, c.inDur * 0.6, 0.3); jzFadeIO(ctx, t3, c.inDur * 0.7, 0.3);
    return bb;
};

JZ_LAYOUTS.type = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, left = jzP(ctx, 'align', 'left') === 'left';
    var text = jzSplitLines(c.text, 14), x = left ? W * 0.13 : W / 2;
    var L = jzText(ctx, text, { font: jzFontOf(ctx, 'font', 'body'), size: 200, color: sc.fg, x: x, y: H / 2, align: left ? 'left' : 'center', track: 0.06, maxW: W * 0.74, maxH: H * 0.36, maxSize: H * 0.11 });
    jzMotion(ctx, L, { size: jzFontSize(L), mi: 0, enter: c.enter === 'cut' ? 'type' : c.enter });
    var bb = jzBB(L), fs = jzFontSize(L);
    if (jzP(ctx, 'prompt', true)) { var p = jzText(ctx, '>', { font: 'mono', size: fs * 0.8, color: sc.accent, x: (left ? x : bb.x0) - fs * 0.9, y: bb.y0 + fs * 0.55 }); jzFadeIO(ctx, p, 0, 0.05); }
    var st = jzText(ctx, 'LINE ' + jzPad((c.line || 0) + 1, 2), { font: 'mono', size: Math.max(12, H * 0.02), color: sc.sub, x: W * 0.13, y: H * 0.8, align: 'left', opacity: 0.8 });
    try { st.property('ADBE Text Properties').property('ADBE Text Document').expression = '"LINE ' + jzPad((c.line || 0) + 1, 2) + ' \u2500 " + timeToTimecode(time + ' + jzN(c.start) + ')'; } catch (e) {}
    return bb;
};

JZ_LAYOUTS.diag = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, ang = jzP(ctx, 'ang', 16), bandCol = jzP(ctx, 'band', 'accent') === 'accent' ? sc.accent : sc.ink;
    var txtCol = jzLum(bandCol) > 0.5 ? (jzLum(sc.bg) < 0.5 ? sc.bg : '#111111') : (jzLum(sc.fg) > 0.5 ? sc.fg : '#FFFFFF');
    var L = jzText(ctx, c.text, { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: txtCol, x: W / 2, y: H / 2, track: 0.05, maxW: W * 0.72, maxH: H * 0.24, maxSize: H * 0.2, rot: -ang });
    var size = jzFontSize(L), bh = size * 1.6;
    var B = jzShapeLayer(ctx, 'band', W / 2, H / 2), g = jzGrp(B); jzAddRect(g, W * 2.4, bh); jzAddFill(g, bandCol);
    jzXf(B, 'ADBE Rotate Z').setValue(-ang); B.moveAfter(L);
    jzSetExpr(jzXf(B, 'ADBE Scale'), JZ_FNS + 'var e=oe(time/' + jzN(Math.max(0.1, c.inDur * 0.8)) + ')*(1-ie((time-' + jzN(c.dur - (c.outDur || 0)) + ')/' + jzN(Math.max(0.05, c.outDur || 0.05)) + '));[value[0],value[1]*e]');
    if (jzP(ctx, 'second', true)) {
        var y2 = bh * 0.95, h2 = bh * 0.32, rad = -ang * Math.PI / 180;
        var ox = -Math.sin(rad) * y2, oy = Math.cos(rad) * y2;
        var B2 = jzShapeLayer(ctx, 'band 2', W / 2 + ox, H / 2 + oy), g2 = jzGrp(B2); jzAddRect(g2, W * 2.4, h2); jzAddFill(g2, sc.fg, 90);
        jzXf(B2, 'ADBE Rotate Z').setValue(-ang); B2.moveAfter(B);
        var R2 = jzScrollRow(ctx, c.lineText + '\u3000\uFF0F', { font: jzFontOf(ctx, '_', 'body'), size: h2 * 0.55, color: sc.bg, y: 0, speed: 120, track: 0.1 });
        R2.parent = B2; jzXf(R2, 'ADBE Rotate Z').setValue(0);
        jzXf(R2, 'ADBE Position').setValue([0, 0]);
    }
    jzMotion(ctx, L, { size: size, mi: 0 });
    return jzBB(L);
};

JZ_LAYOUTS.circle = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, text = c.text.replace(/[\s\u3000]+/g, ''), variant = jzP(ctx, 'variant', 'disc'), font = jzFontOf(ctx, 'font', 'display');
    var cx = W / 2 + jzP(ctx, 'off', 0) * W, cy = H / 2;
    if (variant === 'eclipse') {
        var L = jzMain(ctx, jzSplitLines(text, 6), { font: font, size: 200, color: sc.fg, x: W / 2, y: H / 2, maxW: W * 0.82, maxH: H * 0.46, maxSize: H * 0.36 });
        var R = H * 0.19, E = jzShapeLayer(ctx, 'eclipse', W / 2, H / 2 + H * 0.12), g = jzGrp(E);
        jzAddEllipse(g, R * 2, R * 2); jzAddStroke(g, sc.fg, 3, 90); jzAddFill(g, '#000000');
        var gl = jzEffect(E, 'ADBE Glo2', 'JZ Corona'); jzEP(gl, 2, 20); jzEP(gl, 3, 40); jzEP(gl, 4, 1.4);
        jzSetExpr(jzXf(E, 'ADBE Position'), '[value[0]+(time/' + jzN(c.dur) + '-0.5)*thisComp.width*0.16,value[1]]');
        return jzBB(L);
    }
    var Rr = H * 0.3, D = jzShapeLayer(ctx, 'circle', cx, cy), gd = jzGrp(D);
    jzAddEllipse(gd, Rr * 2, Rr * 2);
    if (variant === 'disc') { jzAddFill(gd, sc.accent); jzPop(ctx, D, 0, true); }
    else { jzAddStroke(gd, sc.fg, 3); jzAddTrimPaths(gd, JZ_FNS + '100*oe(time/' + jzN(Math.max(0.2, c.inDur * 1.3)) + ')'); }
    var vert = !!jzP(ctx, 'vertical', false);
    var T = jzMain(ctx, vert ? jzVertical(text) : text, { font: font, size: 200, color: variant === 'disc' ? sc.bg : sc.fg, x: cx, y: cy, maxW: vert ? Rr * 1.1 : Rr * 1.45, maxH: vert ? Rr * 1.35 : Rr * 0.9, maxSize: vert ? Rr * 0.9 : Rr * 0.8 });
    return jzBB(T);
};

JZ_LAYOUTS.stack = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, n = jzP(ctx, 'copies', 4), dir = jzP(ctx, 'dir', 1), gap = jzP(ctx, 'gap', 0.92), style = jzP(ctx, 'style', 'fade'), xs = jzP(ctx, 'xs', 0);
    var probe = jzText(ctx, c.text, { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: sc.fg, x: -9999, y: -9999, track: 0.03, maxW: W * 0.8, maxH: H * 0.22, maxSize: H * 0.19 });
    var size = jzFontSize(probe); probe.remove();
    var step = size * gap, y0 = H / 2 - dir * (n - 1) * step / 2, bb = null;
    for (var k = n - 1; k >= 0; k--) {
        var o = { font: jzFontOf(ctx, 'font', 'display'), size: size, color: sc.fg, x: W / 2 + xs * W * k, y: y0 + dir * k * step, track: 0.03, mi: k * 1.2 };
        if (k > 0) { if (style === 'outline') { o.fill = false; o.stroke = Math.max(1.2, size * 0.014); o.strokeColor = sc.fg; o.opacity = 0.85; } else o.opacity = 0.6 * Math.pow(0.58, k - 1); }
        var L = jzMain(ctx, c.text, o); if (k === 0) bb = jzBB(L);
    }
    return bb;
};

JZ_LAYOUTS.pill = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut;
    var grad = jzP(ctx, 'grad', false) && sc.grad, fillA = grad ? sc.grad[0] : sc.accent, tc = jzLum(fillA) > 0.55 ? '#111111' : '#FFFFFF';
    var T = jzText(ctx, c.text, { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: tc, x: W / 2, y: H / 2, track: 0.04, maxW: W * 0.62, maxH: H * 0.2, maxSize: H * 0.17 });
    var size = jzFontSize(T), sz = jzSize(T), w = sz[0] + size * 1.3, h = size * 1.6;
    var P = jzShapeLayer(ctx, 'capsule', W / 2, H / 2), g = jzGrp(P); jzAddRect(g, w, h, h / 2); jzAddFill(g, fillA);
    if (grad) { var gr = jzEffect(P, 'ADBE Ramp', 'JZ Gradient'); jzEP(gr, 1, [W / 2 - w / 2, H / 2]); jzEP(gr, 2, jzHex(sc.grad[0])); jzEP(gr, 3, [W / 2 + w / 2, H / 2]); jzEP(gr, 4, jzHex(sc.grad[1])); }
    P.moveAfter(T);
    jzSetExpr(jzXf(P, 'ADBE Scale'), JZ_FNS + 'var e=oe(time/' + jzN(Math.max(0.1, c.inDur * 0.9)) + ')*(1-ie((time-' + jzN(c.dur - (c.outDur || 0)) + ')/' + jzN(Math.max(0.05, c.outDur || 0.05)) + '));[value[0]*Math.max(' + jzN(h / w) + ',e),value[1]]');
    jzMotion(ctx, T, { size: size, mi: 0 });
    if (jzP(ctx, 'smalls', true)) {
        var labs = [jzRomaji(c.text.replace(/[\s\u3000]+/g, '')) || 'LYRIC', 'No.' + jzPad((c.line || 0) + 1, 2)], fs = Math.max(13, H * 0.022);
        for (var i = 0; i < labs.length; i++) {
            var px = W / 2 + (i === 0 ? -w * 0.3 : w * 0.42), py = H / 2 + (i === 1 ? -h * 0.95 : h * 0.95);
            var t = jzSmall(ctx, labs[i], { size: fs, color: sc.fg, x: px, y: py, track: 0.1 }), ts = jzSize(t);
            var B = jzShapeLayer(ctx, 'tag', px, py), gb = jzGrp(B); jzAddRect(gb, ts[0] + fs * 1.6, fs * 1.7, fs * 0.85); jzAddStroke(gb, sc.fg, 1.3);
            t.parent = B; jzPop(ctx, B, 0.15 + i * 0.06, true);
        }
    }
    return jzBB(T);
};

JZ_LAYOUTS.title = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut;
    var L = jzMain(ctx, c.text, { font: jzFontOf(ctx, 'font', 'display'), size: 200, color: sc.fg, x: W / 2, y: H / 2, track: 0.08, maxW: W * 0.7, maxH: H * 0.2, maxSize: H * 0.16 });
    if (c.note) { var a = jzSmall(ctx, c.note, { size: Math.max(16, H * 0.03), color: sc.sub, x: W / 2, y: H / 2 + jzFontSize(L) * 0.95, track: 0.3 }); jzFadeIO(ctx, a, 0.3, 0.4); }
    return jzBB(L);
};

JZ_LAYOUTS.interlude = function (ctx) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut;
    var S = jzShapeLayer(ctx, 'rings', W / 2, H / 2);
    for (var k = 0; k < 3; k++) { var g = jzGrp(S); jzAddEllipse(g, H * (0.4 + k * 0.2), H * (0.4 + k * 0.2)); jzAddStroke(g, sc.sub, 1.2, 50); }
    jzSetExpr(jzXf(S, 'ADBE Scale'), 'var s=100*(1+0.04*Math.sin(time*2));[s,s]');
    if (jzP(ctx, 'variant', 'counter') === 'counter') {
        var n = jzText(ctx, '0.0', { font: jzFontOf(ctx, '_', 'display'), size: H * 0.36, color: sc.fg, x: W / 2, y: H / 2, opacity: 0.9 });
        try { n.property('ADBE Text Properties').property('ADBE Text Document').expression = 'Math.max(0,' + jzN(c.dur) + '-time).toFixed(1)'; } catch (e) {}
    }
    jzSmall(ctx, c.text || '\u2014 interlude \u2014', { size: Math.max(12, H * 0.022), color: sc.sub, x: W / 2, y: H * 0.82, track: 0.4 });
    return { x0: W * 0.35, x1: W * 0.65, y0: H * 0.3, y1: H * 0.7, cx: W / 2, cy: H / 2 };
};

// ================================================================ decor (AE)
var JZ_DECOR = {};
var JZ_DECOR_BACK = { grid: 1, stripes: 1, blobs: 1, bars: 1, shapes: 1, counter: 1 };
function jzIO(ctx, dur) { // opacity in/out expression for decor layers
    var c = ctx.cut;
    return JZ_FNS + 'value*oc(time/' + jzN(dur || 0.3) + ')*(1-ic((time-' + jzN(c.dur - Math.max(0.12, c.outDur || 0.15)) + ')/' + jzN(Math.max(0.12, c.outDur || 0.15)) + '))';
}

JZ_DECOR.brackets = function (ctx, bb, d) {
    var sc = ctx.sc, pad = 18 + (bb.y1 - bb.y0) * 0.12, x0 = bb.x0 - pad, x1 = bb.x1 + pad, y0 = bb.y0 - pad, y1 = bb.y1 + pad;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, L = Math.min(x1 - x0, y1 - y0) * 0.16 + 8, col = d.accent ? sc.accent : sc.fg;
    var S = jzShapeLayer(ctx, 'brackets', cx, cy), g = jzGrp(S), hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
    jzAddPath(g, [[-hw, -hh + L], [-hw, -hh], [-hw + L, -hh]], false);
    jzAddPath(g, [[hw - L, -hh], [hw, -hh], [hw, -hh + L]], false);
    jzAddPath(g, [[-hw, hh - L], [-hw, hh], [-hw + L, hh]], false);
    jzAddPath(g, [[hw - L, hh], [hw, hh], [hw, hh - L]], false);
    jzAddStroke(g, col, 2.2);
    jzSetExpr(jzXf(S, 'ADBE Scale'), JZ_FNS + 'var e=oe(time/0.35)*(1-ic((time-' + jzN(ctx.cut.dur - Math.max(0.12, ctx.cut.outDur || 0.15)) + ')/0.15));[value[0]*e,value[1]*e]');
};
JZ_DECOR.rings = function (ctx, bb, d) {
    var sc = ctx.sc, cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, R0 = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.55 + ctx.H * 0.05;
    var S = jzShapeLayer(ctx, 'rings', cx, cy);
    for (var k = 0; k < (d.n || 2); k++) {
        var R = R0 * (1 + k * 0.28 + jzR(d.seed, k, 1) * 0.1), g = jzGrp(S);
        jzAddEllipse(g, R * 2, R * 2); jzAddStroke(g, sc.fg, 1.2, 70);
        jzAddTrimPaths(g, JZ_FNS + '100*oe(time/0.5)*' + jzN(0.55 + 0.45 * jzR(d.seed, k, 3)));
        jzGX(g).property('ADBE Vector Rotation').expression = 'time*' + (k % 2 ? -14 : 10) + '+' + Math.round(jzR(d.seed, k, 2) * 360);
        var a = (jzR(d.seed, k, 2) * 360 + 40) * Math.PI / 180, px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
        var lab = jzText(ctx, 'X' + Math.round(px) + ' Y' + Math.round(py), { font: 'mono', size: Math.max(10, ctx.H * 0.015), color: sc.sub, x: px + 10, y: py - 12, align: 'left' });
        jzSetExpr(jzXf(lab, 'ADBE Opacity'), jzIO(ctx, 0.5));
    }
    jzSetExpr(jzXf(S, 'ADBE Opacity'), jzIO(ctx, 0.3));
};
JZ_DECOR.dots = function (ctx, bb, d) {
    var sc = ctx.sc, cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, R = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.62 + ctx.H * 0.04;
    var S = jzShapeLayer(ctx, 'dot ring', cx, cy), g = jzGrp(S);
    jzAddEllipse(g, 5, 5, R, 0); jzAddFill(g, sc.fg);
    var rp = jzVecs(g).addProperty('ADBE Vector Filter - Repeater');
    rp.property('ADBE Vector Repeater Copies').setValue(36);
    var rt = jzVecs(g).property('ADBE Vector Filter - Repeater').property('ADBE Vector Repeater Transform');
    rt.property('ADBE Vector Repeater Position').setValue([0, 0]);
    rt.property('ADBE Vector Repeater Rotation').setValue(10);
    jzSetExpr(jzXf(S, 'ADBE Rotate Z'), 'time*20');
    jzSetExpr(jzXf(S, 'ADBE Opacity'), jzIO(ctx, 0.3));
};
JZ_DECOR.arrows = function (ctx, bb, d) {
    var sc = ctx.sc, cy = (bb.y0 + bb.y1) / 2, s = Math.max(14, ctx.H * 0.03), gap = s * 0.9;
    for (var side = -1; side <= 1; side += 2) {
        var xEdge = side < 0 ? bb.x0 - s * 1.2 : bb.x1 + s * 1.2, dir = -side;
        var S = jzShapeLayer(ctx, 'chevrons', xEdge, cy);
        for (var i = 0; i < 3; i++) {
            var g = jzGrp(S), x = side * i * gap;
            jzAddPath(g, [[x - dir * s * 0.35, -s * 0.5], [x + dir * s * 0.35, 0], [x - dir * s * 0.35, s * 0.5]], false);
            jzAddStroke(g, i === 0 ? sc.accent : sc.fg, Math.max(2, s * 0.14));
            jzGX(g).property('ADBE Vector Group Opacity').expression = 'posterizeTime(12);(Math.floor(time*12)+' + i + ')%3===0?30:100';
        }
        jzSetExpr(jzXf(S, 'ADBE Position'), JZ_FNS + '[value[0]+' + side + '*(1-oe(time/0.4))*thisComp.width*0.2,value[1]]');
        jzSetExpr(jzXf(S, 'ADBE Opacity'), jzIO(ctx, 0.2));
    }
};
JZ_DECOR.slash = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc;
    for (var k = 0; k < (d.n || 1); k++) {
        var ang = jzLerp(-70, -20, jzR(d.seed, k, 1)) * Math.PI / 180, cx = jzLerp(W * 0.3, W * 0.7, jzR(d.seed, k, 2)), cy = jzLerp(H * 0.3, H * 0.7, jzR(d.seed, k, 3)), L = Math.sqrt(W * W + H * H);
        var S = jzShapeLayer(ctx, 'slash', 0, 0), g = jzGrp(S);
        jzAddPath(g, [[cx - Math.cos(ang) * L / 2, cy - Math.sin(ang) * L / 2], [cx + Math.cos(ang) * L / 2, cy + Math.sin(ang) * L / 2]], false);
        jzAddStroke(g, k ? sc.accent : sc.fg, k ? 2 : 1.4, 90);
        jzAddTrimPaths(g, JZ_FNS + '100*oe((time-' + jzN(k * 0.06) + ')/0.35)', JZ_FNS + '100*ic((time-' + jzN(ctx.cut.dur - Math.max(0.12, ctx.cut.outDur || 0.15)) + ')/0.15)');
    }
};
JZ_DECOR.sparks = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc;
    for (var k = 0; k < (d.n || 6); k++) {
        var x = jzLerp(W * 0.05, W * 0.95, jzR(d.seed, k, 2)), y = jzLerp(H * 0.08, H * 0.92, jzR(d.seed, k, 3)), r = jzLerp(H * 0.015, H * 0.04, jzR(d.seed, k, 4));
        var S = jzShapeLayer(ctx, 'spark', x, y), g = jzGrp(S), arms = jzR(d.seed, k, 7) < 0.5 ? 3 : 4;
        for (var a = 0; a < arms; a++) { var an = a * Math.PI / arms; jzAddPath(g, [[-Math.cos(an) * r, -Math.sin(an) * r], [Math.cos(an) * r, Math.sin(an) * r]], false); }
        jzAddStroke(g, k % 3 === 0 ? sc.accent : sc.fg, Math.max(1.5, r * 0.14));
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), 'time*' + Math.round((jzR(d.seed, k, 5) * 2 - 1) * 170));
        jzPop(ctx, S, jzR(d.seed, k, 1) * 0.4, true);
    }
};
JZ_DECOR.leaders = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut, fs = Math.max(11, H * 0.018);
    var labels = [jzRomaji(c.text.replace(/[\s\u3000]+/g, '')) || c.lineText, 'No.' + jzPad((c.line || 0) + 1, 2)];
    var anchors = [[bb.x1, bb.y0], [bb.x0, bb.y1]];
    for (var k = 0; k < 2; k++) {
        var ax = anchors[k][0], ay = anchors[k][1], sgn = k === 1 ? -1 : 1;
        var tx = jzClamp(ax + sgn * W * jzLerp(0.06, 0.14, jzR(d.seed, k, 1)), W * 0.06, W * 0.94), ty = jzClamp(ay + (k === 0 ? -1 : 1) * H * jzLerp(0.08, 0.16, jzR(d.seed, k, 2)), H * 0.08, H * 0.92);
        var S = jzShapeLayer(ctx, 'leader', 0, 0), g = jzGrp(S);
        jzAddPath(g, [[ax, ay], [tx, ty], [tx + sgn * W * 0.05, ty]], false); jzAddStroke(g, sc.sub, 1.2);
        jzAddTrimPaths(g, JZ_FNS + '100*oe((time-0.1)/0.45)');
        var gd = jzGrp(S); jzAddEllipse(gd, 7, 7, ax, ay); jzAddFill(gd, sc.accent);
        var t = jzText(ctx, labels[k], { font: k === 0 ? 'gothic_med' : 'mono', size: fs, color: sc.fg, x: tx + sgn * W * 0.055, y: ty - fs * 0.9, align: k === 1 ? 'right' : 'left', track: 0.06 });
        jzSetExpr(jzXf(t, 'ADBE Opacity'), jzIO(ctx, 0.45));
    }
};
JZ_DECOR.waveform = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, y = H * (d.low ? 0.86 : 0.14), pts = [], n = 60;
    for (var i = 0; i <= n; i++) { var u = i / n, a = H * 0.03 * Math.sin(u * Math.PI) * (0.4 + jzR(d.seed, i)); pts.push([jzLerp(W * 0.18, W * 0.82, u), y + (i % 2 ? a : -a)]); }
    var S = jzShapeLayer(ctx, 'waveform', 0, 0), g = jzGrp(S); jzAddPath(g, pts, false); jzAddStroke(g, sc.fg, 1.4, 90);
    jzSetExpr(jzXf(S, 'ADBE Scale'), 'posterizeTime(12);seedRandom(Math.floor(time*12),true);[100,100*random(0.5,1.2)]');
    jzXf(S, 'ADBE Anchor Point').setValue([W / 2, y]); jzXf(S, 'ADBE Position').setValue([W / 2, y]);
    jzAddTrimPaths(g, JZ_FNS + '100*oe(time/0.4)');
};
JZ_DECOR.barcode = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, x0 = d.right ? W * 0.84 : W * 0.06, y0 = d.low ? H * 0.84 : H * 0.07, h = H * 0.05;
    var S = jzShapeLayer(ctx, 'barcode', x0, y0), g = jzGrp(S), x = 0;
    for (var i = 0; i < 34; i++) { var w = 1 + Math.floor(jzR(d.seed, i, 1) * 3.2); if (jzR(d.seed, i, 2) < 0.62) jzAddRect(g, w, h, 0, x + w / 2, h / 2); x += w + 1.5; }
    jzAddFill(g, sc.fg, 90);
    var t = jzText(ctx, jzPad(jzHash(d.seed, 5) % 1000000000, 9), { font: 'mono', size: Math.max(9, H * 0.014), color: sc.fg, x: x0, y: y0 + h + 12, align: 'left', track: 0.2 });
    jzSetExpr(jzXf(S, 'ADBE Opacity'), jzIO(ctx, 0.3)); jzSetExpr(jzXf(t, 'ADBE Opacity'), jzIO(ctx, 0.3));
};
JZ_DECOR.grid = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, gs = H / 8;
    var S = jzShapeLayer(ctx, 'grid', 0, 0), g = jzGrp(S), x, y;
    for (x = (W / 2) % gs; x < W; x += gs) jzAddPath(g, [[x, 0], [x, H]], false);
    for (y = (H / 2) % gs; y < H; y += gs) jzAddPath(g, [[0, y], [W, y]], false);
    jzAddStroke(g, sc.sub, 1, 12);
    jzSetExpr(jzXf(S, 'ADBE Opacity'), jzIO(ctx, 0.3));
};
JZ_DECOR.stripes = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, w = H * 0.04;
    var S = jzShapeLayer(ctx, 'stripes', d.corner ? W * 0.85 : W * 0.15, d.corner ? H * 0.15 : H * 0.85), g = jzGrp(S);
    for (var i = -6; i <= 6; i++) jzAddRect(g, w, H * 0.36, 0, i * w * 2, 0);
    jzAddFill(g, d.accent ? sc.accent : sc.dim, 90);
    jzXf(S, 'ADBE Rotate Z').setValue(-35);
    jzSetExpr(jzXf(S, 'ADBE Scale'), JZ_FNS + '[value[0],value[1]*oe(time/0.3)]');
};
JZ_DECOR.blobs = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc;
    for (var k = 0; k < (d.n || 2); k++) {
        var cx = jzLerp(W * 0.12, W * 0.88, jzR(d.seed, k, 1)), cy = jzLerp(H * 0.15, H * 0.85, jzR(d.seed, k, 2)), R = jzLerp(H * 0.06, H * 0.16, jzR(d.seed, k, 3));
        var sh = new Shape(), v = [], inT = [], outT = [], m = 12;
        for (var i = 0; i < m; i++) {
            var a = i / m * Math.PI * 2, r = R * (0.72 + 0.5 * jzR(d.seed, k, i, 4)), tx = -Math.sin(a) * r * 0.26, ty = Math.cos(a) * r * 0.26;
            v.push([Math.cos(a) * r, Math.sin(a) * r]); inT.push([-tx, -ty]); outT.push([tx, ty]);
        }
        sh.vertices = v; sh.inTangents = inT; sh.outTangents = outT; sh.closed = true;
        var S = jzShapeLayer(ctx, 'blob', cx, cy), g = jzGrp(S);
        var p = jzVecs(g).addProperty('ADBE Vector Shape - Group'); p.property('ADBE Vector Shape').setValue(sh);
        jzAddFill(g, k % 2 ? sc.accent : (sc.accent2 || sc.accent), 95);
        jzPop(ctx, S, 0, true);
    }
};
JZ_DECOR.bars = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc;
    for (var k = 0; k < (d.n || 3); k++) {
        var y = H * (jzR(d.seed, k, 11) < 0.5 ? jzLerp(0.1, 0.27, jzR(d.seed, k, 1)) : jzLerp(0.73, 0.9, jzR(d.seed, k, 1))), h = H * jzLerp(0.03, 0.08, jzR(d.seed, k, 2));
        var w = W * jzLerp(0.35, 0.75, jzR(d.seed, k, 4)), fromL = jzR(d.seed, k, 3) < 0.5;
        var S = jzShapeLayer(ctx, 'bar', fromL ? 0 : W, y), g = jzGrp(S);
        jzAddRect(g, w, h, 0, fromL ? w / 2 : -w / 2, 0); jzAddFill(g, k === 0 ? sc.accent : sc.ink, 92);
        jzSetExpr(jzXf(S, 'ADBE Scale'), JZ_FNS + 'var e=oe((time-' + jzN(k * 0.05) + ')/0.3)*(1-ie((time-' + jzN(ctx.cut.dur - Math.max(0.12, ctx.cut.outDur || 0.15)) + ')/0.15));[value[0]*e,value[1]]');
    }
};
JZ_DECOR.shapes = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, cols = [sc.accent, sc.accent2 || sc.fg, sc.ink, sc.fg];
    for (var k = 0; k < (d.n || 5); k++) {
        var type = ['circle', 'square', 'tri', 'ring', 'ring'][Math.floor(jzR(d.seed, k, 1) * 5)];
        var top = jzR(d.seed, k, 4) < 0.5, x = jzLerp(W * 0.05, W * 0.95, jzR(d.seed, k, 2)), y = top ? jzLerp(H * 0.06, H * 0.24, jzR(d.seed, k, 10)) : jzLerp(H * 0.76, H * 0.94, jzR(d.seed, k, 10));
        var r = jzLerp(H * 0.018, H * 0.06, jzR(d.seed, k, 6)), col = cols[k % 4];
        var S = jzShapeLayer(ctx, 'shape', x, y), g = jzGrp(S);
        if (type === 'circle') { jzAddEllipse(g, r * 2, r * 2); jzAddFill(g, col); }
        else if (type === 'ring') { jzAddEllipse(g, r * 2, r * 2); jzAddStroke(g, col, Math.max(2, r * 0.12)); }
        else if (type === 'square') { jzAddRect(g, r * 2, r * 2); jzAddFill(g, col); }
        else { jzAddStar(g, 3, r, r * 0.5); var st = jzVecs(g).property('ADBE Vector Shape - Star'); try { st.property('ADBE Vector Star Type').setValue(2); } catch (e) {} jzAddFill(g, col); }
        jzSetExpr(jzXf(S, 'ADBE Rotate Z'), 'time*' + Math.round((jzR(d.seed, k, 8) * 2 - 1) * 60) + '+' + Math.round(jzR(d.seed, k, 7) * 360));
        jzPop(ctx, S, jzR(d.seed, k, 9) * 0.3, true);
    }
};
JZ_DECOR.counter = function (ctx, bb, d) {
    var W = ctx.W, H = ctx.H, sc = ctx.sc, c = ctx.cut;
    var t = jzText(ctx, '00', { font: jzFontOf(ctx, '_', 'display'), size: H * 0.5, color: d.accent ? sc.accent : sc.dim, x: d.right ? W * 0.86 : W * 0.14, y: H * (d.low ? 0.72 : 0.3) });
    var ex = d.mode === 'count' ? 'Math.floor(linear(time,0,' + jzN(c.dur * 0.8) + ',' + (d.from || 0) + ',' + (d.to || 99) + ')).toString()' : '"' + jzPad((c.index || 0) + 1, 2) + '"';
    try { t.property('ADBE Text Properties').property('ADBE Text Document').expression = ex; } catch (e) {}
    jzSetExpr(jzXf(t, 'ADBE Opacity'), jzIO(ctx, 0.3));
};

function jzDecorate(ctx, bb) {
    var list = ctx.cut.decor || [];
    bb = bb || { x0: ctx.W * 0.35, x1: ctx.W * 0.65, y0: ctx.H * 0.4, y1: ctx.H * 0.6, cx: ctx.W / 2, cy: ctx.H / 2 };
    for (var i = 0; i < list.length; i++) {
        var d = list[i], fn = JZ_DECOR[d.id];
        if (!fn) continue;
        var before = ctx.comp.numLayers;
        try { fn(ctx, bb, d); } catch (e) { jzWarn('decor ' + d.id + ': ' + e.toString()); }
        if (JZ_DECOR_BACK[d.id]) { // push newly created layers to the back, keeping their order
            var added = ctx.comp.numLayers - before;
            for (var k = 0; k < added; k++) { try { ctx.comp.layer(1).moveToEnd(); } catch (e2) {} }
        }
    }
}

// ================================================================ build a composition from a plan
function jzEventsArr(plan, type, t0, t1) {
    var out = [], ev = plan.events || [];
    for (var i = 0; i < ev.length; i++) {
        var e = ev[i]; if (e.type !== type) continue;
        if (t0 != null && (e.t < t0 - 0.7 || e.t > t1 + 0.1)) continue;
        out.push('[' + jzN(e.t) + ',' + jzN(e.amp || 1) + ',' + jzN(Math.max(e.dur || 0, 1 / 24)) + ']');
    }
    return '[' + out.join(',') + ']';
}

function jzBuild(plan, opt) {
    opt = opt || {};
    JZLOG = [];
    var W = opt.width || plan.width || 1920, H = opt.height || plan.height || 1080, fps = plan.fps || 24, D = Math.max(1, plan.duration || 10);
    var st = plan.style, fx = plan.fx || {}, roles = opt.roles || JZ_ROLE_DEFAULT;
    var ghostAmt = (fx.chroma == null ? 0.7 : fx.chroma) * (st.ghost == null ? 1 : st.ghost);
    var title = String(plan.title || 'lyric').substr(0, 20);
    var comp = app.project.items.addComp('JIZURA ' + title, W, H, 1, D, fps);
    var folder = app.project.items.addFolder('JIZURA ' + title + ' cuts');
    var u = H / 1080;
    var schemes = st.schemes, cuts = plan.cuts || [];
    function schemeOf(c) { return schemes[(c.scheme || 0) % schemes.length] || schemes[0]; }

    // ---------- background: radial ramp with hold keyframes where the colour scheme changes
    var bg = comp.layers.addSolid(jzHex(schemes[0].bg), 'JZ Background', W, H, 1, D);
    var ramp = jzEffect(bg, 'ADBE Ramp', 'JZ BG Colour');
    jzEP(ramp, 1, [W / 2, H * 0.45]); jzEP(ramp, 3, [W, H]); jzEP(ramp, 5, 2);
    var last = -1;
    for (var i = 0; i < cuts.length; i++) {
        var si = (cuts[i].scheme || 0) % schemes.length;
        if (si === last) continue;
        var s = schemes[si], lift = jzLum(s.bg) < 0.5 ? 0.045 : 0.1, b = jzHex(s.bg);
        var c1 = [Math.min(1, b[0] + lift), Math.min(1, b[1] + lift), Math.min(1, b[2] + lift)];
        var tt = i === 0 ? 0 : cuts[i].start;
        try {
            var p2 = ramp.property(2), p4 = ramp.property(4);
            p2.setValueAtTime(tt, c1); p4.setValueAtTime(tt, b);
            p2.setInterpolationTypeAtKey(p2.nearestKeyIndex(tt), KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
            p4.setInterpolationTypeAtKey(p4.nearestKeyIndex(tt), KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
        } catch (e) { jzWarn('bg key: ' + e.toString()); }
        last = si;
    }
    var paperAmt = (st.texture && st.texture.paper) || 0;
    if (paperAmt > 0.05 && (fx.texture == null || fx.texture > 0.05)) {
        var pp = comp.layers.addSolid([0.5, 0.5, 0.5], 'JZ Paper', W, H, 1, D);
        jzEffect(pp, 'ADBE Fractal Noise', 'JZ Paper Noise');
        pp.blendingMode = BlendingMode.OVERLAY; jzXf(pp, 'ADBE Opacity').setValue(22 * paperAmt);
        pp.moveAfter(bg); bg.moveToEnd();
    }

    // ---------- cuts
    var lagA = 0.8 / 24, lagB = 1.6 / 24;
    for (var ci = 0; ci < cuts.length; ci++) {
        var cut = cuts[ci];
        if (!(cut.end > cut.start)) continue;
        cut.dur = cut.end - cut.start;
        var sc = schemeOf(cut);
        var pc = app.project.items.addComp(jzPad(ci + 1, 3) + ' ' + String(cut.text || cut.layout).substr(0, 16), W, H, 1, Math.max(cut.dur, 1 / fps) + 0.2, fps);
        pc.parentFolder = folder;
        var ctx = { comp: pc, W: W, H: H, sc: sc, st: st, fx: { motion: fx.motion == null ? 0.7 : fx.motion, glitch: fx.glitch == null ? 0.5 : fx.glitch }, cut: cut, P: cut.params || {}, roles: roles, plan: plan };
        var bb = null;
        try { var fn = JZ_LAYOUTS[cut.layout] || JZ_LAYOUTS.center; bb = fn(ctx); }
        catch (e) { jzWarn('cut ' + (ci + 1) + ' ' + cut.layout + ': ' + e.toString() + (e.line ? ' (line ' + e.line + ')' : '')); }
        try { jzDecorate(ctx, bb); } catch (e2) { jzWarn('decor: ' + e2.toString()); }
        var L = comp.layers.add(pc);
        L.startTime = cut.start; L.inPoint = cut.start; L.outPoint = cut.end;
        L.name = (jzPad(ci + 1, 3) + ' ' + (cut.text || '')).substr(0, 24);
        if (ghostAmt > 0.02 && opt.ghosts !== false) {
            var ghosts = [['B', lagB, [-3.4, -1.3], sc.ghostB], ['A', lagA, [3.2, 1.9], sc.ghostA]];
            for (var g = 0; g < ghosts.length; g++) {
                var G = L.duplicate();
                G.name = L.name + ' ghost' + ghosts[g][0];
                G.startTime = cut.start + ghosts[g][1]; G.inPoint = cut.start; G.outPoint = cut.end + ghosts[g][1];
                G.moveAfter(L);
                var tint = jzEffect(G, 'ADBE Tint', 'JZ Ghost Colour');
                jzEP(tint, 1, jzHex(ghosts[g][3])); jzEP(tint, 2, jzHex(ghosts[g][3])); jzEP(tint, 3, 100);
                if (jzLum(sc.bg) > 0.55) G.blendingMode = BlendingMode.MULTIPLY;
                var off = ghosts[g][2];
                jzSetExpr(jzXf(G, 'ADBE Position'), 'var ev=' + jzEventsArr(plan, 'chroma', cut.start, cut.end) + ';var s=1;for(var i=0;i<ev.length;i++){var dt=(time-ev[i][0])*24;if(dt>=0&&dt<14)s+=ev[i][1]*Math.pow(0.55,dt);}' +
                    'var k=' + jzN(ghostAmt * u) + '*s;[value[0]+' + off[0] + '*k,value[1]+' + off[1] + '*k]');
            }
        }
    }

    // ---------- HUD
    if (plan.hud && opt.hud !== false) jzHUD(comp, plan, schemes[0], roles);

    // ---------- global FX (top adjustment layer)
    var fxL = comp.layers.addSolid([1, 1, 1], 'JZ FX', W, H, 1, D); fxL.adjustmentLayer = true;
    if (fx.onTwos !== false) { var pt = jzEffect(fxL, 'ADBE Posterize Time', 'JZ 2-koma'); jzEP(pt, 1, fps / 2); }
    var tr = jzEffect(fxL, 'ADBE Geometry2', 'JZ Shake');
    jzEX(tr, 2, 'var ev=' + jzEventsArr(plan, 'shake') + ';var s=0;for(var i=0;i<ev.length;i++){var dt=(time-ev[i][0])*24;if(dt>=0&&dt<14)s+=ev[i][1]*Math.pow(0.62,dt);}seedRandom(Math.floor(time*12),true);[value[0]+random(-1,1)*s*16*' + jzN(u) + ',value[1]+random(-1,1)*s*11*' + jzN(u) + ']');
    var ww = jzEffect(fxL, 'ADBE Wave Warp', 'JZ Slice Glitch');
    jzEP(ww, 1, 2); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
    jzEX(ww, 2, 'var ev=' + jzEventsArr(plan, 'slice') + ';var h=0;for(var i=0;i<ev.length;i++){var dt=time-ev[i][0];if(dt>=0&&dt<ev[i][2])h=Math.max(h,ev[i][1]);}posterizeTime(24);seedRandom(Math.floor(time*24),true);h>0?h*thisComp.width*0.05*random(0.4,1):0');
    jzEX(ww, 3, 'posterizeTime(24);seedRandom(Math.floor(time*24)+7,true);random(thisComp.height*0.02,thisComp.height*0.12)');
    jzEX(ww, 7, 'posterizeTime(24);seedRandom(Math.floor(time*24)+11,true);random(0,360)');
    var rb = jzEffect(fxL, 'CC Radial Blur', 'JZ Zoom Hit');
    jzEX(rb, 2, 'var ev=' + jzEventsArr(plan, 'zoom') + ';var a=0;for(var i=0;i<ev.length;i++){var dt=time-ev[i][0];if(dt>=0&&dt<ev[i][2])a=Math.max(a,ev[i][1]*(1-dt/ev[i][2]));}a*30');
    var iv = jzEffect(fxL, 'ADBE Invert', 'JZ Invert Hit');
    jzEX(iv, 2, 'var ev=' + jzEventsArr(plan, 'invert') + ';var on=false;for(var i=0;i<ev.length;i++){var dt=time-ev[i][0];if(dt>=0&&dt<ev[i][2])on=true;}on?0:100');
    var glowAmt = (st.glow || 0.6) * (fx.texture == null ? 0.6 : fx.texture);
    if (glowAmt > 0.05) { var gl = jzEffect(fxL, 'ADBE Glo2', 'JZ Bloom'); jzEP(gl, 2, 70); jzEP(gl, 3, 60 * u); jzEP(gl, 4, 0.35 * glowAmt); }
    var gr = (st.texture && st.texture.grain || 0) * (fx.texture == null ? 0.6 : fx.texture);
    if (gr > 0.02) { var nz = jzEffect(fxL, 'ADBE Noise', 'JZ Grain'); jzEP(nz, 1, 5 * gr); jzEP(nz, 2, 0); }

    // ---------- flash + vignette
    var fl = comp.layers.addSolid(jzHex(jzLum(schemes[0].bg) < 0.5 ? schemes[0].fg : '#ffffff'), 'JZ Flash', W, H, 1, D);
    jzSetExpr(jzXf(fl, 'ADBE Opacity'), 'var ev=' + jzEventsArr(plan, 'flash') + ';var o=0;for(var i=0;i<ev.length;i++){var dt=time-ev[i][0];if(dt>=0&&dt<ev[i][2])o=Math.max(o,Math.pow(1-dt/ev[i][2],1.5)*92);}o');
    var vg = comp.layers.addSolid([0, 0, 0], 'JZ Vignette', W, H, 1, D);
    try {
        var m = vg.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
        m.property('ADBE Mask Shape').setValue(jzCircleShape(W / 2, H / 2, Math.max(W, H) * 0.62));
        m.inverted = true; m.property('ADBE Mask Feather').setValue([H * 0.5, H * 0.5]);
        jzXf(vg, 'ADBE Scale').setValue([100, 100 * H / W * 1.6]);
    } catch (e3) { jzWarn('vignette: ' + e3.toString()); }
    jzXf(vg, 'ADBE Opacity').setValue(32 * (fx.texture == null ? 0.6 : fx.texture));

    // audio layer (optional)
    if (opt.audioItem) { try { var au = comp.layers.add(opt.audioItem); au.startTime = opt.audioStart || 0; au.moveToEnd(); } catch (e4) { jzWarn('audio: ' + e4.toString()); } }
    comp.openInViewer();
    return comp;
}

function jzHUD(comp, plan, sc, roles) {
    var W = comp.width, H = comp.height, m = Math.round(H * 0.045), L = H * 0.035, fs = Math.max(10, H * 0.016);
    var ctx = { comp: comp, W: W, H: H, sc: sc, roles: roles, cut: { dur: plan.duration, outDur: 0.2, inDur: 0.3, seed: 1 } };
    var S = jzShapeLayer(ctx, 'HUD frame', 0, 0), g = jzGrp(S);
    jzAddPath(g, [[m, m + L], [m, m], [m + L, m]], false); jzAddPath(g, [[W - m - L, m], [W - m, m], [W - m, m + L]], false);
    jzAddPath(g, [[m, H - m - L], [m, H - m], [m + L, H - m]], false); jzAddPath(g, [[W - m - L, H - m], [W - m, H - m], [W - m, H - m - L]], false);
    jzAddStroke(g, sc.sub, 1.4, 90);
    jzText(ctx, (plan.title || 'UNTITLED') + (plan.artist ? ' / ' + plan.artist : ''), { font: 'gothic_med', size: fs, color: sc.sub, x: m + L * 0.6, y: m + L * 0.9, align: 'left', track: 0.12 });
    var rec = jzText(ctx, 'REC', { font: 'mono', size: fs, color: sc.sub, x: W - m - L * 2.2, y: m + L * 0.9, align: 'left', track: 0.1 });
    var dot = jzShapeLayer(ctx, 'REC dot', W - m - L * 2.6, m + L * 0.9), gd = jzGrp(dot); jzAddEllipse(gd, fs * 0.64, fs * 0.64); jzAddFill(gd, sc.accent);
    jzSetExpr(jzXf(dot, 'ADBE Opacity'), 'Math.floor(time*6)%2===0?100:0');
    var tc = jzText(ctx, '00:00:00:00', { font: 'mono', size: fs, color: sc.sub, x: m + L * 0.6, y: H - m - L * 0.9, align: 'left', track: 0.1 });
    try { tc.property('ADBE Text Properties').property('ADBE Text Document').expression = 'timeToTimecode(time)'; } catch (e) {}
    var starts = []; for (var i = 0; i < (plan.lines || []).length; i++) starts.push(jzN(plan.lines[i].start));
    var lc = jzText(ctx, 'LYRIC 00/00', { font: 'mono', size: fs, color: sc.sub, x: W - m - L * 0.6, y: H - m - L * 0.9, align: 'right', track: 0.1 });
    try { lc.property('ADBE Text Properties').property('ADBE Text Document').expression = 'var ls=[' + starts.join(',') + '];var n=0;for(var i=0;i<ls.length;i++)if(time>=ls[i])n=i+1;"LYRIC "+("0"+n).slice(-2)+"/"+("0"+ls.length).slice(-2)'; } catch (e2) {}
    var bar = jzShapeLayer(ctx, 'HUD progress', 0, 0), gb = jzGrp(bar);
    jzAddPath(gb, [[W * 0.3, H - m - L * 0.9], [W * 0.7, H - m - L * 0.9]], false); jzAddStroke(gb, sc.accent, 2);
    jzAddTrimPaths(gb, 'linear(time,0,thisComp.duration,0,100)');
}

// ================================================================ ScriptUI panel
var JZ_SECTION = 'JIZURA';
function jzGet(key, def) { try { if (app.settings.haveSetting(JZ_SECTION, key)) return decodeURIComponent(app.settings.getSetting(JZ_SECTION, key)); } catch (e) {} return def; }
function jzPut(key, v) { try { app.settings.saveSetting(JZ_SECTION, key, encodeURIComponent(String(v))); } catch (e) {} }

var JZ_SAMPLE = '\u591C\u660E\u3051\u306E\u8272\u3092/\u899A\u3048\u3066\u308B\n\u307B\u3069\u3051\u305F\u58F0\u304C\u9060\u304F\u3067\u9CF4\u3063\u305F\n\u306D\u3048\u3001\u307E\u3060\u9593\u306B\u5408\u3046\u304B\u306A\n*\u900F\u660E*\u306A\u307E\u307E\u3058\u3083\u7D42\u308F\u308C\u306A\u3044!';

function jzUI(thisObj) {
    var win = (thisObj instanceof Panel) ? thisObj : new Window('palette', 'JIZURA', undefined, { resizeable: true });
    win.orientation = 'column'; win.alignChildren = ['fill', 'top']; win.spacing = 6; win.margins = 10;
    var head = win.add('group'); head.alignChildren = ['left', 'center'];
    var ttl = head.add('statictext', undefined, 'JIZURA \u5B57\u9762  lyric motion'); try { ttl.graphics.font = ScriptUI.newFont(ttl.graphics.font.name, 'BOLD', 14); } catch (e) {}

    var tp = win.add('tabbedpanel'); tp.alignChildren = ['fill', 'top'];
    // ---------------- tab 1: from lyrics
    var t1 = tp.add('tab', undefined, '\u6B4C\u8A5E\u304B\u3089'); t1.orientation = 'column'; t1.alignChildren = ['fill', 'top']; t1.spacing = 6; t1.margins = 8;
    t1.add('statictext', undefined, '\u6B4C\u8A5E\uFF081\u884C=1\u30D5\u30EC\u30FC\u30BA\u3000/ \u533A\u5207\u308A\u3000*\u5F37\u8ABF*\u3000\u884C\u672B! \u30A4\u30F3\u30D1\u30AF\u30C8\uFF09');
    var lyr = t1.add('edittext', undefined, jzGet('lyrics', JZ_SAMPLE), { multiline: true, wantReturn: true, scrolling: true }); lyr.preferredSize = [340, 150];
    var gT = t1.add('group'); gT.add('statictext', undefined, '\u66F2\u540D'); var eTitle = gT.add('edittext', undefined, jzGet('title', '')); eTitle.preferredSize.width = 120;
    gT.add('statictext', undefined, '\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8'); var eArtist = gT.add('edittext', undefined, jzGet('artist', '')); eArtist.preferredSize.width = 100;
    var bOmk = t1.add('button', undefined, '\u304A\u307E\u304B\u305B\u3067\u751F\u6210\uFF08\u62BC\u3059\u305F\u3073\u306B\u5225\u306E\u6F14\u51FA\uFF09');
    bOmk.helpTip = '\u30B9\u30BF\u30A4\u30EB\u30FB\u96F0\u56F2\u6C17\u30FB\u6F14\u51FA\u306E\u5F37\u3055\u30FB\u914D\u8272\u30FB\u30B7\u30FC\u30C9\u3092\u307E\u308B\u3054\u3068\u30E9\u30F3\u30C0\u30E0\u306B\u6C7A\u3081\u3066\u3001\u65B0\u3057\u3044\u30B3\u30F3\u30DD\u3092\u4F5C\u308A\u307E\u3059';
    try { bOmk.preferredSize.height = 34; bOmk.graphics.font = ScriptUI.newFont(bOmk.graphics.font.name, 'BOLD', 13); } catch (e) {}
    var gS = t1.add('group'); gS.add('statictext', undefined, '\u30B9\u30BF\u30A4\u30EB');
    var styleNames = [], i;
    for (i = 0; i < JZ_DATA.styleOrder.length; i++) styleNames.push(JZ_DATA.styles[JZ_DATA.styleOrder[i]].name);
    var ddStyle = gS.add('dropdownlist', undefined, styleNames); ddStyle.selection = parseInt(jzGet('style', '0'), 10) || 0;
    var gC = t1.add('group'); gC.add('statictext', undefined, '\u30B5\u30A4\u30BA');
    var sizes = ['\u30A2\u30AF\u30C6\u30A3\u30D6\u306A\u30B3\u30F3\u30DD\u3068\u540C\u3058', '1920\u00D71080', '1080\u00D71920', '1080\u00D71080', '3840\u00D72160', '1280\u00D7720', '1440\u00D71080 (4:3)', '1080\u00D71440 (3:4)'];
    var ddSize = gC.add('dropdownlist', undefined, sizes); ddSize.selection = parseInt(jzGet('size', '1'), 10) || 0;
    gC.add('statictext', undefined, 'fps'); var ddFps = gC.add('dropdownlist', undefined, ['24', '30', '60']); ddFps.selection = parseInt(jzGet('fps', '0'), 10) || 0;

    var pT = t1.add('panel', undefined, '\u30BF\u30A4\u30DF\u30F3\u30B0'); pT.alignChildren = ['left', 'top']; pT.margins = 10;
    var rAuto = pT.add('radiobutton', undefined, '\u81EA\u52D5\uFF08\u6587\u5B57\u6570\u30FBBPM \u304B\u3089\uFF09 / LRC\u306E\u6642\u523B');
    var rLayer = pT.add('radiobutton', undefined, '\u9078\u629E\u30EC\u30A4\u30E4\u30FC\u306E\u30DE\u30FC\u30AB\u30FC\u3092\u884C\u982D\u306B\u4F7F\u3046');
    var rComp = pT.add('radiobutton', undefined, '\u30B3\u30F3\u30DD\u30DE\u30FC\u30AB\u30FC\u3092\u884C\u982D\u306B\u4F7F\u3046');
    var tm = jzGet('timing', 'auto'); rAuto.value = tm === 'auto'; rLayer.value = tm === 'layer'; rComp.value = tm === 'comp';
    var gB = pT.add('group'); gB.add('statictext', undefined, 'BPM'); var eBpm = gB.add('edittext', undefined, jzGet('bpm', '')); eBpm.preferredSize.width = 50;
    gB.add('statictext', undefined, '\u884C\u306E\u9577\u3055'); var eScale = gB.add('edittext', undefined, jzGet('lineScale', '1')); eScale.preferredSize.width = 40;
    var cAudio = pT.add('checkbox', undefined, '\u9078\u629E\u4E2D\u306E\u97F3\u58F0\u30EC\u30A4\u30E4\u30FC\u3092\u65B0\u3057\u3044\u30B3\u30F3\u30DD\u306B\u5165\u308C\u308B'); cAudio.value = jzGet('audio', '1') === '1';

    var pF = t1.add('panel', undefined, '\u6F14\u51FA'); pF.alignChildren = ['fill', 'top']; pF.margins = 10;
    var gM = pF.add('group'); gM.add('statictext', undefined, '\u96F0\u56F2\u6C17').preferredSize.width = 86;
    var moodNames = ['\u6A19\u6E96\uFF08\u3059\u3079\u3066\u306E\u624B\u6CD5\u3092\u4F7F\u3046\uFF09'];
    for (i = 0; i < JZ_DATA.moodOrder.length; i++) moodNames.push(JZ_DATA.moods[JZ_DATA.moodOrder[i]].name);
    var ddMood = gM.add('dropdownlist', undefined, moodNames); ddMood.selection = parseInt(jzGet('mood', '0'), 10) || 0;
    ddMood.helpTip = '\u96F0\u56F2\u6C17\u3054\u3068\u306B\u4F7F\u3046\u30EC\u30A4\u30A2\u30A6\u30C8\u30FB\u767B\u5834\u30FB\u9000\u5834\u306E\u624B\u6CD5\u304C\u7D5E\u3089\u308C\u307E\u3059\uFF08\u30B7\u30FC\u30C9\u3067\u518D\u73FE\uFF09';
    function slider(parent, label, key, def) {
        var g = parent.add('group'); g.add('statictext', undefined, label).preferredSize.width = 86;
        var v = parseFloat(jzGet(key, String(def)));
        var s = g.add('slider', undefined, v, 0, 100); s.preferredSize.width = 170;
        var t = g.add('statictext', undefined, String(Math.round(v))); t.preferredSize.width = 30;
        s.onChanging = function () { t.text = String(Math.round(s.value)); };
        s.key = key; s.lbl = t; return s;
    }
    var sMotion = slider(pF, '\u52D5\u304D\u306E\u5F37\u3055', 'motion', 70), sGlitch = slider(pF, '\u30B0\u30EA\u30C3\u30C1', 'glitch', 55), sChroma = slider(pF, '\u8272\u30BA\u30EC', 'chroma', 70);
    var sDecor = slider(pF, '\u88C5\u98FE\u306E\u91CF', 'decor', 50), sDensity = slider(pF, '\u30AB\u30C3\u30C8\u306E\u7D30\u304B\u3055', 'density', 55), sTexture = slider(pF, '\u8CEA\u611F', 'texture', 60), sBg = slider(pF, '\u80CC\u666F\u306E\u5207\u66FF', 'bgSwitch', 35);
    var gO = pF.add('group');
    var cTwos = gO.add('checkbox', undefined, '2\u30B3\u30DE\u6253\u3061'); cTwos.value = jzGet('twos', '1') === '1';
    var cFlash = gO.add('checkbox', undefined, '\u30D5\u30E9\u30C3\u30B7\u30E5'); cFlash.value = jzGet('flash', '1') === '1';
    gO.add('statictext', undefined, 'HUD'); var ddHud = gO.add('dropdownlist', undefined, ['\u30B9\u30BF\u30A4\u30EB\u6B21\u7B2C', '\u8868\u793A', '\u975E\u8868\u793A']); ddHud.selection = parseInt(jzGet('hud', '0'), 10) || 0;
    var gSeed = t1.add('group'); gSeed.add('statictext', undefined, '\u30B7\u30FC\u30C9');
    var eSeed = gSeed.add('edittext', undefined, jzGet('seed', '20260922')); eSeed.preferredSize.width = 110;
    var bShuffle = gSeed.add('button', undefined, '\u30B7\u30E3\u30C3\u30D5\u30EB');
    bShuffle.onClick = function () { eSeed.text = String(Math.floor(Math.random() * 999999999)); };

    var pP = t1.add('panel', undefined, '\u30A2\u30AF\u30BB\u30F3\u30C8\u30FB\u30BA\u30EC\u8272'); pP.alignChildren = ['fill', 'top']; pP.margins = 10; pP.spacing = 6;
    var gP1 = pP.add('group');
    var cPal = gP1.add('checkbox', undefined, '\u30B9\u30BF\u30A4\u30EB\u306E\u8272\u3092\u4E0A\u66F8\u304D'); cPal.value = jzGet('palOn', '0') === '1';
    var bPal = gP1.add('button', undefined, '\u30E9\u30F3\u30C0\u30E0\u914D\u8272');
    bPal.helpTip = '\u80CC\u666F\u306B\u5408\u3046\u30A2\u30AF\u30BB\u30F3\u30C8\u8272\u3068\u30BA\u30EC\u8272A/B\u3092\u30E9\u30F3\u30C0\u30E0\u306B\u9078\u3073\u307E\u3059\uFF08\u660E\u308B\u3055\u306F\u80CC\u666F\u306B\u5408\u308F\u305B\u3066\u81EA\u52D5\u8ABF\u6574\uFF09';
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
    var fAcc = colorField('\u30A2\u30AF\u30BB\u30F3\u30C8', 'accent'), fGA = colorField('\u30BA\u30EC\u8272A', 'ghostA'), fGB = colorField('\u30BA\u30EC\u8272B', 'ghostB'), palFields = [fAcc, fGA, fGB];
    function curStyle() { return JZ_DATA.styles[JZ_DATA.styleOrder[ddStyle.selection ? ddStyle.selection.index : 0]] || JZ_DATA.styles.noir; }
    function setPal(p) { fAcc.e.text = p.accent; fGA.e.text = p.ghostA; fGB.e.text = p.ghostB; for (var q = 0; q < 3; q++) paint(palFields[q]); }
    function showStylePal() { var sc = curStyle().schemes[0]; setPal({ accent: sc.accent, ghostA: sc.ghostA, ghostB: sc.ghostB }); }
    if (!cPal.value || !jzCleanHex(fAcc.e.text)) showStylePal(); else setPal({ accent: fAcc.e.text, ghostA: fGA.e.text, ghostB: fGB.e.text });
    ddStyle.onChange = function () { if (!cPal.value) showStylePal(); };
    bPal.onClick = function () { setPal(jzRandomPalette(curStyle().schemes[0].bg)); cPal.value = true; status.text = '\u914D\u8272\u3092\u5909\u66F4\u3057\u307E\u3057\u305F \u2014 \u300C\u30B3\u30F3\u30DD\u3092\u751F\u6210\u3059\u308B\u300D\u3067\u53CD\u6620\u3055\u308C\u307E\u3059'; };
    cPal.onClick = function () { if (!cPal.value) showStylePal(); };

    var gGo = t1.add('group'); gGo.alignChildren = ['fill', 'center'];
    var bBuild = gGo.add('button', undefined, '\u30B3\u30F3\u30DD\u3092\u751F\u6210\u3059\u308B'); bBuild.alignment = ['fill', 'center'];

    // ---------------- tab 2: from JSON
    var t2 = tp.add('tab', undefined, 'JSON\u304B\u3089'); t2.orientation = 'column'; t2.alignChildren = ['fill', 'top']; t2.margins = 8;
    t2.add('statictext', undefined, '\u30D6\u30E9\u30A6\u30B6\u7248 JIZURA \u306E\u300CAE\u7528\u306B\u66F8\u304D\u51FA\u3057\u300D\u3067\u4F5C\u3063\u305F .json \u3092\u8AAD\u307F\u8FBC\u307F\u3001', undefined, { multiline: true });
    t2.add('statictext', undefined, '\u540C\u3058\u30BF\u30A4\u30DF\u30F3\u30B0\u30FB\u30EC\u30A4\u30A2\u30A6\u30C8\u30FB\u6F14\u51FA\u3067\u7DE8\u96C6\u53EF\u80FD\u306A\u30B3\u30F3\u30DD\u3092\u7D44\u307F\u307E\u3059\u3002', undefined, { multiline: true });
    var cAudio2 = t2.add('checkbox', undefined, '\u9078\u629E\u4E2D\u306E\u97F3\u58F0\u30EC\u30A4\u30E4\u30FC\u3082\u5165\u308C\u308B'); cAudio2.value = true;
    var bJson = t2.add('button', undefined, 'JSON\u3092\u9078\u3093\u3067\u751F\u6210\u2026');

    // ---------------- tab 3: fonts
    var t3 = tp.add('tab', undefined, '\u30D5\u30A9\u30F3\u30C8'); t3.orientation = 'column'; t3.alignChildren = ['fill', 'top']; t3.margins = 8;
    t3.add('statictext', undefined, 'PostScript\u540D\u3067\u6307\u5B9A\uFF08\u898B\u3064\u304B\u3089\u306A\u3044\u6307\u5B9A\u306F\u3053\u3053\u306B\u843D\u3061\u307E\u3059\uFF09', undefined, { multiline: true });
    function fontRow(label, key, def) { var g = t3.add('group'); g.add('statictext', undefined, label).preferredSize.width = 70; var e = g.add('edittext', undefined, jzGet('font_' + key, def)); e.preferredSize.width = 230; return e; }
    var fDisplay = fontRow('\u898B\u51FA\u3057', 'display', 'YuGothic-Bold'), fSerif = fontRow('\u660E\u671D', 'serif', 'YuMincho-Demibold'), fBody = fontRow('\u5C0F\u3055\u306A\u6587\u5B57', 'body', 'YuGothic-Medium'), fMono = fontRow('\u7B49\u5E45', 'mono', 'Consolas');
    var cForce = t3.add('checkbox', undefined, '\u5E38\u306B\u3053\u306E4\u66F8\u4F53\u3092\u4F7F\u3046\uFF08\u81EA\u52D5\u9078\u629E\u3057\u306A\u3044\uFF09'); cForce.value = jzGet('forceFonts', '0') === '1';
    var bPick = t3.add('button', undefined, '\u9078\u629E\u4E2D\u306E\u30C6\u30AD\u30B9\u30C8\u30EC\u30A4\u30E4\u30FC\u306E\u66F8\u4F53\u3092\u300C\u898B\u51FA\u3057\u300D\u306B');
    bPick.onClick = function () {
        var c = app.project.activeItem;
        if (!(c instanceof CompItem) || !c.selectedLayers.length) { alert('\u30C6\u30AD\u30B9\u30C8\u30EC\u30A4\u30E4\u30FC\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044'); return; }
        try { fDisplay.text = c.selectedLayers[0].property('ADBE Text Properties').property('ADBE Text Document').value.font; } catch (e) { alert('\u30C6\u30AD\u30B9\u30C8\u30EC\u30A4\u30E4\u30FC\u3067\u306F\u3042\u308A\u307E\u305B\u3093'); }
    };
    t3.add('statictext', undefined, 'Noto Sans JP / Noto Serif JP / Dela Gothic One \u306A\u3069\u304C\u5165\u3063\u3066\u3044\u308C\u3070\u81EA\u52D5\u3067\u4F7F\u3044\u307E\u3059\uFF08AE 2024\u4EE5\u964D\uFF09\u3002', undefined, { multiline: true });

    var status = win.add('statictext', undefined, '\u6E96\u5099OK', { truncate: 'end' });
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
        var s = (label ? label + '  ' : '') + (comp ? comp.name : '') + ' \u2014 ' + ((new Date().getTime() - t0) / 1000).toFixed(1) + 's';
        if (JZLOG.length) { s += ' / \u6CE8\u610F ' + JZLOG.length + '\u4EF6'; alert('JIZURA\uFF1A\u751F\u6210\u3057\u307E\u3057\u305F\u304C\u3001\u4E00\u90E8\u306B\u6CE8\u610F\u304C\u3042\u308A\u307E\u3059\uFF1A\n\n' + JZLOG.slice(0, 14).join('\n')); }
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
        var sl = [sMotion, sGlitch, sChroma, sDecor, sDensity, sTexture, sBg]; for (var k = 0; k < sl.length; k++) jzPut(sl[k].key, sl[k].value);
        var active = app.project.activeItem, W = 1920, H = 1080, fps = [24, 30, 60][ddFps.selection.index], dur = null;
        var sz = ddSize.selection.index;
        if (sz === 0) { if (active instanceof CompItem) { W = active.width; H = active.height; fps = active.frameRate; } }
        else { var wh = sizes[sz].split('\u00D7'); W = parseInt(wh[0], 10); H = parseInt(wh[1], 10); }
        var starts = null, mk, j;
        if (rLayer.value || rComp.value) {
            if (!(active instanceof CompItem)) { alert('\u30DE\u30FC\u30AB\u30FC\u3092\u4F7F\u3046\u306B\u306F\u3001\u30B3\u30F3\u30DD\u3092\u958B\u3044\u3066\u304F\u3060\u3055\u3044'); return; }
            try {
                if (rLayer.value) { if (!active.selectedLayers.length) { alert('\u30DE\u30FC\u30AB\u30FC\u306E\u3042\u308B\u30EC\u30A4\u30E4\u30FC\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044'); return; } mk = active.selectedLayers[0].property('ADBE Marker'); }
                else mk = active.markerProperty;
                starts = []; for (j = 1; j <= mk.numKeys; j++) starts.push(mk.keyTime(j));
                if (!starts.length) { alert('\u30DE\u30FC\u30AB\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093'); return; }
                dur = active.duration;
            } catch (e) { alert('\u30DE\u30FC\u30AB\u30FC\u3092\u8AAD\u3081\u307E\u305B\u3093\u3067\u3057\u305F: ' + e.toString()); return; }
        }
        var au = audioSel(cAudio.value); if (au && !dur) dur = null;
        var en = jzMoodEnabled(moodKey(), parseInt(eSeed.text, 10) || 1);
        var o = {
            lyrics: lyr.text, title: eTitle.text, artist: eArtist.text, style: JZ_DATA.styleOrder[ddStyle.selection.index], seed: parseInt(eSeed.text, 10) || 1,
            fx: { motion: sMotion.value / 100, glitch: sGlitch.value / 100, chroma: sChroma.value / 100, decor: sDecor.value / 100, density: sDensity.value / 100, texture: sTexture.value / 100, bgSwitch: sBg.value / 100, onTwos: cTwos.value, flash: cFlash.value, hud: false },
            width: W, height: H, fps: fps, bpm: parseFloat(eBpm.text) || 0, starts: starts, enabled: en, offset: 0.4, lineScale: parseFloat(eScale.text) || 1, duration: dur
        };
        var st = JZ_DATA.styles[o.style];
        o.fx.hud = ddHud.selection.index === 1 ? true : ddHud.selection.index === 2 ? false : !!st.hud;
        var plan;
        try { plan = jzMakePlan(o); } catch (e1) { alert('\u69CB\u6210\u306E\u8A08\u7B97\u3067\u30A8\u30E9\u30FC: ' + e1.toString() + (e1.line ? ' (line ' + e1.line + ')' : '')); return; }
        if (!plan.cuts.length) { alert('\u6B4C\u8A5E\u304C\u7A7A\u3067\u3059'); return; }
        plan.hud = o.fx.hud;
        if (cPal.value) {
            var pal = { accent: jzCleanHex(fAcc.e.text), ghostA: jzCleanHex(fGA.e.text), ghostB: jzCleanHex(fGB.e.text) };
            if (!pal.accent && !pal.ghostA && !pal.ghostB) jzWarn('\u914D\u8272\u306E\u5024\u304C\u8AAD\u3081\u306A\u3044\u305F\u3081\u3001\u30B9\u30BF\u30A4\u30EB\u306E\u8272\u306E\u307E\u307E\u306B\u3057\u307E\u3057\u305F\uFF08#RRGGBB \u5F62\u5F0F\u3067\u5165\u529B\uFF09');
            else plan.style = jzStyleWithPalette(plan.style, pal);
        }
        status.text = '\u751F\u6210\u4E2D\u2026 (' + plan.cuts.length + ' cuts)';
        app.beginUndoGroup('JIZURA build');
        var comp = null;
        try { comp = jzBuild(plan, { roles: roles(), audioItem: au ? au.item : null, audioStart: au ? au.start : 0 }); }
        catch (e2) { alert('\u751F\u6210\u4E2D\u306B\u30A8\u30E9\u30FC: ' + e2.toString() + (e2.line ? ' (line ' + e2.line + ')' : '')); }
        finally { app.endUndoGroup(); }
        report(comp, t0, label);
    }
    bBuild.onClick = function () { doBuild(''); };

    // \u304A\u307E\u304B\u305B: roll every setting on the panel, show it, then build a fresh comp
    bOmk.onClick = function () {
        var r = jzOmakase(moodKey(), JZ_DATA.styleOrder[ddStyle.selection ? ddStyle.selection.index : 0]);
        ddStyle.selection = jzIndexOf(JZ_DATA.styleOrder, r.style);
        ddMood.selection = jzIndexOf(JZ_DATA.moodOrder, r.mood) + 1;
        var map = [[sMotion, 'motion'], [sGlitch, 'glitch'], [sChroma, 'chroma'], [sDecor, 'decor'], [sDensity, 'density'], [sTexture, 'texture'], [sBg, 'bgSwitch']];
        for (var q = 0; q < map.length; q++) if (r.fx[map[q][1]] != null) { map[q][0].value = Math.round(r.fx[map[q][1]] * 100); map[q][0].lbl.text = String(map[q][0].value); }
        cTwos.value = r.onTwos; cFlash.value = r.flash; ddHud.selection = r.hud; eSeed.text = String(r.seed);
        if (r.palette) { setPal(r.palette); cPal.value = true; } else { cPal.value = false; showStylePal(); }
        doBuild('\u304A\u307E\u304B\u305B\uFF1A' + JZ_DATA.styles[r.style].name + ' \u00D7 ' + JZ_DATA.moods[r.mood].name + (r.palette ? '\u30FB\u30E9\u30F3\u30C0\u30E0\u914D\u8272' : ''));
    };

    bJson.onClick = function () {
        var f = File.openDialog('JIZURA AE JSON', 'JSON:*.json', false);
        if (!f) return;
        var t0 = new Date().getTime(), plan;
        try { f.encoding = 'UTF-8'; f.open('r'); var s = f.read(); f.close(); plan = jzParseJSON(s); }
        catch (e) { alert('JSON\u3092\u8AAD\u3081\u307E\u305B\u3093\u3067\u3057\u305F: ' + e.toString()); return; }
        if (!plan || !plan.cuts || !plan.style) { alert('JIZURA \u306E AE\u7528JSON \u3067\u306F\u306A\u3044\u3088\u3046\u3067\u3059'); return; }
        var note = plan.aeNote ? String(plan.aeNote) : '';
        var au = audioSel(cAudio2.value);
        status.text = '\u751F\u6210\u4E2D\u2026 (' + plan.cuts.length + ' cuts)';
        app.beginUndoGroup('JIZURA build from JSON');
        var comp = null;
        try { comp = jzBuild(plan, { roles: roles(), audioItem: au ? au.item : null, audioStart: au ? au.start : 0 }); }
        catch (e2) { alert('\u751F\u6210\u4E2D\u306B\u30A8\u30E9\u30FC: ' + e2.toString() + (e2.line ? ' (line ' + e2.line + ')' : '')); }
        finally { app.endUndoGroup(); }
        report(comp, t0, note ? '\u7F6E\u63DB\u3042\u308A' : '');
        if (note) status.helpTip = note;
    };

    win.onResizing = win.onResize = function () { try { this.layout.resize(); } catch (e) {} };
    if (win instanceof Window) { win.center(); win.show(); } else { win.layout.layout(true); win.layout.resize(); }
    return win;
}

jzUI(thisObj);
})(this);
