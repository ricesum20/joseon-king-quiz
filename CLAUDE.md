# 조선의 왕 퀴즈 — 프로젝트 규칙

초등 고학년 사회 수업용 태블릿 퀴즈 웹앱. 전체 요구사항은 `설계서.md`가 기준이다.

## 규칙

- **빌드 도구 없음.** 순수 HTML·CSS·JavaScript만 쓴다. npm·번들러·프레임워크를 들이지 않는다.
- 파일 구성: `index.html`, `style.css`, `app.js`, `questions.js`, `manifest.json`, `sw.js`, `images/`
- **문제와 정답은 한 객체로 묶는다.** `questions.js`의 `QUESTIONS` 배열 원소 하나가 `{ no, text, answer, alts }`. 남은 문제는 이 객체(또는 그 번호)를 섞은 배열로만 다룬다. 문제·정답을 별도 배열로 나누지 않는다.
- 한글 입력: `keydown`에서 `e.isComposing`(또는 keyCode 229)이면 엔터를 무시하고, 판정은 조합이 끝난 값으로 한다.
- 화면 키보드: 문제와 입력창은 화면 위쪽에 둔다. `visualViewport` 높이를 `--vh` 변수로 반영한다. 장식 이미지는 배경·아래쪽에 둔다.
- 효과음은 Web Audio API로 코드에서 만든다(음원 파일 없음). [시작하기] 버튼에서 AudioContext를 만들거나 resume해 잠금을 푼다.
- 이미지는 설계서의 파일 이름(`bg-palace.webp`, `bg-escape.webp`, `king.png`, `seal.png`, `icon-512.png`)을 쓴다. 파일이 없거나 불러오지 못하면 단청 색 CSS 도형으로 대신 보이게 한다.
  - 현재 이미지는 Claude가 SVG로 그린 그림이다(원본 `images/src/*.svg`). 다른 이미지로 바꿀 때는 같은 이름으로 덮어쓰면 된다.
  - SVG를 PNG·WebP로 바꿀 때는 `tools/render.sh`(Chrome 헤드리스)를 쓴다.
- 저장소는 localStorage만 쓴다. 로그인·서버·외부 전송·개인정보 수집 없음(닉네임은 기기 안에만 저장).
- 테스트 모드: 주소 뒤에 `?test=1`을 붙이면 3문제만 낸다(순위표에는 저장하지 않는다).
- 파일을 고치면 `sw.js`의 `CACHE_VERSION`을 올린다. 그래야 태블릿이 새 버전을 받는다.
- 커밋 메시지는 한국어로, 단계마다 커밋한다.
- '정해야 할 것'은 설계서 기본값을 따른다. 탈출 성공은 27문제를 모두 맞힌 경우(힌트 후 맞힌 것 포함)이고, 세 번 틀리면 정답을 보여 주지 않고 결과 화면에서만 공개한다. 짧은 이름은 '조선왕퀴즈'다.

## localStorage 키

- `jkq.ranking`: 순위 기록 배열 `{ name, score, time, success, date, id }`
- `jkq.progress`: 진행 중인 게임(이어하기용)
- `jkq.sound`: 소리 켜기/끄기 (`"on"` / `"off"`)

## 진행 상황

- [x] 1. 저장소, CLAUDE.md, 설계서.md
- [ ] 2. questions.js (27문제)
- [ ] 3. index.html, style.css
- [ ] 4. app.js 게임 진행·판정·점수·힌트·이어하기
- [ ] 5. 결과·순위표
- [ ] 6. 효과음
- [ ] 7. 그림과 아이콘
- [ ] 8. PWA(manifest, sw)
- [ ] 9. 브라우저 확인
