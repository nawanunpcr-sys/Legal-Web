#!/usr/bin/env python3
# Dev-only helper for the App.jsx → pages/ refactor. Slices an exact line range
# out of src/App.jsx, appends it (marking the main component `export default`)
# to an existing page file that already holds the import header, and adds the
# page import to App.jsx. Pure text move — no behavior change.
import sys, re
start, end = int(sys.argv[1]), int(sys.argv[2])   # inclusive, 1-indexed (current App.jsx)
outpath, export_name, import_line = sys.argv[3], sys.argv[4], sys.argv[5]
app = 'src/App.jsx'
lines = open(app).read().split('\n')
block = '\n'.join(lines[start-1:end])
block = re.sub(r'(?m)^function ' + re.escape(export_name) + r'\(',
               'export default function ' + export_name + '(', block, count=1)
with open(outpath, 'a') as f:
    f.write('\n' + block + '\n')
text = '\n'.join(lines[:start-1] + lines[end:])
anchor = "} from './lib/ui.jsx'"
i = text.index(anchor) + len(anchor)
text = text[:i] + '\n' + import_line + text[i:]
open(app, 'w').write(text)
print('moved lines %d-%d -> %s (export default %s)' % (start, end, outpath, export_name))
