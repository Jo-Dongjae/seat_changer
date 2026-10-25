// 랜덤 자리 뽑기 - 오프라인 캐시용 서비스 워커
// 앱 파일을 고쳐서 다시 올릴 때는 아래 버전 숫자를 올려 주세요.
const VERSION = 'v11';
const APP_CACHE = 'seat-picker-app-' + VERSION;
const FONT_CACHE = 'seat-picker-fonts';
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(APP_CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== APP_CACHE && k !== FONT_CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // 글꼴: 한 번 받으면 저장해 두었다가 인터넷이 없어도 쓰고, 연결되면 새로 받아 둡니다.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(function (cache) {
      return cache.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }

  // 앱 파일: 저장된 것을 먼저 쓰고, 없으면 받아 옵니다.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(APP_CACHE).then(function (c) { c.put(req, copy); });
          return res;
        }).catch(function () { return caches.match('index.html'); });
      })
    );
  }
});
