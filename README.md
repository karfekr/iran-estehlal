# iran-estehlal

A small, dependency-free implementation of the **Iranian Hijri lunar calendar**
("Estehlal" — Iran's Crescent Committee observation basis), with conversions
to and from the Gregorian calendar.

This package implements **only** the Iranian dataset. It does not implement,
bundle, or depend on Umm al-Qura or any other Hijri calendar system. If you
need dates outside the Iranian dataset's coverage, you plug in your own
month-length source through a single, minimal fallback function — this
package never chooses one for you.

- **Iranian dataset only.** No Umm al-Qura, no other tabular/arithmetic Hijri
  calendar is bundled or silently substituted.
- **Zero runtime dependencies.** All Gregorian date arithmetic is implemented
  internally with pure integer math — no `Date` object, no timezone or DST
  ambiguity, no other calendar library.
- **Fast, regardless of distance from the anchor.** Dataset-covered
  conversions are answered with a binary search over a precomputed table,
  not a month-by-month walk — a request for a date from 1962 costs the same
  as a request for a date from 2026.
- **TypeScript-first**, fully typed, tree-shakeable, and tiny.

## Install

```sh
npm install iran-estehlal
```

## Quick start

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

Create one instance and reuse it for the lifetime of your application —
it caches internal lookups and, if you provide a fallback, caches its
results too.

## The Iranian dataset, and what "unsupported" means

The Iranian Hijri month-length dataset (bundled in `IRAN_HIJRI_MONTHS`,
sourced from Iran's Crescent Committee data) currently covers Hijri years
1340 through 1448, with 1448 only known through its 10th month. That trailing
partial year is not padded out or guessed at — asking for a month beyond
what the dataset actually lists returns `null`, exactly as if that year
didn't appear in the dataset at all:

```ts
const calendar = createIranEstehlal();

calendar.getMonthLength(1448, 10); // 29  (last month the dataset knows)
calendar.getMonthLength(1448, 11); // null (not in the dataset, no fallback)
```

The Iranian dataset is always authoritative where it applies. It is never
overridden, and a fallback is never consulted for a month the dataset
already covers — even if the fallback would disagree.

## Extending coverage with a fallback

If you need dates outside the Iranian dataset, provide a fallback function
when you create the calendar. It answers exactly one question — "how many
days does Hijri month `(hy, hm)` have?" — and nothing else:

```ts
type MonthLengthFallback = (hy: number, hm: number) => 29 | 30 | null;
```

`iran-estehlal` doesn't know or care what backs your fallback. It could be
Umm al-Qura, another arithmetic Hijri calendar, a remote API, or a hand-
rolled table:

```ts
import { createIranEstehlal } from "iran-estehlal";
// Any Umm al-Qura implementation of your choosing - this package doesn't
// provide or depend on one.
import { getUmmAlQuraMonthLength } from "some-umm-al-qura-library";

const calendar = createIranEstehlal((hy, hm) => getUmmAlQuraMonthLength(hy, hm) ?? null);

calendar.getMonthLength(1500, 1); // whatever your fallback reports
calendar.hijriToGregorian(1500, 1, 1); // computed using the fallback's month lengths
```

The fallback is only ever asked about months the Iranian dataset doesn't
cover, and each answer is cached — your fallback will never be asked about
the same month twice from the same calendar instance. Returning `null` from
the fallback means "I don't know this month either," which `iran-estehlal`
treats the same as not having a fallback at all for that month (the overall
result is `null`, not an error).

Returning anything other than `29`, `30`, or `null` from a fallback is
treated as a programming error and throws — a fallback silently returning,
say, `31` would quietly corrupt every conversion downstream of it.

## API

### `createIranEstehlal(fallback?)`

Creates a calendar instance. `fallback` is optional; without one, any date
requiring month data outside the Iranian dataset resolves to `null`.

### `calendar.getMonthLength(hy, hm)`

Returns `29 | 30 | null`. Iranian dataset first, then the fallback (if any),
then `null`. Throws `RangeError` if `hm` isn't an integer from 1 to 12.

### `calendar.gregorianToHijri(gy, gm, gd)`

Returns the equivalent `{ hy, hm, hd }`, or `null` if it would require
month data neither the dataset nor the fallback can supply. Throws
`RangeError` for an invalid Gregorian date.

### `calendar.hijriToGregorian(hy, hm, hd)`

Returns the equivalent `{ gy, gm, gd }`, or `null` for the same reason as
above. Throws `RangeError` for an invalid Hijri month, a non-positive or
non-integer day, or a day that exceeds the actual length of that month
(e.g. day 30 of a 29-day month) — that is a genuinely invalid date, distinct
from a valid-but-unsupported one, and is never silently accepted.

## Design notes

**Efficient by construction, not by accident.** Internally, every Hijri
`(year, month)` is folded into one increasing integer key, and the Iranian
dataset's contiguous coverage around the anchor is turned into a prefix-sum
table once, at calendar-creation time. Both conversion directions then
resolve any date inside the dataset with a binary search over that table —
so a request for 1340 costs the same as a request for 2026, regardless of
how far either is from the anchor. Dates outside the dataset can only be
resolved by asking the fallback one month at a time (there's no closed form
for an arbitrary user-supplied function), so that path grows two small
caches on demand instead — cheap for nearby repeated requests, and it never
asks the fallback about the same month twice.

**A note on `core.ts` compatibility.** This package's dataset, anchor, and
conversion semantics were derived from `obsidian-persian-calendar`'s
`hijriUtils/core.ts`, and `gregorianToHijri` matches it exactly across
extensive fuzz testing. While building this package, a genuine bug turned
up in that file's `hijriIranToGregorian`, specifically in its forward
(post-anchor) branch: it sums the *full* length of the anchor's own month
instead of only the days remaining in it after the anchor's day-of-month,
which silently shifts every post-anchor, month-crossing conversion by
however many days that month runs past the anchor's day. Since the bundled
anchor sits on day 30 of a 30-day month, this bug happens not to fire for
same-month lookups, but does affect essentially every other forward,
month-crossing call - for instance, the original code returns `2026-04-19`
for Hijri `1447/10/01`, a full month off; the correct value, `2026-03-21`,
is confirmed independently both by direct day-counting and by that same
file's own (differently structured, unaffected) `gregorianToHijriIran`
function. `iran-estehlal` implements the mathematically correct conversion
rather than reproducing that specific bug; every other aspect of `core.ts`'s
observable behavior (the dataset, the anchor, `gregorianToHijri`, and
`hijriIranToGregorian`'s same-month and backward-branch results) is
preserved exactly.
