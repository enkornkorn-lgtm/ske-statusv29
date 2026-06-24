// firebase-messaging-sw.js
// Service Worker สำหรับรับ push notification ตอนแอปปิด/อยู่เบื้องหลัง
// ต้องวางไฟล์นี้ที่ root เดียวกับ index.html

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDE1EAH7Uf2cVOkguXW7vfObisEH3NMvh4",
  authDomain: "ske-status.firebaseapp.com",
  databaseURL: "https://ske-status-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ske-status",
  storageBucket: "ske-status.firebasestorage.app",
  messagingSenderId: "857120529855",
  appId: "1:857120529855:web:002cd6e5eed5c90f47d50a"
});

const messaging = firebase.messaging();

const SKE_ICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%231E90D6"/%3E%3Ctext x="50" y="65" text-anchor="middle" font-size="36" fill="white" font-family="Arial"%3ESKE%3C/text%3E%3C/svg%3E';

// รับข้อความตอนแอปปิด/เบื้องหลัง → เด้งขึ้นถาดระบบ
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const data = payload.data || {};
  self.registration.showNotification(n.title || '🔔 SKE TRUCK', {
    body: n.body || '',
    icon: n.icon || SKE_ICON,
    badge: SKE_ICON,
    vibrate: [200, 100, 200],
    tag: 'ske-status',
    renotify: true,
    data: data
  });
});

// กดที่ notification → เปิดแอป
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
