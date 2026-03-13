# AL-BASEEM WhatsApp Server
## خادم الواتساب المجاني لنظام البسيم

---

## النشر على Koyeb (مجاني للأبد) ✅

### الخطوة 1: إنشاء حساب على Koyeb

1. اذهب إلى: https://app.koyeb.com/auth/signup
2. سجل حساب جديد (يمكنك استخدام GitHub)

### الخطوة 2: رفع المشروع إلى GitHub

```bash
# إنشاء repository جديد على GitHub
# ثم رفع الملفات:

cd /home/z/my-project/whatsapp-server

git init
git add .
git commit -m "Initial WhatsApp server"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/albaseem-whatsapp.git
git push -u origin main
```

### الخطوة 3: نشر على Koyeb

1. اذهب إلى: https://app.koyeb.com/
2. اضغط **"Create App"**
3. اختر **"GitHub"** كمصدر
4. اختر repository الذي أنشأته
5. اترك الإعدادات الافتراضية
6. اضغط **"Deploy"**

### الخطوة 4: الحصول على الرابط

بعد النشر، ستحصل على رابط مثل:
```
https://albaseem-whatsapp-XXXX.koyeb.app
```

هذا هو رابط خادم الواتساب!

---

## استخدام الخادم

### ربط الواتساب:
1. افتح الرابط في المتصفح
2. سيظهر QR Code
3. امسحه بواسطة تطبيق الواتساب على هاتفك
4. تم! ✅

### تغيير الحساب:
1. افتح الرابط في المتصفح
2. اضغط **"تسجيل الخروج"**
3. سيظهر QR Code جديد
4. امسح بالحساب الجديد

### في نظام البسيم:
- عند الضغط على "ربط حساب واتساب"
- أدخل رابط الخادم: `https://albaseem-whatsapp-XXXX.koyeb.app`

---

## API Endpoints

| Endpoint | Method | الوصف |
|----------|--------|-------|
| `/api/status` | GET | حالة الاتصال |
| `/api/qr` | GET | صورة QR Code |
| `/api/send-message` | POST | إرسال رسالة |
| `/api/logout` | POST | تسجيل الخروج |
| `/api/health` | GET | فحص الخادم |

---

## إرسال رسالة (API)

```javascript
// مثال JavaScript
const response = await fetch('https://YOUR_APP.koyeb.app/api/send-message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '9647701234567',
    message: 'مرحباً من نظام البسيم!'
  })
});
```

---

## ملاحظات مهمة

1. **مجاني للأبد** - Koyeb يوفر خطة مجانية دائمة
2. **لا ينام** - الخادم يعمل 24/7
3. **الجلسة** - تُحفظ حتى يتم تسجيل الخروج
4. **إعادة النشر** - إذا أعدت نشر المشروع، ستفقد الجلسة

---

## المشاكل والحلول

### QR Code لا يظهر
- انتظر 30-60 ثانية لتهيئة الخادم
- حددث الصفحة

### انقطع الاتصال
- افتح رابط الخادم
- اضغط "إعادة الاتصال"

### فشل الإرسال
- تأكد من أن الواتساب متصل (الحالة خضراء)
- تأكد من صحة رقم الهاتف

---

## الدعم

- واتساب: +9647762788088
- Instagram: @9.CAS
