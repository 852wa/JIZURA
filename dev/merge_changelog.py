"""Put the v0.11.0 changelog entry into upstream's CHANGELOG.md, in front of v0.10.1.

usage: python dev/merge_changelog.py <file-with-my-entry> <target>
Called while rebasing onto a newer upstream: upstream's changelog is kept as it is and
this release's entry is inserted above the newest release it already lists.
"""
import io
import sys

src, target = sys.argv[1], sys.argv[2]
mine = io.open(src, encoding='utf-8').read()
start = mine.index('## v0.11.0')
end = mine.index('## v0.10.1')
entry = mine[start:end]

text = io.open(target, encoding='utf-8').read()
if '## v0.11.0' not in text:
    at = text.index('## v0.10.1')
    text = text[:at] + entry + text[at:]
io.open(target, 'w', encoding='utf-8', newline='\n').write(text)
print('changelog entries:', [l for l in text.split('\n') if l.startswith('## v0')][:3])
