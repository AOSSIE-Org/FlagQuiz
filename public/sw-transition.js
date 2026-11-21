/**
 * Imported by the service worker. Versions of Flag Quiz up to November 2026
 * updated themselves silently, and their pages have no "new version" button.
 * A service worker that waits for that button would wait for ever behind such
 * a page, so the first waiting-style worker installed over an old one
 * activates at once; later updates wait for the button.
 */
const MARKER = 'flag-quiz-update-mode';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.has(MARKER).then((known) => {
      if (!known && self.registration.active) self.skipWaiting();
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.open(MARKER));
});
