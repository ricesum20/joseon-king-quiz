"""king.svg의 임금 그림으로 홈 화면 아이콘(images/src/icon.svg)을 만든다.
사용법: 프로젝트 폴더에서  python3 tools/make-icon.py  →  ./tools/render.sh icon
아이콘: 남색 단색 배경 + 금색 테두리 원 + 임금 상반신, 글자 없음.
가장자리가 잘리는 maskable 아이콘이어도 얼굴이 가운데 안전 영역 안에 들어오게 배치했다.
"""
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
king = (root / "images/src/king.svg").read_text(encoding="utf-8")
defs = re.search(r"<defs>.*?</defs>", king, re.S).group(0)
body = re.search(r'^\s*<g id="king">.*</g>\s*</svg>', king, re.S | re.M).group(0)
body = body[: body.rfind("</svg>")].strip()

icon = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- 자동 생성: tools/make-icon.py (원본 king.svg). 직접 고치지 말 것 -->
  {defs}
  <rect width="512" height="512" fill="#1e3a5f"/>
  <circle cx="256" cy="262" r="214" fill="#24466f"/>
  <circle cx="256" cy="262" r="214" fill="none" stroke="#d9a520" stroke-width="10"/>
  <g transform="translate(-63 22) scale(0.62)">
    {body}
  </g>
</svg>
"""
(root / "images/src/icon.svg").write_text(icon, encoding="utf-8")
print("만듦: images/src/icon.svg")
