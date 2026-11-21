#!/bin/zsh
# SVG 원본(images/src)을 앱에서 쓰는 PNG·WebP로 바꾼다. 맥의 Google Chrome(헤드리스)을 쓴다.
# 사용법: 프로젝트 폴더에서  ./tools/render.sh        (전부)
#                           ./tools/render.sh king   (이름에 king이 들어간 것만)
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8765
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
sleep 1

render() { # 원본SVG 출력파일 너비 높이 형식
  local src=$1 out=$2 w=$3 h=$4 type=$5
  [[ -n "$FILTER" && "$out" != *"$FILTER"* ]] && return
  "$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
    --user-data-dir="$(mktemp -d)" --virtual-time-budget=8000 --dump-dom \
    "http://127.0.0.1:$PORT/tools/render.html?src=$src&w=$w&h=$h&type=$type&q=0.88" 2>/dev/null \
  | python3 -c '
import sys, re, base64
m = re.search(r"DATA:data:[^;]+;base64,([A-Za-z0-9+/=]+):END", sys.stdin.read())
if not m: sys.exit("변환 실패: " + sys.argv[1])
open(sys.argv[1], "wb").write(base64.b64decode(m.group(1)))
' "$out"
  echo "만듦: $out (${w}x${h})"
}

FILTER=$1
render images/src/bg-palace.svg  images/bg-palace.webp      2048 1536 image/webp
render images/src/bg-escape.svg  images/bg-escape.webp      2048 1536 image/webp
render images/src/king.svg       images/king.png            1024 1024 image/png
render images/src/seal.svg       images/seal.png             512  512 image/png
render images/src/icon.svg       images/icon-512.png         512  512 image/png
render images/src/icon.svg       images/icon-192.png         192  192 image/png
render images/src/icon.svg       images/apple-touch-icon.png 180  180 image/png
