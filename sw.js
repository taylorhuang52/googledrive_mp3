const CACHE_NAME = 'mp3-player-shell-v2';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安裝時快取播放器介面本身（外殼），方便離線打開 App
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// 啟用時清掉舊版快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 音樂檔案 / Google Drive API 請求一律走網路，不要快取
  if (url.includes('googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // index.html 用 network-first：每次都先試著抓最新版本，
  // 只有在離線（網路抓取失敗）時才退回快取版本。
  // 這樣你更新 index.html 上傳後，使用者不需要重新安裝 App。
  if (url.endsWith('index.html') || url.endsWith('/') ) {
    event.respondWith(
      fetch(event.request).then((response) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 其他外殼檔案（圖示、manifest）：先看快取，沒有再去網路抓
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    }).catch(() => caches.match('./index.html'))
  );
});
