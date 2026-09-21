/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ revision: string | null; url: string }>;
};

const worker = self;
precacheAndRoute(self.__WB_MANIFEST);

// The case file is a client-side TanStack Router route. Serve the precached
// app shell for document navigations while leaving API requests to the network.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"),
    {
      allowlist: [/^\/$/, /^\/(?:case|report|review)(?:\/|$)/],
      denylist: [/^\/api\//, /^\/trpc\//],
    },
  ),
);

clientsClaim();

worker.addEventListener("sync", (event) => {
  const syncEvent = event as Event & { tag?: string; waitUntil(promise: Promise<unknown>): void };
  if (syncEvent.tag !== "collective-report-sync") return;
  syncEvent.waitUntil(
    worker.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) client.postMessage({ type: "collective-report-sync" });
    }),
  );
});

worker.addEventListener("message", (event) => {
  if (event.data?.type === "collective-report-sync") void worker.skipWaiting();
});
