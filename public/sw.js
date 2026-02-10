const VERSION = "v1.0.13";

const CACHE_NAME = "rote-cache-v2";
const urlsToCache = [
  "./",
  "./index.html",
  "./css/rote_style.css",
  "./js/rote.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
  // Add any static data or JSON files here if desired
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  const requestURL = new URL(event.request.url);

  // Check if the request is for a unit image
  if (requestURL.hostname === "d1bmdfhj2yn3u7.cloudfront.net") {
    event.respondWith(
      caches.open("unit-images").then(cache =>
        cache.match(event.request).then(response => {
          if (response) return response;
          return fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
      )
    );
    return;
  }

  // Default behavior for everything else
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    )
  );
});