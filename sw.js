const CACHE_NAME = 'mp3-player-shell-v1';
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
  // （音樂檔案大，且金鑰/內容可能變動，快取沒有意義反而占空間）
  if (url.includes('googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 介面外殼檔案：先看快取，沒有再去網路抓
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
