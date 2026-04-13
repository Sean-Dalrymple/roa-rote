const VERSION = "v1.0.12";

const CACHE_NAME = "rote-cache-" + VERSION;
const urlsToCache = [
  "./",
  "./index.html",
  "./css/rote_style.css",
  "./js/rote.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
  // Add any static data or JSON files here if desired
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => {
        console.log("Cache installed successfully");
      })
      .catch(err => console.error("Cache installation failed:", err))
  );
  self.skipWaiting();
});


// ACTIVATE
self.addEventListener("activate", event => {
  console.log("A new version of the app is available. Please refresh to update.");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== "unit-images" && k !== "avatar-images" && k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  
  self.clients.claim();

  // Notify all clients that a new version is ready
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: "NEW_VERSION", version: VERSION });
    });
  });
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

  //https://game-assets.swgoh.gg/textures/
  if (requestURL.hostname === "game-assets.swgoh.gg") {
    event.respondWith(
      caches.open("avatar-images").then(cache =>
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
