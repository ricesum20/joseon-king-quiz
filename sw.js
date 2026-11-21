/* 조선의 왕 퀴즈 — 서비스 워커 (오프라인 실행)
 * 파일을 고쳤으면 CACHE_VERSION 숫자를 올려야 태블릿이 새 파일을 받는다.
 */
const CACHE_VERSION = "jkq-v1";
const FONT_CACHE = "jkq-fonts";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./questions.js",
  "./manifest.json",
  "./images/bg-palace.webp",
  "./images/bg-escape.webp",
  "./images/king.png",
  "./images/seal.png",
  "./images/icon-192.png",
  "./images/icon-512.png",
  "./images/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => Promise.all(APP_FILES.map((url) =>
        // 이미지 하나가 없어도 설치가 실패하지 않게 하나씩 담는다.
        cache.add(new Request(url, { cache: "reload" })).catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k !== CACHE_VERSION && k !== FONT_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 웹폰트: 한 번 받아 두고 다음부터는 저장본을 쓴다(뒤에서 새로 받아 갱신).
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
          if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 페이지 열기(?test=1 포함): 저장된 index.html을 먼저, 없으면 네트워크
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html", { ignoreSearch: true })
        .then((cached) => cached || fetch(req))
        .catch(() => caches.match("./"))
    );
    return;
  }

  // 나머지 파일: 저장본 우선, 없으면 받아서 저장
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
