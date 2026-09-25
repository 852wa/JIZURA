"""Fold README files by heading: every ## and ### section becomes a <details> block.
usage: python3 tools/fold_readme.py README.md README.en.md ...   (idempotent: already folded files are left alone)"""
import html, re, sys

def fold(text):
    if '<details>' in text: return text
    lines = text.split('\n')
    out, stack, fence = [], [], False
    def close(level):
        while stack and stack[-1] >= level:
            stack.pop()
            while out and out[-1] == '': out.pop()
            out.extend(['', '</details>', ''])
    for ln in lines:
        if ln.startswith('```'): fence = not fence
        m = None if fence else re.match(r'^(#{2,3}) (.+)$', ln)
        if m:
            level = len(m.group(1))
            close(level)
            while out and out[-1] in ('', '---'): out.pop()
            tag = 'h%d' % level
            out.extend(['', '<details>', '<summary><%s>%s</%s></summary>' % (tag, html.escape(m.group(2), quote=False), tag), ''])
            stack.append(level)
            continue
        if not fence and stack and ln.strip() == '---': continue
        out.append(ln)
    close(0)
    while out and out[-1] == '': out.pop()
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(out)) + '\n'

for p in sys.argv[1:]:
    s = open(p, encoding='utf-8').read()
    open(p, 'w', encoding='utf-8').write(fold(s))
    print(p)
