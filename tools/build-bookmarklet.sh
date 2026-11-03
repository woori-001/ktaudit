#!/usr/bin/env bash
# workline-bookmarklet.js 를 압축해 workline.html 의 북마클릿 링크에 넣는다.
set -euo pipefail
cd "$(dirname "$0")/.."
npx -y terser@5.31.0 workline-bookmarklet.js -c -m --toplevel -o tools/.bm.min.js
python3 - <<'PY'
import urllib.parse,html
code=open('tools/.bm.min.js',encoding='utf-8').read().strip()
href='javascript:'+urllib.parse.quote(code,safe="!*'()~-_.")
tpl=open('tools/workline.template.html',encoding='utf-8').read()
open('workline.html','w',encoding='utf-8').write(tpl.replace('__BOOKMARKLET__',html.escape(href,quote=True)))
print('workline.html written, bookmarklet',len(href),'chars')
PY
rm -f tools/.bm.min.js
