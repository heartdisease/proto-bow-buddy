// TODO cache these resources as well:
// 'https://fonts.googleapis.com/icon?family=Material+Icons',
// 'https://fonts.gstatic.com/s/materialicons/v43/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2'

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('proto-bow-buddy').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/main.bundle.js',
        '/main.css',
        '/site.webmanifest',
        '/icon.png',
        '/favicon.ico'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  console.log('Fetching resource: ' + event.request.url);

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        console.log('Use resource from cache. (' + event.request.url + ')');
        return response;
      }
      console.log('Cache miss, need to load resource from server. (' + event.request.url + ')');
      return fetch(event.request);
    })
  );
});
