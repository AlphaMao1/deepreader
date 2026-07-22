const CACHE_NAME = "deepreader-web-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.webmanifest", "/icons/icon.svg"];
const CACHEABLE_DESTINATIONS = new Set(["document", "font", "image", "manifest", "script", "style", "worker"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode !== "navigate" && !CACHEABLE_DESTINATIONS.has(request.destination)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response.ok) {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match("/"))),
  );
});
