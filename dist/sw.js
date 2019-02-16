self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('proto-bow-buddy').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/main.bundle.js',
        '/main.css',
        'https://fonts.googleapis.com/icon?family=Material+Icons',
        'https://fonts.gstatic.com/s/materialicons/v43/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  console.log('Fetching ' + event.request.url);

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
