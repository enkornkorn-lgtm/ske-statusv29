/* Service Worker — สถานะรถ SKE
   ทำให้การแจ้งเตือนเด้งขึ้นถาดแจ้งเตือนของระบบ (system tray) พร้อมสั่นได้
   แม้ผู้ใช้สลับไปแอพอื่น/จอดับ ตราบใดที่แอพยังรันอยู่เบื้องหลัง
   (หมายเหตุ: นี่คือ background notification แบบไม่ใช้เซิร์ฟเวอร์ — ใช้ได้ฟรี
    ข้อจำกัด: ถ้าผู้ใช้ปิดแอพสนิทจริงๆ จะไม่เด้ง เพราะไม่มี push จากเซิร์ฟเวอร์) */

const SW_VERSION = 'ske-sw-v1';

self.addEventListener('install', (event) => {
  // เปิดใช้ SW เวอร์ชันใหม่ทันที ไม่ต้องรอปิดแท็บเก่า
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // เข้าควบคุมทุกหน้าที่เปิดอยู่ทันที
  event.waitUntil(self.clients.claim());
});

// เมื่อผู้ใช้แตะการแจ้งเตือน → เปิด/โฟกัสแอพ
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // ถ้าแอพเปิดอยู่แล้ว → โฟกัสหน้าต่างนั้น
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      // ถ้าไม่ได้เปิดอยู่ → เปิดหน้าแอพใหม่
      if (self.clients.openWindow) return self.clients.openWindow('.');
    })
  );
});

// รับคำสั่งจากหน้าเว็บให้แสดงการแจ้งเตือนผ่าน SW (เด้งขึ้น system tray ได้แม้อยู่เบื้องหลัง)
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = data;
    self.registration.showNotification(title, options || {});
  }
});
