"""Generate the simplified <-> traditional character table used by the lyric matcher.

Source: opencc-data (the OpenCC word lists), Apache-2.0, single-character mappings in
both directions. A character keeps every other spelling it can have, because the
matcher only asks "could these two characters be the same character written
differently?".

Written as a plain object literal, one entry per line: a packed alphabet was tried
first and the en/decoder drifted out of step twice, which cost more than the bytes
save. Rare characters (outside the basic CJK block, where lyric text does not live)
are dropped.

usage: python build_han_table.py <opencc-data data dir> <out file>
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

BASIC = (0x4E00, 0x9FFF)


def basic(c):
    return len(c) == 1 and BASIC[0] <= ord(c) <= BASIC[1]


def read_pairs(path):
    out = {}
    with open(path, encoding="utf-8") as f:
        for row in f:
            row = row.rstrip("\n")
            if not row or row.startswith("#"):
                continue
            parts = row.split("\t")
            if len(parts) < 2:
                continue
            src, dst = parts[0], [d for d in parts[1].split(" ") if basic(d)]
            if not basic(src):
                continue
            if dst:
                out.setdefault(src, set()).update(dst)
    return out


def main():
    src = sys.argv[1]
    out = sys.argv[2]
    merged = {}
    for name in ("STCharacters.txt", "TSCharacters.txt"):
        for c, forms in read_pairs(os.path.join(src, name)).items():
            keep = set(merged.get(c, set())) | forms
            keep.discard(c)
            if keep:
                merged[c] = keep

    keys = sorted(merged)
    lines = []
    for k in keys:
        forms = "".join(sorted(merged[k]))
        lines.append("  " + k + ": '" + forms + "',")
    js = (
        "/* ============================================================\n"
        "   JIZURA — 簡体字と繁体字の対応表（歌詞の照合用）\n\n"
        "   A Simplified Chinese lyric pasted against a Traditional Chinese transcript\n"
        "   (or the other way round) shares only some of its characters: 这/這, 时/時,\n"
        "   对/對. Speech recognisers answer in whichever script they were trained on,\n"
        "   which is not necessarily the one the user typed, so J.tokenEq looks a\n"
        "   character up here and accepts any of its other spellings.\n\n"
        "   Generated from the OpenCC word lists (opencc-data, Apache-2.0) by\n"
        "   dev/build_han_table.py — single-character mappings in both directions,\n"
        "   basic CJK block only, a character whose only other spelling is itself left\n"
        "   out. Run that script to regenerate; do not hand-edit.\n"
        "   ============================================================ */\n"
        "(() => {\n"
        "'use strict';\n"
        "const VARIANTS = {\n" + "\n".join(lines) + "\n};\n"
        "/* the other ways this character is written, or null when there are none */\n"
        "J.hanVariants = (c) => { const v = VARIANTS[c]; return v === undefined ? null : v; };\n"
        "J.HAN_TABLE_SIZE = " + str(len(keys)) + ";\n"
        "})();\n"
    )
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(js)
    print(f"{len(keys)} characters, {len(js)} bytes -> {out}")


main()
