// TODO cache these resources as well:
// 'https://fonts.googleapis.com/icon?family=Material+Icons',
// 'https://fonts.gstatic.com/s/materialicons/v43/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2'

async function serveResource(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const response = await caches.match(request);

    if (response) {
      console.log('Could not load resource from server, use resource from cache. (' + request.url + ')');
      return response;
    }
    throw new Error('Resource ' + request.url + ' could not be loaded!');
  }
}

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
  event.respondWith(serveResource(event.request));
});
