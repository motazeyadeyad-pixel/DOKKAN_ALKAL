// Service Worker - دكان الخال
// يخزّن ملفات الواجهة فقط. بيانات Firebase والصور والطلبات دايماً من النت.
const CACHE_NAME = "dukkan-shell-v3";
const SHELL = ["./", "./index.html", "./style.css", "./script.js", "./product3d.js", "./manifest.json",
               "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // Firebase / Cloudinary / Telegram: مباشرة من النت

    // النت أولاً (عشان التحديثات توصل فوراً)، والنسخة المخزنة إذا ما في نت
    e.respondWith(
        fetch(req).then((res) => {
            const path = "." + url.pathname.replace(/^.*\/(?=[^/]*$)/, "/");
            if (res.ok && SHELL.some((s) => s.endsWith(url.pathname.split("/").pop()) && s !== "./")) {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            }
            return res;
        }).catch(() =>
            caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
        )
    );
});
