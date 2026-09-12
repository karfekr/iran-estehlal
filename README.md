<div dir="ltr" align="center">

[**فارسی**](README_FA.md) / [**English**](README.md)

</div>

# iran-estehlal

* ****Iranian calendar data only.**** No data from Umm al-Qura or any other tabular/calculated Islamic calendars is included in the package or implicitly substituted.

* ****Zero runtime dependencies.**** All Gregorian date calculations are performed internally using exact arithmetic; without using the `Date` object, without timezone or daylight saving time (DST) ambiguity, and without relying on another calendar library.

* ****Performance independent of the distance from the reference point.**** Dates within the data range are converted using binary search over a precomputed table rather than month-by-month iteration. Therefore, converting a date in 1962 takes roughly the same amount of time as converting a date in 2026.

## Installation

```sh
npm install iran-estehlal
```

## Quick Start

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

## Iranian Calendar Data and the Meaning of "Unsupported"

The Iranian Hijri month-length dataset (stored in `IRAN_HIJRI_MONTHS` and derived from data provided by Iran's Hilal Observation Committee) currently covers Hijri years ****1340 through the current Hijri year****.

The incomplete year at the end of the dataset is neither filled with assumed values nor are the remaining months guessed. If a month beyond the available data is requested, `null` is returned, exactly as if that year did not exist in the dataset at all:

```ts
const calendar = createIranEstehlal();

calendar.getMonthLength(1600, 11);

// null
```

## Extending Coverage with a Fallback

If you need to work with dates outside the range covered by the Iranian calendar data, you can provide a fallback function when creating the calendar. This function only needs to answer one question: "How many days are in the Hijri month `(hy, hm)`?"

The `iran-estehlal` package does not care what your fallback is based on. It can use another calendar library, an online API, or even a manually created table.

For example, you can use [`@internationalized/date`](https://react-spectrum.adobe.com/internationalized/date/):

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

Note that the fallback is only used for months not covered by the Iranian calendar data, and each result is cached.

Since lunar calendars based on the observation of the new moon do not have months with `28` or `31` days.

If the fallback returns anything other than `29`, `30`, or `null`, this is considered a programming error and an exception is thrown.

## Details

### `calendar.getMonthLength(hy, hm)`

Returns the length of the month as `29 | 30 | null`.

Lookup order:

1. Iranian calendar data
2. Fallback, if provided

If `hm` is not an integer between 1 and 12, a `RangeError` is thrown.

### `calendar.gregorianToHijri(gy, gm, gd)`

Converts a Gregorian date to the Iranian Hilal Observation Committee's Hijri calendar and returns `{ hy, hm, hd }`.

A `RangeError` is thrown if the Gregorian date is invalid.

### `calendar.hijriToGregorian(hy, hm, hd)`

Converts a Hijri date to a Gregorian date and returns `{ gy, gm, gd }`.

A `RangeError` is thrown if:

* the Hijri month is invalid;
* the day is zero or negative;
* the day is not an integer;
* the day exceeds the actual length of the month.

For example, day 30 of a 29-day month is a ****genuinely invalid date**** and is different from a valid date that simply falls outside the available data range. Such a date is never silently accepted.

## 🤝 Contributing and Supporting

You can support the continued development of this project in the following ways:

* Contribute directly to the project
* Report bugs or suggest new features
* Follow the Karfekr website and Telegram channels


<div align=center>

[![Website](https://img.shields.io/badge/Website-karfekr.ir-orange)](https://karfekr.ir)
[![Telegram Channel](https://img.shields.io/endpoint?color=neon&label=Karfekr&style=flat-square&url=https%3A%2F%2Ftg.sumanjay.workers.dev%2Fkarfekr)](https://t.me/karfekr)

</div>

