// Service Worker - دكان الخال
// استراتيجية "الشبكة أولاً": دايماً بيجيب أحدث نسخة من الإنترنت،
// والنسخة المخزنة بتنستخدم بس لو ما في إنترنت. هيك التعديلات بتوصل فوراً بدون مشاكل كاش.

const CACHE_NAME = "dokan-v1";
const SHELL = ["./", "./index.html", "./style.css", "./script.js", "./icons/icon-192.png"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL))
            .catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // نتعامل بس مع طلبات GET من نفس الموقع (Firebase / Cloudinary / الخطوط تمر مباشرة)
    if (req.method !== "GET" || url.origin !== self.location.origin) return;

    // لوحات الإدارة وتتبع الطلبات ما بتنخزن أبداً
    if (url.pathname.includes("admin") || url.pathname.includes("orders-status")) return;

    event.respondWith(
        fetch(req)
            .then((res) => {
                if (res && res.status === 200) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                }
                return res;
            })
            .catch(() =>
                caches.match(req).then((cached) => cached || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
            )
    );
});
