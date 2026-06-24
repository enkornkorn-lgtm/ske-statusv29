// ─────────────────────────────────────────────
//  SKE TRUCK — Service Worker  (sw.js)
//  วางไว้ในโฟลเดอร์เดียวกับ index.html
// ─────────────────────────────────────────────

const CACHE_NAME = 'ske-truck-v1';

// ── Install: activate ทันที ──────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
});

// ── Activate: เข้าควบคุม client ทันที ────────
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// ── Fetch: pass-through (ไม่ cache ซับซ้อน) ──
self.addEventListener('fetch', event => {
  // ให้ browser จัดการเองตามปกติ
});

// ── Notification Click ────────────────────────
// เมื่อผู้ใช้กดที่การแจ้งเตือน → เปิดหน้าแอพ
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // ถ้ามีแท็บเปิดอยู่แล้ว → focus แท็บนั้น
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // ถ้าไม่มีแท็บเลย → เปิดหน้าใหม่
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});

// ── Notification Close ────────────────────────
self.addEventListener('notificationclose', event => {
  // ปิดแจ้งเตือนโดยไม่กด — ไม่ต้องทำอะไร
});

// ── Push (สำหรับรองรับ Web Push ในอนาคต) ────
self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: event.data.text() }; }

  const title   = data.title  || '🔔 SKE TRUCK';
  const options = {
    body:              data.body    || '',
    icon:              data.icon    || './icon-192.png',
    badge:             data.badge   || './icon-192.png',
    vibrate:           data.vibrate || [200, 100, 200],
    tag:               data.tag     || 'ske-alert',
    renotify:          true,
    requireInteraction: false,
    data:              data.data    || {}
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
