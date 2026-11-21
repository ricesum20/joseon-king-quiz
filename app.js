/* 조선의 왕 퀴즈 — 게임 진행
 *
 * 문제는 questions.js의 QUESTIONS 객체를 그대로 쓴다.
 * 남은 문제는 "문제 번호(no)" 배열로만 들고 있고, 번호로 객체 하나를 찾아
 * 문제·정답·복수정답을 함께 꺼낸다. 문제 목록과 정답 목록을 따로 두지 않는다.
 */
(() => {
  "use strict";

  // ---------- 설정 ----------
  const params = new URLSearchParams(location.search);
  const TEST_MODE = params.get("test") === "1";
  const TEST_COUNT = 3;
  const START_SCORE = 100;
  const PENALTY = [1, 2, 3];          // 첫 번째·두 번째·세 번째 틀림
  const MAX_TRIES = 3;
  const NEXT_DELAY = 1500;            // 다음 문제까지 1.5초
  const NAME_MAX = 8;
  const KEY = {
    ranking: TEST_MODE ? "jkq.ranking.test" : "jkq.ranking",
    progress: TEST_MODE ? "jkq.progress.test" : "jkq.progress",
    sound: "jkq.sound",
  };

  const byNo = new Map(QUESTIONS.map((q) => [q.no, q]));
  const getQ = (no) => byNo.get(no);

  // ---------- 저장소 (localStorage, 실패해도 게임은 된다) ----------
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 불가 */ }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch { /* 무시 */ }
    },
  };

  // ---------- 화면 요소 ----------
  const $ = (id) => document.getElementById(id);
  const app = $("app");
  const el = {
    resumeBtn: $("resumeBtn"), startBtn: $("startBtn"), rankBtn: $("rankBtn"), resumeInfo: $("resumeInfo"),
    qCount: $("qCount"), qScore: $("qScore"), qTime: $("qTime"),
    card: $("card"), qBadge: $("qBadge"), qText: $("qText"), sealSlot: $("sealSlot"), popMinus: $("popMinus"),
    form: $("answerForm"), input: $("answerInput"), submitBtn: $("submitBtn"),
    feedback: $("feedback"), hint: $("hint"),
    resultTitle: $("resultTitle"), resultSub: $("resultSub"), rScore: $("rScore"), rTime: $("rTime"),
    rFirst: $("rFirst"), rHint: $("rHint"), rMiss: $("rMiss"),
    missedBox: $("missedBox"), missedList: $("missedList"),
    saveForm: $("saveForm"), nameInput: $("nameInput"), saveMsg: $("saveMsg"), skipSaveBtn: $("skipSaveBtn"),
    rankBody: $("rankBody"), rankEmpty: $("rankEmpty"), myRank: $("myRank"), rankMode: $("rankMode"),
    againBtn: $("againBtn"), homeBtn: $("homeBtn"), clearBtn: $("clearBtn"),
    soundBtn: $("soundBtn"), testBadge: $("testBadge"),
  };

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("is-active", s.id === "screen-" + name));
    app.classList.toggle("escape", name === "result" && !!lastResult && lastResult.success);
    current.screen = name;
  }
  const current = { screen: "start" };

  // ---------- 화면 키보드 대응 ----------
  // 보이는 영역(visualViewport)에 맞춰 앱 높이를 줄이고, 낮아지면 촘촘한 배치로 바꾼다.
  function fitViewport() {
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    const top = vv ? vv.offsetTop : 0;
    document.documentElement.style.setProperty("--app-h", h + "px");
    document.documentElement.style.setProperty("--app-top", top + "px");
    app.classList.toggle("compact", h < 600);
    // 아주 촘촘하게: 휴대폰(좁은 화면)에서 낮아졌을 때, 또는 어떤 기기든 아주 낮을 때
    app.classList.toggle("tight", h < 340 || (h < 600 && window.innerWidth < 600));
  }
  if (window.visualViewport) {
    visualViewport.addEventListener("resize", fitViewport);
    visualViewport.addEventListener("scroll", fitViewport);
  }
  window.addEventListener("resize", fitViewport);
  window.addEventListener("orientationchange", () => setTimeout(fitViewport, 300));
  fitViewport();

  // ---------- 도우미 ----------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const pad = (n) => String(n).padStart(2, "0");
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // 정답 판정용 정리: 띄어쓰기, 앞뒤 공백, 마침표·물음표를 없앤다.
  function normalize(s) {
    return String(s).normalize("NFC").replace(/[\s.?。．？]/g, "");
  }
  function isCorrect(q, input) {
    const v = normalize(input);
    return [q.answer, ...q.alts].some((a) => normalize(a) === v);
  }

  // 힌트: 초성 → 한 글자
  const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  function choseong(word) {
    return Array.from(word).map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : ch;
    }).join("");
  }
  function firstLetter(word) {
    const chars = Array.from(word);
    return chars[0] + "○".repeat(chars.length - 1);
  }
  // 화면에는 [제○대]를 배지로 따로 보여 주고, 문장에서는 뺀다.
  function splitText(q) {
    const m = q.text.match(/^\s*\[(제\d+대)\]\s*/);
    return m ? { badge: m[1], body: q.text.slice(m[0].length) } : { badge: `제${q.no}대`, body: q.text };
  }

  // ---------- 게임 상태 ----------
  // remaining: 아직 안 낸 문제 번호 / cur: 지금 문제 {no, wrong} / done: 끝난 문제 {no, wrong, solved}
  let game = null;
  let busy = false;          // 1.5초 넘어가는 동안 입력 막기
  let lastResult = null;

  function newGame() {
    const all = shuffle(QUESTIONS.map((q) => q.no));
    const pool = TEST_MODE ? all.slice(0, TEST_COUNT) : all;
    game = {
      v: 1,
      total: pool.length,
      remaining: pool,
      cur: null,
      done: [],
      penalty: 0,
      elapsedMs: 0,
    };
    pickNext();
  }

  // 남은 문제 중 하나를 무작위로 꺼낸다(꺼낸 번호는 remaining에서 빠지므로 다시 나오지 않는다).
  function pickNext() {
    const i = Math.floor(Math.random() * game.remaining.length);
    const no = game.remaining.splice(i, 1)[0];
    game.cur = { no, wrong: 0 };
    saveProgress();
  }

  const score = () => Math.max(0, START_SCORE - (game ? game.penalty : 0));

  function saveProgress() {
    if (game) store.set(KEY.progress, { ...game, elapsedMs: elapsedNow() });
  }
  function loadProgress() {
    const p = store.get(KEY.progress, null);
    if (!p || p.v !== 1 || !p.cur || !getQ(p.cur.no)) return null;
    if (!Array.isArray(p.remaining) || !p.remaining.every(getQ)) return null;
    return p;
  }

  // ---------- 타이머 (앱이 꺼져 있던 시간은 세지 않는다) ----------
  let runningSince = null;
  let tick = null;
  function elapsedNow() {
    if (!game) return 0;
    return game.elapsedMs + (runningSince ? performance.now() - runningSince : 0);
  }
  function startTimer() {
    if (runningSince == null) runningSince = performance.now();
    clearInterval(tick);
    tick = setInterval(() => {
      el.qTime.textContent = fmtTime(elapsedNow() / 1000);
    }, 250);
  }
  function pauseTimer() {
    if (runningSince != null && game) {
      game.elapsedMs += performance.now() - runningSince;
    }
    runningSince = null;
    clearInterval(tick);
  }
  document.addEventListener("visibilitychange", () => {
    if (current.screen !== "quiz") return;
    if (document.hidden) { pauseTimer(); saveProgress(); }
    else { startTimer(); }
  });
  window.addEventListener("pagehide", () => { if (current.screen === "quiz") saveProgress(); });

  // ---------- 문제 화면 ----------
  function renderQuestion() {
    const q = getQ(game.cur.no);
    const { badge, body } = splitText(q);
    const n = game.done.length + 1;
    el.qCount.textContent = `${n} / ${game.total}`;
    el.qScore.textContent = `${score()}점`;
    el.qTime.textContent = fmtTime(elapsedNow() / 1000);
    el.qBadge.textContent = badge;
    el.qText.textContent = body;
    el.feedback.innerHTML = "";
    el.input.value = "";
    el.input.className = "answer-input";
    el.input.readOnly = false;
    el.sealSlot.classList.remove("stamp");
    renderHint();
    busy = false;
  }

  function renderHint() {
    const q = getQ(game.cur.no);
    const w = game.cur.wrong;
    if (w === 1) {
      el.hint.innerHTML = `힌트: <b>${escapeHtml(choseong(q.answer))}</b>`;
      el.hint.hidden = false;
    } else if (w === 2) {
      el.hint.innerHTML = `힌트: <b>${escapeHtml(firstLetter(q.answer))}</b>`;
      el.hint.hidden = false;
    } else {
      el.hint.hidden = true;
      el.hint.innerHTML = "";
    }
  }

  function setFeedback(kind, text) {
    el.feedback.innerHTML = `<span class="${kind}">${escapeHtml(text)}</span>`;
  }

  function restart(anim, elm) {
    elm.classList.remove(anim);
    void elm.offsetWidth; // 애니메이션 다시 시작
    elm.classList.add(anim);
  }

  function enterQuiz() {
    showScreen("quiz");
    renderQuestion();
    startTimer();
    // 사용자가 누른 그 순간에 포커스해야 아이패드에서 키보드가 올라온다.
    el.input.focus({ preventScroll: true });
  }

  function handleSubmit() {
    if (busy || !game || current.screen !== "quiz") return;
    const value = el.input.value;
    if (normalize(value) === "") {
      setFeedback("info", "답을 적어 주세요");
      el.input.focus({ preventScroll: true });
      return;
    }
    const q = getQ(game.cur.no);

    if (isCorrect(q, value)) {
      busy = true;
      el.input.readOnly = true;
      el.input.classList.add("ok");
      setFeedback("ok", "정답입니다!");
      restart("stamp", el.sealSlot);
      Sound.correct();
      finishQuestion(true);
      return;
    }

    // 틀림
    game.cur.wrong += 1;
    const minus = PENALTY[game.cur.wrong - 1];
    game.penalty += minus;
    el.qScore.textContent = `${score()}점`;
    el.popMinus.textContent = `-${minus}`;
    restart("show", el.popMinus);
    restart("shake", el.card);
    el.input.classList.add("bad");
    Sound.wrong();

    if (game.cur.wrong >= MAX_TRIES) {
      busy = true;
      el.input.readOnly = true;
      setFeedback("bad", "아쉬워요! 다음 문제로");
      el.hint.hidden = true;
      finishQuestion(false);
      return;
    }
    setFeedback("bad", game.cur.wrong === 1 ? "틀렸어요!" : "마지막 기회!");
    renderHint();
    saveProgress();
    el.input.value = "";
    el.input.focus({ preventScroll: true });
    setTimeout(() => el.input.classList.remove("bad"), 600);
  }

  function finishQuestion(solved) {
    game.done.push({ no: game.cur.no, wrong: game.cur.wrong, solved });
    const finished = game.remaining.length === 0;
    if (!finished) pickNext(); else saveProgress();
    setTimeout(() => {
      if (finished) endGame();
      else renderQuestion();
    }, NEXT_DELAY);
  }

  // ---------- 한글 입력: 조합 중 엔터 처리 ----------
  // 조합 중(isComposing) 엔터는 막고, 조합이 끝난 뒤에 제출한다.
  // 크롬은 한글 조합 중 엔터에 keydown을 두 번 보내기도 해서, 짧은 시간 안의 제출 요청은 한 번으로 합친다.
  let composing = false;
  let submitAfterCompose = false;
  let submitTimer = null;
  function queueSubmit() {
    clearTimeout(submitTimer);
    submitTimer = setTimeout(handleSubmit, 40);
  }
  el.input.addEventListener("compositionstart", () => { composing = true; });
  el.input.addEventListener("compositionend", () => {
    composing = false;
    if (submitAfterCompose) { submitAfterCompose = false; queueSubmit(); }
  });
  el.input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (e.isComposing || e.keyCode === 229 || composing) {
      e.preventDefault();                 // 조합 중 엔터로 바로 제출되지 않게
      if (composing) submitAfterCompose = true;   // 조합이 끝나면 제출
      else queueSubmit();                 // (사파리) 조합이 이미 끝난 뒤 229로 오는 경우
    }
  });
  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (composing) { submitAfterCompose = true; return; }
    queueSubmit();
  });
  // [제출]을 눌러도 입력창 포커스를 잃지 않게 해서 화면 키보드가 내려가지 않게 한다.
  el.submitBtn.addEventListener("pointerdown", (e) => { if (current.screen === "quiz") e.preventDefault(); });

  // ---------- 결과 ----------
  function endGame() {
    pauseTimer();
    const timeSec = Math.round(game.elapsedMs / 1000);
    const first = game.done.filter((d) => d.solved && d.wrong === 0).length;
    const hinted = game.done.filter((d) => d.solved && d.wrong > 0).length;
    const missed = game.done.filter((d) => !d.solved);
    lastResult = {
      score: score(),
      time: timeSec,
      success: missed.length === 0,
      first, hinted, missed: missed.map((d) => d.no),
      saved: false,
    };
    store.remove(KEY.progress);
    game = null;
    el.input.blur();
    renderResult();
    showScreen("result");
    if (lastResult.success) Sound.success(); else Sound.fail();
  }

  function renderResult() {
    const r = lastResult;
    el.resultTitle.textContent = r.success ? "탈출 성공!" : "탈출 실패";
    el.resultTitle.className = "result-title " + (r.success ? "success" : "fail");
    el.resultSub.textContent = r.success
      ? "모든 왕을 맞혀 궁궐 문이 열렸어요!"
      : "못 맞힌 왕이 있어 문이 닫혀 버렸어요. 다시 도전해 봐요!";
    el.rScore.textContent = r.score;
    el.rTime.textContent = fmtTime(r.time);
    el.rFirst.textContent = r.first;
    el.rHint.textContent = r.hinted;
    el.rMiss.textContent = r.missed.length;
    el.missedBox.hidden = r.missed.length === 0;
    el.missedList.innerHTML = r.missed
      .slice().sort((a, b) => a - b)
      .map((no) => {
        const q = getQ(no);
        return `<li>${escapeHtml(q.text)} <span class="ans">${escapeHtml(q.answer)}</span></li>`;
      }).join("");
    el.nameInput.value = "";
    el.saveMsg.textContent = "";
    el.saveForm.hidden = false;
  }

  // ---------- 순위표 ----------
  // 기록은 모두 남겨 두고(10위 밖 순위 계산용), 화면에는 1~10위만 보여 준다.
  // 정렬: 점수 높은 순 → 시간 짧은 순 → 먼저 세운 기록 순
  function loadRanking() {
    const list = store.get(KEY.ranking, []);
    return Array.isArray(list) ? list.filter((r) => r && typeof r.score === "number") : [];
  }
  function sortRanking(list) {
    return list.slice().sort((a, b) => b.score - a.score || a.time - b.time || a.id - b.id);
  }

  el.saveForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!lastResult || lastResult.saved) return;
    const name = el.nameInput.value.trim().replace(/\s+/g, " ");
    const len = Array.from(name).length;
    if (len === 0) { el.saveMsg.textContent = "닉네임을 적어 주세요"; el.nameInput.focus(); return; }
    if (len > NAME_MAX) { el.saveMsg.textContent = `닉네임은 ${NAME_MAX}글자까지예요`; el.nameInput.focus(); return; }
    const record = {
      id: Date.now(),
      name,
      score: lastResult.score,
      time: lastResult.time,
      success: lastResult.success,
      date: todayStr(),
    };
    const list = sortRanking([...loadRanking(), record]).slice(0, 500);
    store.set(KEY.ranking, list);
    lastResult.saved = true;
    el.nameInput.blur();
    showRanking(record.id);
  });
  // 조합 중 엔터로 닉네임 마지막 글자가 잘리지 않게
  el.nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.isComposing || e.keyCode === 229)) e.preventDefault();
  });
  el.skipSaveBtn.addEventListener("click", () => { lastResult = null; renderStart(); });

  function showRanking(highlightId) {
    const list = sortRanking(loadRanking());
    const top = list.slice(0, 10);
    el.rankBody.innerHTML = top.map((r, i) => {
      const rank = i + 1;
      const medal = rank <= 3 ? `<span class="medal m${rank}">${rank}</span>` : `${rank}`;
      const mine = r.id === highlightId ? ' class="mine"' : "";
      const mark = r.success ? " 🏯" : "";
      return `<tr${mine}><td>${medal}</td><td class="name">${escapeHtml(r.name)}${mark}</td>` +
             `<td>${r.score}점</td><td>${fmtTime(r.time)}</td><td>${escapeHtml(r.date || "")}</td></tr>`;
    }).join("");
    el.rankEmpty.hidden = list.length > 0;
    const myIndex = highlightId == null ? -1 : list.findIndex((r) => r.id === highlightId);
    el.myRank.hidden = !(myIndex >= 10);
    if (myIndex >= 10) el.myRank.textContent = `내 순위: ${myIndex + 1}위`;
    lastResult = null;
    app.classList.remove("escape");
    showScreen("rank");
  }

  el.againBtn.addEventListener("click", startNew);
  el.homeBtn.addEventListener("click", renderStart);

  // [기록 지우기]: 3초 동안 계속 눌러야 지워진다.
  const HOLD_MS = 3000;
  const holdLabel = el.clearBtn.querySelector(".hold-label");
  const HOLD_TEXT = holdLabel.textContent;
  let holdTimer = null;
  function holdStart(e) {
    e.preventDefault();
    if (holdTimer) return;
    el.clearBtn.classList.add("holding");
    holdLabel.textContent = "계속 누르고 있어요…";
    holdTimer = setTimeout(() => {
      holdTimer = null;
      store.remove(KEY.ranking);
      el.clearBtn.classList.remove("holding");
      holdLabel.textContent = "기록을 모두 지웠어요";
      Sound.wrong();
      showRanking(null);
      setTimeout(() => { holdLabel.textContent = HOLD_TEXT; }, 2000);
    }, HOLD_MS);
  }
  function holdCancel() {
    if (!holdTimer) return;
    clearTimeout(holdTimer);
    holdTimer = null;
    el.clearBtn.classList.remove("holding");
    holdLabel.textContent = HOLD_TEXT;
  }
  el.clearBtn.addEventListener("pointerdown", holdStart);
  ["pointerup", "pointerleave", "pointercancel"].forEach((t) => el.clearBtn.addEventListener(t, holdCancel));
  el.clearBtn.addEventListener("contextmenu", (e) => e.preventDefault());

  // ---------- 효과음 ----------
  // 음원 파일 없이 Web Audio API로 소리를 만든다.
  // 아이패드는 사용자가 누른 순간에만 소리를 켤 수 있어, [시작하기]에서 unlock()을 부른다.
  const Sound = (() => {
    let ctx = null;
    let master = null;
    let on = store.get(KEY.sound, "on") !== "off";

    function unlock() {
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.5;
          master.connect(ctx.destination);
        }
        if (ctx.state !== "running") ctx.resume();
        // iOS: 무음 버퍼를 한 번 재생해 잠금을 확실히 푼다.
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(master);
        src.start(0);
      } catch { /* 소리 없이 진행 */ }
    }

    // 음 하나: 주파수(끝 주파수로 미끄러질 수 있음), 시작 시각, 길이, 파형, 크기
    function note(freq, at, dur, { type = "triangle", gain = 0.6, to = null, attack = 0.01 } = {}) {
      const t0 = ctx.currentTime + at;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    }

    function play(fn) {
      if (!on) return;
      if (!ctx) unlock();
      if (!ctx) return;
      if (ctx.state !== "running") ctx.resume();
      try { fn(); } catch { /* 무시 */ }
    }

    return {
      unlock,
      get on() { return on; },
      setOn(v) { on = v; store.set(KEY.sound, v ? "on" : "off"); if (v) unlock(); },
      // 정답: 따링~ 올라가는 밝은 세 음 (도-미-솔)
      correct: () => play(() => {
        note(1046.5, 0.00, 0.18, { gain: 0.5 });
        note(1318.5, 0.09, 0.18, { gain: 0.5 });
        note(1568.0, 0.18, 0.55, { gain: 0.55 });
        note(3136.0, 0.18, 0.4, { type: "sine", gain: 0.12 });
      }),
      // 오답: 뚜우웅 내려가는 낮은 음
      wrong: () => play(() => {
        note(220, 0, 0.6, { type: "sawtooth", gain: 0.25, to: 110, attack: 0.02 });
        note(110, 0, 0.6, { type: "square", gain: 0.12, to: 70, attack: 0.02 });
      }),
      // 탈출 성공: 짧은 팡파르
      success: () => play(() => {
        const seq = [[523.3, 0], [523.3, 0.14], [523.3, 0.28], [659.3, 0.42], [784, 0.62]];
        seq.forEach(([f, t]) => note(f, t, 0.2, { type: "square", gain: 0.22 }));
        [523.3, 659.3, 784, 1046.5].forEach((f) => note(f, 0.82, 1.1, { type: "triangle", gain: 0.3 }));
      }),
      // 탈출 실패: 아쉬운 짧은 멜로디 (내려가는 음)
      fail: () => play(() => {
        [[392, 0], [370, 0.35], [349.2, 0.7]].forEach(([f, t]) => note(f, t, 0.32, { type: "triangle", gain: 0.4 }));
        note(329.6, 1.05, 0.9, { type: "triangle", gain: 0.4, to: 300 });
      }),
    };
  })();

  function renderSoundBtn() {
    el.soundBtn.textContent = Sound.on ? "🔊" : "🔇";
    el.soundBtn.setAttribute("aria-pressed", String(Sound.on));
    el.soundBtn.setAttribute("aria-label", Sound.on ? "소리 끄기" : "소리 켜기");
  }
  // 소리 버튼을 눌러도 입력창 포커스(화면 키보드)는 그대로 둔다.
  el.soundBtn.addEventListener("pointerdown", (e) => e.preventDefault());
  el.soundBtn.addEventListener("click", () => { Sound.setOn(!Sound.on); renderSoundBtn(); });
  renderSoundBtn();

  // ---------- 시작 화면 ----------
  function renderStart() {
    const p = loadProgress();
    el.resumeBtn.hidden = !p;
    el.resumeInfo.hidden = !p;
    if (p) {
      const pScore = Math.max(0, START_SCORE - p.penalty);
      el.resumeInfo.textContent = `풀던 게임이 있어요: 문제 ${p.done.length + 1} / ${p.total} · ${pScore}점 · ${fmtTime(p.elapsedMs / 1000)}`;
      el.startBtn.textContent = "처음부터 시작하기";
    } else {
      el.startBtn.textContent = "시작하기";
    }
    showScreen("start");
  }

  function startNew() {
    Sound.unlock();
    lastResult = null;
    runningSince = null;
    newGame();
    enterQuiz();
  }

  el.startBtn.addEventListener("click", startNew);
  el.resumeBtn.addEventListener("click", () => {
    Sound.unlock();
    const p = loadProgress();
    if (!p) { startNew(); return; }
    game = p;
    runningSince = null;
    lastResult = null;
    enterQuiz();
  });
  el.rankBtn.addEventListener("click", () => { Sound.unlock(); showRanking(null); });

  // ---------- 오프라인 실행(서비스 워커) ----------
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* 오프라인 저장 없이 실행 */ });
    });
  }

  // ---------- 시작 ----------
  el.testBadge.hidden = !TEST_MODE;
  el.rankMode.hidden = !TEST_MODE;
  renderStart();
})();
