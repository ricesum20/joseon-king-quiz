# 조선의 왕 퀴즈 — 프로젝트 규칙

초등 고학년 사회 수업용 태블릿 퀴즈 웹앱. 전체 요구사항은 `설계서.md`가 기준이다.

## 규칙

- **빌드 도구 없음.** 순수 HTML·CSS·JavaScript만 쓴다. npm·번들러·프레임워크를 들이지 않는다.
- 파일 구성: `index.html`, `style.css`, `app.js`, `questions.js`, `manifest.json`, `sw.js`, `images/`
- **문제와 정답은 한 객체로 묶는다.** `questions.js`의 `QUESTIONS` 배열 원소 하나가 `{ no, text, answer, alts }`. 남은 문제는 이 객체(또는 그 번호)를 섞은 배열로만 다룬다. 문제·정답을 별도 배열로 나누지 않는다.
- 한글 입력: `keydown`에서 `e.isComposing`(또는 keyCode 229)이면 엔터를 무시하고, 판정은 조합이 끝난 값으로 한다.
- 화면 키보드: 문제와 입력창은 화면 위쪽에 둔다. `visualViewport` 높이를 `--app-h` 변수로 반영한다. 장식 이미지는 배경·아래쪽에 둔다.
  - **입력창 아래에는 아무것도 두지 않는다.** 키보드가 올라오면 가려진다. 안내·힌트는 카드와 입력창 사이의 `.status-row`에 둔다.
  - 화면 높이에 따른 배치: 600px 미만이면 `.compact`, 휴대폰(너비 600 미만)이면서 600 미만이거나 340 미만이면 `.tight`(아주 촘촘하게).
  - 확인 크기(키보드가 올라온 상태): 390×400, 360×360(휴대폰), 1024×380, 810×620(아이패드).
- 효과음은 Web Audio API로 코드에서 만든다(음원 파일 없음). [시작하기] 버튼에서 AudioContext를 만들거나 resume해 잠금을 푼다.
- 이미지는 설계서의 파일 이름(`bg-palace.webp`, `bg-escape.webp`, `king.png`, `seal.png`, `icon-512.png`)을 쓴다. 파일이 없거나 불러오지 못하면 단청 색 CSS 도형으로 대신 보이게 한다.
  - 현재 이미지는 Claude가 SVG로 그린 그림이다(원본 `images/src/*.svg`). 다른 이미지로 바꿀 때는 같은 이름으로 덮어쓰면 된다.
  - SVG를 PNG·WebP로 바꿀 때는 `tools/render.sh`(Chrome 헤드리스)를 쓴다.
  - 아이콘(`images/src/icon.svg`)은 `king.svg`에서 자동으로 만든다: `python3 tools/make-icon.py` → `./tools/render.sh icon` → `./tools/render.sh apple`.
  - 임금 그림은 희화화하지 않고 위엄 있게 그린다(사용자 요청). 익선관 날개는 모자 뒤에서 둥근 두 잎이 맞닿아 조금 솟는 모양이다. 바깥으로 벌어지거나(고양이 귀) 가늘고 길게(토끼 귀) 그리지 않는다. 분홍 볼 같은 아기 같은 표현도 쓰지 않는다.
- 저장소는 localStorage만 쓴다. 로그인·서버·외부 전송·개인정보 수집 없음(닉네임은 기기 안에만 저장).
- 테스트 모드: 주소 뒤에 `?test=1`을 붙이면 3문제만 낸다. 기록과 이어하기는 테스트 전용 키(`jkq.ranking.test`, `jkq.progress.test`)에 따로 저장해 실제 순위표를 더럽히지 않는다.
- 파일을 고치면 `sw.js`의 `CACHE_VERSION`을 올린다. 그래야 태블릿이 새 버전을 받는다.
- 커밋 메시지는 한국어로, 단계마다 커밋한다.
- '정해야 할 것'은 설계서 기본값을 따른다. 탈출 성공은 27문제를 모두 맞힌 경우(힌트 후 맞힌 것 포함)이고, 세 번 틀리면 정답을 보여 주지 않고 결과 화면에서만 공개한다. 짧은 이름은 '조선왕퀴즈'다.

## localStorage 키

- `jkq.ranking`: 순위 기록 배열 `{ name, score, time, success, date, id }`
- `jkq.progress`: 진행 중인 게임(이어하기용) `{ v, total, remaining:[no], cur:{no, wrong}, done:[{no, wrong, solved}], penalty, elapsedMs }`
- 테스트 모드는 위 두 키 뒤에 `.test`가 붙는다.
- `jkq.sound`: 소리 켜기/끄기 (`"on"` / `"off"`)

## 진행 상황

- [x] 1. 저장소, CLAUDE.md, 설계서.md
- [x] 2. questions.js (27문제)
- [x] 3. index.html, style.css
- [x] 4. app.js 게임 진행·판정·점수·힌트·이어하기
- [x] 5. 결과·순위표
- [x] 6. 효과음
- [x] 7. 그림과 아이콘
- [x] 8. PWA(manifest, sw)
- [x] 9. 브라우저 확인 (2026-11-21, Chrome 헤드리스로 ?test=1 끝까지 플레이)
  - 확인함: 빈칸 안내, 감점 -1/-2/-3, 초성→한 글자 힌트, 띄어쓰기·물음표 무시, 세 번 틀림 처리, 이어하기, 결과 집계, 탈출 성공 배경, 순위 저장·강조, 서비스 워커 캐시
  - 화면 크기: 가로 1024×768, 세로 810×1080, 키보드가 올라온 높이(1024×380, 810×620)
  - 2026-11-21: 임금 그림을 위엄 있는 모습으로 다시 그림(익선관 날개 수정, 수염, 용무늬 보 3개, 아이콘 배경 남색)
  - 2026-11-21: 휴대폰에서 키보드가 힌트를 가리는 문제를 고침(힌트를 입력창 위로 옮김, 휴대폰용 촘촘한 배치)
  - 아직 안 함: 실제 아이패드·갤럭시 탭에서 소리, 화면 키보드, 홈 화면 추가 확인

## 다음 할 일

- 선생님이 문제 문장 검토(교과서 표현) → `questions.js`만 고치면 된다
- 원하면 GPT·제미나이 이미지로 교체(같은 파일 이름으로 덮어쓰기) → `sw.js`의 `CACHE_VERSION` 올리기
- 실제 아이패드·갤럭시 탭에서 소리·화면 키보드·홈 화면 추가 확인

## 배포

- 저장소: https://github.com/ricesum20/joseon-king-quiz (공개, main 브랜치)
- 주소: https://ricesum20.github.io/joseon-king-quiz/ (GitHub Pages, main 브랜치 루트)
- 2026-11-21 첫 배포. 배포 주소에서 앱 실행과 오프라인 실행을 확인했다.
- 고친 뒤 다시 배포하려면: `sw.js`의 `CACHE_VERSION`을 올리고 커밋한 다음 `git push`하면 된다. 1~2분 뒤에 반영된다.
