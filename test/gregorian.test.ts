import { describe, expect, it } from "vitest";
import {
  absoluteDayToGregorian,
  addDaysToGregorian,
  compareGregorianDates,
  daysInGregorianMonth,
  diffGregorianDays,
  gregorianToAbsoluteDay,
  isLeapGregorianYear,
  isValidGregorianDate,
} from "../src/gregorian.js";

describe("isLeapGregorianYear", () => {
  it("treats years divisible by 4 (but not 100) as leap", () => {
    expect(isLeapGregorianYear(2024)).toBe(true);
    expect(isLeapGregorianYear(2028)).toBe(true);
  });

  it("treats century years not divisible by 400 as non-leap", () => {
    expect(isLeapGregorianYear(1900)).toBe(false);
    expect(isLeapGregorianYear(2100)).toBe(false);
  });

  it("treats years divisible by 400 as leap", () => {
    expect(isLeapGregorianYear(2000)).toBe(true);
    expect(isLeapGregorianYear(2400)).toBe(true);
  });

  it("treats ordinary non-multiples-of-4 as non-leap", () => {
    expect(isLeapGregorianYear(2025)).toBe(false);
    expect(isLeapGregorianYear(2026)).toBe(false);
  });
});

describe("daysInGregorianMonth", () => {
  it("returns 29 for February in a leap year", () => {
    expect(daysInGregorianMonth(2024, 2)).toBe(29);
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(daysInGregorianMonth(2025, 2)).toBe(28);
  });

  it("returns correct lengths for 30- and 31-day months", () => {
    expect(daysInGregorianMonth(2025, 4)).toBe(30);
    expect(daysInGregorianMonth(2025, 1)).toBe(31);
  });
});

describe("isValidGregorianDate", () => {
  it("accepts valid dates", () => {
    expect(isValidGregorianDate(2026, 3, 20)).toBe(true);
    expect(isValidGregorianDate(2024, 2, 29)).toBe(true);
    expect(isValidGregorianDate(1, 1, 1)).toBe(true);
    expect(isValidGregorianDate(-100, 1, 1)).toBe(true);
  });

  it("rejects invalid days", () => {
    expect(isValidGregorianDate(2025, 2, 29)).toBe(false); // not a leap year
    expect(isValidGregorianDate(2025, 4, 31)).toBe(false); // April has 30 days
    expect(isValidGregorianDate(2025, 1, 0)).toBe(false);
    expect(isValidGregorianDate(2025, 1, 32)).toBe(false);
  });

  it("rejects invalid months", () => {
    expect(isValidGregorianDate(2025, 0, 1)).toBe(false);
    expect(isValidGregorianDate(2025, 13, 1)).toBe(false);
  });

  it("rejects non-integer input", () => {
    expect(isValidGregorianDate(2025.5, 1, 1)).toBe(false);
    expect(isValidGregorianDate(2025, 1.5, 1)).toBe(false);
    expect(isValidGregorianDate(2025, 1, 1.5)).toBe(false);
  });
});

describe("gregorianToAbsoluteDay / absoluteDayToGregorian", () => {
  it("maps the Unix epoch to day 0", () => {
    expect(gregorianToAbsoluteDay(1970, 1, 1)).toBe(0);
    expect(absoluteDayToGregorian(0)).toEqual({ gy: 1970, gm: 1, gd: 1 });
  });

  it("round-trips a range of dates, including far past and far future", () => {
    const samples: [number, number, number][] = [
      [1970, 1, 1],
      [2026, 3, 20],
      [2000, 2, 29],
      [1, 1, 1],
      [1900, 2, 28],
      [1600, 2, 29],
      [-500, 6, 15],
      [9999, 12, 31],
      [2024, 12, 31],
      [2025, 1, 1],
    ];
    for (const [gy, gm, gd] of samples) {
      const abs = gregorianToAbsoluteDay(gy, gm, gd);
      expect(absoluteDayToGregorian(abs)).toEqual({ gy, gm, gd });
    }
  });

  it("increases by exactly 1 per calendar day across a large consecutive range", () => {
    const start = gregorianToAbsoluteDay(2020, 1, 1);
    let prev = absoluteDayToGregorian(start);
    for (let i = 1; i <= 2000; i++) {
      const next = absoluteDayToGregorian(start + i);
      const prevAbs = gregorianToAbsoluteDay(prev.gy, prev.gm, prev.gd);
      expect(gregorianToAbsoluteDay(next.gy, next.gm, next.gd)).toBe(prevAbs + 1);
      prev = next;
    }
  });

  it("agrees with a known day-of-week reference (2026-03-20 is a Friday)", () => {
    // 2000-01-01 (a known Saturday) as a reference anchor day count check.
    const known = gregorianToAbsoluteDay(2000, 1, 1);
    const target = gregorianToAbsoluteDay(2026, 3, 20);
    const diff = target - known;
    // 2000-01-01 was a Saturday (day index 6 if Sunday=0).
    const dow = ((6 + diff) % 7 + 7) % 7;
    expect(dow).toBe(5); // Friday
  });
});

describe("compareGregorianDates / addDaysToGregorian / diffGregorianDays", () => {
  it("compares dates correctly", () => {
    expect(compareGregorianDates({ gy: 2026, gm: 3, gd: 20 }, { gy: 2026, gm: 3, gd: 21 })).toBeLessThan(0);
    expect(compareGregorianDates({ gy: 2026, gm: 3, gd: 21 }, { gy: 2026, gm: 3, gd: 20 })).toBeGreaterThan(0);
    expect(compareGregorianDates({ gy: 2026, gm: 3, gd: 20 }, { gy: 2026, gm: 3, gd: 20 })).toBe(0);
  });

  it("adds and subtracts days, including across month/year boundaries", () => {
    expect(addDaysToGregorian({ gy: 2025, gm: 12, gd: 31 }, 1)).toEqual({ gy: 2026, gm: 1, gd: 1 });
    expect(addDaysToGregorian({ gy: 2026, gm: 1, gd: 1 }, -1)).toEqual({ gy: 2025, gm: 12, gd: 31 });
    expect(addDaysToGregorian({ gy: 2024, gm: 2, gd: 28 }, 1)).toEqual({ gy: 2024, gm: 2, gd: 29 });
  });

  it("computes the day difference between two dates", () => {
    expect(diffGregorianDays({ gy: 2026, gm: 3, gd: 20 }, { gy: 2026, gm: 3, gd: 30 })).toBe(10);
    expect(diffGregorianDays({ gy: 2026, gm: 3, gd: 30 }, { gy: 2026, gm: 3, gd: 20 })).toBe(-10);
  });
});
