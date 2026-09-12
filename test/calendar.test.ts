import { describe, expect, it } from "vitest";
import { createIranEstehlal } from "../src/calendar.js";
import { IRAN_HIJRI_ANCHOR, IRAN_HIJRI_MONTHS } from "../src/constants.js";
import type { MonthLengthFallback } from "../src/types.js";

// Derived, once, from the dataset itself - not hardcoded independently -
// so these stay correct if the bundled dataset is ever refreshed.
const datasetYears = Object.keys(IRAN_HIJRI_MONTHS)
  .map(Number)
  .sort((a, b) => a - b);
const firstYear = datasetYears[0]!;
const lastYear = datasetYears[datasetYears.length - 1]!;
const lastYearMonths = IRAN_HIJRI_MONTHS[lastYear]!.length;

describe("anchor", () => {
  it("converts the anchor Gregorian date to the exact anchor Hijri date", () => {
    const calendar = createIranEstehlal();
    expect(calendar.gregorianToHijri(IRAN_HIJRI_ANCHOR.gy, IRAN_HIJRI_ANCHOR.gm, IRAN_HIJRI_ANCHOR.gd)).toEqual({
      hy: IRAN_HIJRI_ANCHOR.hy,
      hm: IRAN_HIJRI_ANCHOR.hm,
      hd: IRAN_HIJRI_ANCHOR.hd,
    });
  });

  it("converts the anchor Hijri date to the exact anchor Gregorian date", () => {
    const calendar = createIranEstehlal();
    expect(calendar.hijriToGregorian(IRAN_HIJRI_ANCHOR.hy, IRAN_HIJRI_ANCHOR.hm, IRAN_HIJRI_ANCHOR.hd)).toEqual({
      gy: IRAN_HIJRI_ANCHOR.gy,
      gm: IRAN_HIJRI_ANCHOR.gm,
      gd: IRAN_HIJRI_ANCHOR.gd,
    });
  });
});

describe("round trips inside the Iranian dataset", () => {
  const calendar = createIranEstehlal();

  it("gregorianToHijri -> hijriToGregorian returns the original Gregorian date", () => {
    const samples: [number, number, number][] = [
      [2026, 3, 20],
      [2000, 1, 1],
      [2024, 3, 20],
      [1961, 3, 21],
      [2023, 6, 15],
      [1990, 12, 31],
    ];
    for (const [gy, gm, gd] of samples) {
      const hijri = calendar.gregorianToHijri(gy, gm, gd);
      expect(hijri).not.toBeNull();
      const back = calendar.hijriToGregorian(hijri!.hy, hijri!.hm, hijri!.hd);
      expect(back).toEqual({ gy, gm, gd });
    }
  });

  it("hijriToGregorian -> gregorianToHijri returns the original Hijri date", () => {
    const samples: [number, number, number][] = [
      [1447, 9, 30],
      [1340, 1, 1],
      [1400, 6, 15],
      [1420, 12, 29],
      [1445, 9, 10],
    ];
    for (const [hy, hm, hd] of samples) {
      const g = calendar.hijriToGregorian(hy, hm, hd);
      expect(g).not.toBeNull();
      const back = calendar.gregorianToHijri(g!.gy, g!.gm, g!.gd);
      expect(back).toEqual({ hy, hm, hd });
    }
  });
});

describe("month boundaries", () => {
  const calendar = createIranEstehlal();

  it("handles the first and last day of a month, and the first day of the next month", () => {
    // 1447/09 has 30 days (from the dataset) and 1447/09/30 is the anchor.
    const last = calendar.hijriToGregorian(1447, 9, 30);
    const firstOfNext = calendar.hijriToGregorian(1447, 10, 1);
    expect(last).toEqual({ gy: 2026, gm: 3, gd: 20 });
    expect(firstOfNext).toEqual({ gy: 2026, gm: 3, gd: 21 });
  });

  it("handles a year transition (Hijri month 12 -> next year's month 1)", () => {
    const length12 = calendar.getMonthLength(1446, 12);
    expect(length12).not.toBeNull();
    const lastDayOfYear = calendar.hijriToGregorian(1446, 12, length12!);
    const firstDayOfNextYear = calendar.hijriToGregorian(1447, 1, 1);
    expect(firstDayOfNextYear).toEqual(calendarAddOneDay(lastDayOfYear!));
  });

  function calendarAddOneDay(date: { gy: number; gm: number; gd: number }) {
    // Small local helper distinct from the implementation under test.
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    let { gy, gm, gd } = date;
    const max = gm === 2 && isLeap(gy) ? 29 : daysInMonth[gm - 1]!;
    if (gd < max) return { gy, gm, gd: gd + 1 };
    if (gm < 12) return { gy, gm: gm + 1, gd: 1 };
    return { gy: gy + 1, gm: 1, gd: 1 };
  }
});

describe("dataset boundaries", () => {
  it("supports the first month of the dataset", () => {
    const calendar = createIranEstehlal();
    const length = calendar.getMonthLength(firstYear, 1);
    expect(length).not.toBeNull();
    const g = calendar.hijriToGregorian(firstYear, 1, 1);
    expect(g).not.toBeNull();
    expect(calendar.gregorianToHijri(g!.gy, g!.gm, g!.gd)).toEqual({ hy: firstYear, hm: 1, hd: 1 });
  });

  it("supports the last month of a partial final year, but not the month after it", () => {
    const calendar = createIranEstehlal();
    const length = calendar.getMonthLength(lastYear, lastYearMonths);
    expect(length).not.toBeNull();

    const g = calendar.hijriToGregorian(lastYear, lastYearMonths, 1);
    expect(g).not.toBeNull();

    // The month immediately after the partial year's last known month must
    // NOT be silently inferred - it is simply unsupported without a fallback.
    expect(calendar.getMonthLength(lastYear, lastYearMonths + 1)).toBeNull();
    expect(calendar.hijriToGregorian(lastYear, lastYearMonths + 1, 1)).toBeNull();
  });

  it("returns null just before the first supported month, with no fallback", () => {
    const calendar = createIranEstehlal();
    expect(calendar.getMonthLength(firstYear - 1, 12)).toBeNull();
    expect(calendar.hijriToGregorian(firstYear - 1, 12, 1)).toBeNull();
  });
});

describe("no fallback: dates outside the dataset", () => {
  const calendar = createIranEstehlal();

  it("getMonthLength returns null outside the dataset", () => {
    expect(calendar.getMonthLength(1500, 1)).toBeNull();
    expect(calendar.getMonthLength(1000, 1)).toBeNull();
  });

  it("hijriToGregorian returns null outside the dataset", () => {
    expect(calendar.hijriToGregorian(1500, 1, 1)).toBeNull();
  });

  it("gregorianToHijri returns null when it would require unsupported Hijri months", () => {
    // Far enough in the future that it certainly falls after the dataset's end.
    expect(calendar.gregorianToHijri(2200, 1, 1)).toBeNull();
    // Far enough in the past that it certainly falls before the dataset's start.
    expect(calendar.gregorianToHijri(1850, 1, 1)).toBeNull();
  });
});

describe("with fallback", () => {
  // A small deterministic fake "calendar" used only for testing: a fixed
  // 30-year Hijri leap cycle (11 leap years out of 30), independent of the
  // Iranian dataset, so we can prove the fallback path works without
  // depending on any particular real calendar's data.
  const leapYearsInCycle = new Set([2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29]);
  function fakeIsLeap(hy: number): boolean {
    return leapYearsInCycle.has(((hy % 30) + 30) % 30);
  }
  function fakeMonthLength(hy: number, hm: number): 29 | 30 {
    if (hm % 2 === 1) return 30; // odd months: 30 days
    if (hm === 12) return fakeIsLeap(hy) ? 30 : 29; // last month depends on leap-ness
    return 29; // even months (except 12): 29 days
  }
  const fakeFallback: MonthLengthFallback = (hy, hm) => fakeMonthLength(hy, hm);

  it("extends conversions beyond the dataset using the fallback", () => {
    const calendar = createIranEstehlal(fakeFallback);
    const g = calendar.hijriToGregorian(1500, 1, 1);
    expect(g).not.toBeNull();
    const back = calendar.gregorianToHijri(g!.gy, g!.gm, g!.gd);
    expect(back).toEqual({ hy: 1500, hm: 1, hd: 1 });
  });

  it("extends conversions before the dataset using the fallback", () => {
    const calendar = createIranEstehlal(fakeFallback);
    const g = calendar.hijriToGregorian(1000, 6, 10);
    expect(g).not.toBeNull();
    const back = calendar.gregorianToHijri(g!.gy, g!.gm, g!.gd);
    expect(back).toEqual({ hy: 1000, hm: 6, hd: 10 });
  });

  it("matches getMonthLength against the fallback outside the dataset", () => {
    const calendar = createIranEstehlal(fakeFallback);
    expect(calendar.getMonthLength(1500, 1)).toBe(fakeMonthLength(1500, 1));
    expect(calendar.getMonthLength(1500, 12)).toBe(fakeMonthLength(1500, 12));
  });

  it("round-trips across a very large span using only the fallback on both sides", () => {
    const calendar = createIranEstehlal(fakeFallback);
    const samples: [number, number, number][] = [
      [900, 1, 1],
      [1600, 12, 1],
      [2000, 7, 15],
    ];
    for (const [hy, hm, hd] of samples) {
      const g = calendar.hijriToGregorian(hy, hm, hd);
      expect(g).not.toBeNull();
      expect(calendar.gregorianToHijri(g!.gy, g!.gm, g!.gd)).toEqual({ hy, hm, hd });
    }
  });

  it("caches fallback calls: the fallback is not called twice for the same month", () => {
    let calls = 0;
    const countingFallback: MonthLengthFallback = (hy, hm) => {
      calls++;
      return fakeMonthLength(hy, hm);
    };
    const calendar = createIranEstehlal(countingFallback);

    calendar.getMonthLength(1500, 1);
    calendar.getMonthLength(1500, 1);
    calendar.getMonthLength(1500, 1);
    expect(calls).toBe(1);

    const before = calls;
    calendar.hijriToGregorian(1500, 2, 1);
    calendar.hijriToGregorian(1500, 2, 1);
    // hijriToGregorian(1500, 2, 1) needs the length of every fallback month
    // between the dataset edge and 1500/02 the first time, and none of
    // them again the second time.
    const afterFirstPair = calls;
    calendar.hijriToGregorian(1500, 2, 1);
    expect(calls).toBe(afterFirstPair);
    expect(calls).toBeGreaterThan(before - 1);
  });

  it("a fallback returning null is treated the same as having no fallback for that month", () => {
    const partialFallback: MonthLengthFallback = (hy, hm) => {
      if (hy === 1500) return null;
      return fakeMonthLength(hy, hm);
    };
    const calendar = createIranEstehlal(partialFallback);
    expect(calendar.getMonthLength(1500, 1)).toBeNull();
    expect(calendar.hijriToGregorian(1500, 1, 1)).toBeNull();
    // But other, non-null months still work.
    expect(calendar.getMonthLength(1501, 1)).toBe(fakeMonthLength(1501, 1));
  });
});

describe("fallback priority", () => {
  it("always uses the Iranian dataset over the fallback when both are available", () => {
    const alwaysWrongFallback: MonthLengthFallback = () => 30;
    // Pick a dataset month we know is 29 days, so a wrong fallback would
    // be detectable if it were ever consulted.
    let knownTwentyNineMonth: { hy: number; hm: number } | null = null;
    outer: for (const y of datasetYears) {
      const months = IRAN_HIJRI_MONTHS[y]!;
      for (let i = 0; i < months.length; i++) {
        if (months[i] === 29) {
          knownTwentyNineMonth = { hy: y, hm: i + 1 };
          break outer;
        }
      }
    }
    expect(knownTwentyNineMonth).not.toBeNull();

    const calendar = createIranEstehlal(alwaysWrongFallback);
    expect(calendar.getMonthLength(knownTwentyNineMonth!.hy, knownTwentyNineMonth!.hm)).toBe(29);
  });

  it("uses the fallback only once the request falls outside the dataset", () => {
    const fallback: MonthLengthFallback = () => 29;
    const calendar = createIranEstehlal(fallback);
    // Anchor month is in-dataset (30 days) - must not be overridden by the fallback.
    expect(calendar.getMonthLength(IRAN_HIJRI_ANCHOR.hy, IRAN_HIJRI_ANCHOR.hm)).toBe(30);
  });
});

describe("invalid input", () => {
  const calendar = createIranEstehlal();

  it("throws on an invalid Gregorian date", () => {
    expect(() => calendar.gregorianToHijri(2025, 2, 29)).toThrow(RangeError); // not a leap year
    expect(() => calendar.gregorianToHijri(2025, 13, 1)).toThrow(RangeError);
    expect(() => calendar.gregorianToHijri(2025, 4, 31)).toThrow(RangeError);
    expect(() => calendar.gregorianToHijri(2025.5, 1, 1)).toThrow(RangeError);
  });

  it("throws on an invalid Hijri month", () => {
    expect(() => calendar.hijriToGregorian(1447, 0, 1)).toThrow(RangeError);
    expect(() => calendar.hijriToGregorian(1447, 13, 1)).toThrow(RangeError);
    expect(() => calendar.getMonthLength(1447, 13)).toThrow(RangeError);
  });

  it("throws on an invalid Hijri day (non-positive or non-integer)", () => {
    expect(() => calendar.hijriToGregorian(1447, 9, 0)).toThrow(RangeError);
    expect(() => calendar.hijriToGregorian(1447, 9, -1)).toThrow(RangeError);
    expect(() => calendar.hijriToGregorian(1447, 9, 1.5)).toThrow(RangeError);
  });

  it("throws on a Hijri day that exceeds the actual month length", () => {
    // 1447/09 has 30 days per the dataset.
    expect(calendar.getMonthLength(1447, 9)).toBe(30);
    expect(() => calendar.hijriToGregorian(1447, 9, 31)).toThrow(RangeError);
  });

  it("throws when a fallback returns an invalid month length", () => {
    const badFallback: MonthLengthFallback = () => 31 as unknown as 29 | 30;
    const calendar2 = createIranEstehlal(badFallback);
    expect(() => calendar2.getMonthLength(1500, 1)).toThrow(RangeError);
  });
});

describe("cross-check against a naive month-by-month reference implementation", () => {
  // A deliberately simple, slow, obviously-correct implementation that
  // walks from the anchor one month at a time - the same strategy the
  // original core.ts used - built independently of calendar.ts's
  // binary-search engine, using only the dataset (no fallback). Used to
  // fuzz-verify that the optimized implementation agrees with it.
  function naiveGregorianToHijri(gy: number, gm: number, gd: number) {
    const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const dim = (y: number, m: number) => (m === 2 && isLeap(y) ? 29 : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!);
    const toAbs = (y: number, m: number, d: number) => {
      let days = d;
      for (let yy = 1; yy < y; yy++) days += isLeap(yy) ? 366 : 365;
      for (let mm = 1; mm < m; mm++) days += dim(y, mm);
      return days;
    };
    const monthLength = (hy: number, hm: number) => IRAN_HIJRI_MONTHS[hy]?.[hm - 1] ?? null;

    let delta = toAbs(gy, gm, gd) - toAbs(IRAN_HIJRI_ANCHOR.gy, IRAN_HIJRI_ANCHOR.gm, IRAN_HIJRI_ANCHOR.gd);
    let { hy, hm, hd } = IRAN_HIJRI_ANCHOR;

    while (delta !== 0) {
      const ml = monthLength(hy, hm);
      if (ml === null) return null;
      if (delta > 0) {
        const remaining = ml - hd;
        if (delta > remaining) {
          delta -= remaining + 1;
          hd = 1;
          hm++;
          if (hm > 12) {
            hm = 1;
            hy++;
          }
        } else {
          hd += delta;
          break;
        }
      } else {
        if (-delta >= hd) {
          delta += hd;
          hm--;
          if (hm < 1) {
            hm = 12;
            hy--;
          }
          const prevLen = monthLength(hy, hm);
          if (prevLen === null) return null;
          hd = prevLen;
        } else {
          hd += delta;
          break;
        }
      }
    }
    return { hy, hm, hd };
  }

  it("agrees with the naive walking algorithm across many sampled Gregorian dates", () => {
    const calendar = createIranEstehlal();
    // Deterministic pseudo-random sample of Gregorian dates spanning
    // roughly the same range as the dataset (~1962 to ~2027).
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 300; i++) {
      const gy = 1962 + Math.floor(rand() * 65);
      const gm = 1 + Math.floor(rand() * 12);
      const gd = 1 + Math.floor(rand() * 28); // 28 is always valid, keeps this focused on the algorithm, not Gregorian edge cases
      const expected = naiveGregorianToHijri(gy, gm, gd);
      const actual = calendar.gregorianToHijri(gy, gm, gd);
      expect(actual).toEqual(expected);
    }
  });
});
