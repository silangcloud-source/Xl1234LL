const APP_CACHE  = 'finread-app-v4';
const FONT_CACHE = 'finread-fonts-v1';

// Never intercept these — always live requests
const BYPASS = [
  'openrouter.ai', 'anthropic.com', 'deepseek.com', 'openai.com',
  'allorigins.win', 'corsproxy.io', 'rsshub', 'jin10',
];

// 接收主页面发来的跳过等待指令
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', e => {
  // 不在 install 里 skipWaiting，由主页面触发，避免打断用户操作
  e.waitUntil(
    caches.open(APP_CACHE)
      .then(c => c.add('./finread-v5.html'))
      .catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== APP_CACHE && k !== FONT_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = request.url;

  // Pass through API / proxy calls
  if (BYPASS.some(h => url.includes(h))) return;

  // Fonts: cache-first (they never change)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        if (res.ok) caches.open(FONT_CACHE).then(c => c.put(request, res.clone()));
        return res;
      }))
    );
    return;
  }

  // App shell + CDN: network-first so updates land automatically,
  // cache as fallback for offline use
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) caches.open(APP_CACHE).then(c => c.put(request, res.clone()));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
