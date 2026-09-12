<div dir="ltr" align="center">

[**فارسی**](README_FA.md) / [**English**](README.md)

</div>

<div dir="rtl">

# پکیج iran-estehlal

* **فقط داده‌های تقویم ایران.** هیچ داده‌ای از ام‌القری یا دیگر تقویم‌های هجری جدولی/محاسباتی در پکیج قرار نگرفته و به‌صورت ضمنی جایگزین نمی‌شود.
* **بدون هیچ وابستگی زمان اجرا.** تمام محاسبات تاریخ میلادی به‌صورت داخلی و با محاسبات صحیح انجام می‌شوند؛ بدون استفاده از شیء `Date`، بدون ابهام ناشی از منطقهٔ زمانی یا تغییر ساعت تابستانی (DST)، و بدون وابستگی به کتابخانهٔ دیگری برای تقویم.
* **سرعت مستقل از فاصله تا نقطهٔ مرجع.** تبدیل تاریخ‌هایی که در محدودهٔ داده‌ها قرار دارند با جست‌وجوی دودویی روی یک جدول ازپیش‌محاسبه‌شده انجام می‌شود، نه با پیمایش ماه‌به‌ماه. بنابراین درخواست تاریخ سال ۱۹۶۲ به‌اندازهٔ درخواست تاریخ سال ۲۰۲۶ زمان می‌برد.

## نصب

<div dir="ltr">

```sh
npm install iran-estehlal
```

</div>

## شروع سریع

<div dir="ltr">

```ts
import { createIranEstehlal } from "iran-estehlal";

const calendar = createIranEstehlal();

calendar.gregorianToHijri(2026, 3, 20);
// { hy: 1447, hm: 9, hd: 30 }

calendar.hijriToGregorian(1447, 9, 30);
// { gy: 2026, gm: 3, gd: 20 }

calendar.getMonthLength(1447, 9);
// 30
```

</div>
## داده‌های تقویم ایران و مفهوم «پشتیبانی‌نشده»

مجموعه‌دادهٔ طول ماه‌های هجری ایران (که در `IRAN_HIJRI_MONTHS` قرار دارد و از داده‌های ستاد استهلال ایران تهیه شده است) در حال حاضر سال‌های هجری **۱۳۴۰ تا سال جاری قمری** را پوشش می‌دهد.

این سال ناقص در انتهای داده‌ها نه با مقدار فرضی تکمیل شده و نه چیزی برای ماه‌های باقی‌مانده حدس زده می‌شود. اگر ماهی فراتر از اطلاعات موجود درخواست شود، مقدار `null` برگردانده می‌شود؛ دقیقاً همان‌طور که گویی آن سال اصلاً در داده‌ها وجود نداشته است:

<div dir="ltr">

```ts
const calendar = createIranEstehlal();

calendar.getMonthLength(1600, 11);
// null
```

</div>

## گسترش محدودهٔ پوشش با fallback

اگر به تاریخ‌هایی خارج از محدودهٔ داده‌های تقویم ایران نیاز دارید، هنگام ایجاد تقویم می‌توانید یک تابع fallback ارائه کنید. این تابع فقط به یک سؤال پاسخ می‌دهد: «ماه هجری `(hy, hm)` چند روز دارد؟»

پکیج `iran-estehlal` اهمیتی نمی‌دهد fallback شما بر چه چیزی متکی است. می‌تواند یک کتابخانهٔ تقویمی دیگر، یک API آنلاین یا حتی یک جدول دست‌ساز باشد.

برای مثال، می‌توانید از پکیج [`@internationalized/date`](https://react-spectrum.adobe.com/internationalized/date/) استفاده کنید:

<div dir="ltr">

```ts
import { createIranEstehlal } from "iran-estehlal";
import { CalendarDate, createCalendar } from "@internationalized/date";

const umalqura = createCalendar("islamic-umalqura");

function getUmmAlQuraMonthLength(hy: number, hm: number): 29 | 30 {
  const date = new CalendarDate(umalqura, hy, hm, 1);

  return umalqura.getDaysInMonth(date) as 29 | 30;
}

const calendar = createIranEstehlal(getUmmAlQuraMonthLength);
```

</div>

دقت داشته باشید که fallback فقط برای ماه‌هایی استفاده می‌شود که داده‌های تقویم ایران آن‌ها را پوشش نمی‌دهند و هر نتیجه نیز cache می‌شود.

با توجه به اینکه در تقویم‌های قمریِ مبتنی بر هلالِ ماه، ماه‌های `۲۸` یا `۳۱` روزه وجود ندارند.
اگر fallback مقداری غیر از `29`، `30` یا `null` برگرداند، این وضعیت به‌عنوان یک خطای برنامه‌نویسی در نظر گرفته شده و exception پرتاب می‌شود.

## جزئیات

### `calendar.getMonthLength(hy, hm)`

طول ماه را به‌صورت `29 | 30 | null` برمی‌گرداند.

ترتیب بررسی:

1. داده‌های تقویم ایران
2. در صورت وجود با fallback

اگر `hm` یک عدد صحیح بین ۱ تا ۱۲ نباشد، `RangeError` خواهید گرفت.

### `calendar.gregorianToHijri(gy, gm, gd)`

تاریخ میلادی را به تاریخ هجری قمری ستاد استهلالِ ایران تبدیل می‌کند و مقدار `{ hy, hm, hd }` را برمی‌گرداند.

در صورت نامعتبر بودن تاریخ میلادی، `RangeError` خواهید گرفت.

### `calendar.hijriToGregorian(hy, hm, hd)`

تاریخ هجری را به تاریخ میلادی تبدیل می‌کند و مقدار `{ gy, gm, gd }` را برمی‌گرداند.

در موارد زیر `RangeError` خواهید گرفت:

* ماه هجری نامعتبر باشد؛
* روز صفر یا منفی باشد؛
* روز عدد صحیح نباشد؛
* روز از طول واقعی آن ماه بیشتر باشد.

برای مثال، روز ۳۰ یک ماه ۲۹روزه یک تاریخ **واقعاً نامعتبر** است و با یک تاریخ معتبر اما خارج از محدودهٔ داده‌ها تفاوت دارد. چنین تاریخی هرگز بی‌سروصدا پذیرفته نمی‌شود.

## 🤝 مشارکت و حمایت

شما می‌توانید از ادامه‌ی توسعه‌ی این پروژه با روش‌های زیر حمایت کنید:

- مشارکت مستقیم در توسعه‌ی پروژه
- گزارش باگ‌ها یا پیشنهاد قابلیت‌های جدید
- دنبال کردن وب‌سایت و کانال‌های تلگرام کرفکر

<div align=center>

[![Website](https://img.shields.io/badge/Website-karfekr.ir-orange)](https://karfekr.ir)
[![Telegram Channel](https://img.shields.io/endpoint?color=neon&label=Karfekr&style=flat-square&url=https%3A%2F%2Ftg.sumanjay.workers.dev%2Fkarfekr)](https://t.me/karfekr)

</div>

</div>
