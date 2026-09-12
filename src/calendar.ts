import { IRAN_HIJRI_ANCHOR, IRAN_HIJRI_MONTHS } from "./constants.js";
import { absoluteDayToGregorian, gregorianToAbsoluteDay, isValidGregorianDate } from "./gregorian.js";
import type {
  GregorianDate,
  HijriDate,
  HijriMonthLength,
  IranEstehlalCalendar,
  MonthLengthFallback,
} from "./types.js";

function hijriMonthKey(hy: number, hm: number): number {
  return hy * 12 + (hm - 1);
}

function hijriMonthFromKey(key: number): { hy: number; hm: number } {
  const hy = Math.floor(key / 12);
  const hm = key - hy * 12 + 1;
  return { hy, hm };
}

function isValidMonthLength(value: unknown): value is HijriMonthLength {
  return value === 29 || value === 30;
}

/** Builds the flat month-key -> length map from the raw per-year dataset. */
function buildDatasetMap(): Map<number, HijriMonthLength> {
  const map = new Map<number, HijriMonthLength>();
  for (const [yearStr, months] of Object.entries(IRAN_HIJRI_MONTHS)) {
    const year = Number(yearStr);
    months.forEach((length, i) => {
      if (!isValidMonthLength(length)) {
        throw new RangeError(
          `iran-estehlal: bundled dataset has an invalid month length (${String(length)}) for Hijri ${year}/${i + 1}. This indicates a corrupted build.`,
        );
      }
      map.set(hijriMonthKey(year, i + 1), length);
    });
  }
  return map;
}

const DATASET = buildDatasetMap();

function assertValidHijriMonth(hm: number): void {
  if (!Number.isInteger(hm) || hm < 1 || hm > 12) {
    throw new RangeError(`iran-estehlal: invalid Hijri month "${hm}" - must be an integer from 1 to 12.`);
  }
}

function assertValidGregorianDate(gy: number, gm: number, gd: number): void {
  if (!isValidGregorianDate(gy, gm, gd)) {
    throw new RangeError(`iran-estehlal: "${gy}-${gm}-${gd}" is not a valid Gregorian date.`);
  }
}

export function createIranEstehlal(fallback?: MonthLengthFallback): IranEstehlalCalendar {
  const fallbackCache = new Map<number, HijriMonthLength | null>();

  function resolveMonthLength(hy: number, hm: number): HijriMonthLength | null {
    const key = hijriMonthKey(hy, hm);

    const fromDataset = DATASET.get(key);
    if (fromDataset !== undefined) return fromDataset;

    const cached = fallbackCache.get(key);
    if (cached !== undefined) return cached;

    if (!fallback) return null;

    const result = fallback(hy, hm);
    if (result === null) {
      fallbackCache.set(key, null);
      return null;
    }
    if (!isValidMonthLength(result)) {
      throw new RangeError(
        `iran-estehlal: fallback returned an invalid month length (${String(result)}) for Hijri ${hy}/${hm} - a fallback must return 29, 30, or null.`,
      );
    }
    fallbackCache.set(key, result);
    return result;
  }

  const anchorKey = hijriMonthKey(IRAN_HIJRI_ANCHOR.hy, IRAN_HIJRI_ANCHOR.hm);
  if (!DATASET.has(anchorKey)) {
    throw new RangeError("iran-estehlal: the bundled anchor month is missing from the bundled dataset.");
  }

  let coreMin = anchorKey;
  let coreMax = anchorKey;
  while (DATASET.has(coreMin - 1)) coreMin--;
  while (DATASET.has(coreMax + 1)) coreMax++;

  const coreMonthCount = coreMax - coreMin + 1;
  const corePrefix: number[] = new Array(coreMonthCount + 1);
  corePrefix[0] = 0;
  for (let i = 0; i < coreMonthCount; i++) {
    const { hy, hm } = hijriMonthFromKey(coreMin + i);
    const length = DATASET.get(coreMin + i);
    if (length === undefined) {
      throw new RangeError(`iran-estehlal: internal error resolving Hijri ${hy}/${hm}.`);
    }
    corePrefix[i + 1] = (corePrefix[i] ?? 0) + length;
  }
  const coreSpanDays = corePrefix[coreMonthCount] ?? 0;

  const anchorEpochStart = corePrefix[anchorKey - coreMin] ?? 0;
  const anchorHijriEpochDay = anchorEpochStart + (IRAN_HIJRI_ANCHOR.hd - 1);
  const anchorGregorianAbsDay = gregorianToAbsoluteDay(
    IRAN_HIJRI_ANCHOR.gy,
    IRAN_HIJRI_ANCHOR.gm,
    IRAN_HIJRI_ANCHOR.gd,
  );

  function locateInCore(day: number): { key: number; dayStart: number } {
    let lo = 0;
    let hi = coreMonthCount - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((corePrefix[mid] ?? 0) <= day) lo = mid;
      else hi = mid - 1;
    }
    return { key: coreMin + lo, dayStart: corePrefix[lo] ?? 0 };
  }

  const belowExt: number[] = [];
  let belowFrontierKey = coreMin;
  let belowFrontierEpoch = 0;
  let belowExhausted = false;

  const aboveExt: number[] = [];
  let aboveFrontierKey = coreMax + 1;
  let aboveFrontierEpoch = coreSpanDays;
  let aboveExhausted = false;

  function extendBelowToCover(day: number): boolean {
    while (day < belowFrontierEpoch) {
      if (belowExhausted) return false;
      const candidateKey = belowFrontierKey - 1;
      const { hy, hm } = hijriMonthFromKey(candidateKey);
      const length = resolveMonthLength(hy, hm);
      if (length === null) {
        belowExhausted = true;
        return false;
      }
      belowFrontierEpoch -= length;
      belowFrontierKey = candidateKey;
      belowExt.push(belowFrontierEpoch);
    }
    return true;
  }

  function extendAboveToCover(day: number): boolean {
    while (day >= aboveFrontierEpoch) {
      if (aboveExhausted) return false;
      const candidateKey = aboveFrontierKey;
      const { hy, hm } = hijriMonthFromKey(candidateKey);
      const length = resolveMonthLength(hy, hm);
      if (length === null) {
        aboveExhausted = true;
        return false;
      }
      aboveExt.push(aboveFrontierEpoch);
      aboveFrontierEpoch += length;
      aboveFrontierKey = candidateKey + 1;
    }
    return true;
  }

  function locateBelow(day: number): { key: number; dayStart: number } | null {
    if (!extendBelowToCover(day)) return null;
    let lo = 0;
    let hi = belowExt.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((belowExt[mid] ?? Number.NEGATIVE_INFINITY) <= day) hi = mid;
      else lo = mid + 1;
    }
    return { key: coreMin - 1 - lo, dayStart: belowExt[lo] ?? 0 };
  }

  function locateAbove(day: number): { key: number; dayStart: number } | null {
    if (!extendAboveToCover(day)) return null;
    let lo = 0;
    let hi = aboveExt.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((aboveExt[mid] ?? Number.POSITIVE_INFINITY) <= day) lo = mid;
      else hi = mid - 1;
    }
    return { key: coreMax + 1 + lo, dayStart: aboveExt[lo] ?? 0 };
  }

  function locateByEpochDay(day: number): { key: number; dayStart: number } | null {
    if (day >= 0 && day < coreSpanDays) return locateInCore(day);
    if (day < 0) return locateBelow(day);
    return locateAbove(day);
  }

  function epochStartOfKey(key: number): number | null {
    if (key >= coreMin && key <= coreMax) return corePrefix[key - coreMin] ?? null;
    if (key === coreMax + 1) return coreSpanDays;
    if (key < coreMin) {
      const i = coreMin - 1 - key;
      while (belowFrontierKey > key) {
        if (belowExhausted) return null;
        const candidateKey = belowFrontierKey - 1;
        const { hy, hm } = hijriMonthFromKey(candidateKey);
        const length = resolveMonthLength(hy, hm);
        if (length === null) {
          belowExhausted = true;
          return null;
        }
        belowFrontierEpoch -= length;
        belowFrontierKey = candidateKey;
        belowExt.push(belowFrontierEpoch);
      }
      return belowExt[i] ?? null;
    }
    while (aboveFrontierKey <= key) {
      if (aboveExhausted) return null;
      const candidateKey = aboveFrontierKey;
      const { hy, hm } = hijriMonthFromKey(candidateKey);
      const length = resolveMonthLength(hy, hm);
      if (length === null) {
        aboveExhausted = true;
        return null;
      }
      aboveExt.push(aboveFrontierEpoch);
      aboveFrontierEpoch += length;
      aboveFrontierKey = candidateKey + 1;
    }
    return aboveExt[key - (coreMax + 1)] ?? null;
  }

  function getMonthLength(hy: number, hm: number): HijriMonthLength | null {
    assertValidHijriMonth(hm);
    if (!Number.isInteger(hy)) {
      throw new RangeError(`iran-estehlal: invalid Hijri year "${hy}" - must be an integer.`);
    }
    return resolveMonthLength(hy, hm);
  }

  function gregorianToHijri(gy: number, gm: number, gd: number): HijriDate | null {
    assertValidGregorianDate(gy, gm, gd);
    const absDay = gregorianToAbsoluteDay(gy, gm, gd);
    const targetEpochDay = anchorHijriEpochDay + (absDay - anchorGregorianAbsDay);
    const located = locateByEpochDay(targetEpochDay);
    if (located === null) return null;
    const { hy, hm } = hijriMonthFromKey(located.key);
    const hd = targetEpochDay - located.dayStart + 1;
    return { hy, hm, hd };
  }

  function hijriToGregorian(hy: number, hm: number, hd: number): GregorianDate | null {
    assertValidHijriMonth(hm);
    if (!Number.isInteger(hy)) {
      throw new RangeError(`iran-estehlal: invalid Hijri year "${hy}" - must be an integer.`);
    }
    if (!Number.isInteger(hd) || hd < 1) {
      throw new RangeError(`iran-estehlal: invalid Hijri day "${hd}" - must be a positive integer.`);
    }

    const monthLength = resolveMonthLength(hy, hm);
    if (monthLength === null) return null;

    if (hd > monthLength) {
      throw new RangeError(
        `iran-estehlal: invalid Hijri day "${hd}" for ${hy}/${hm} - that month only has ${monthLength} days.`,
      );
    }

    const key = hijriMonthKey(hy, hm);
    const epochStart = epochStartOfKey(key);
    if (epochStart === null) return null;

    const epochDay = epochStart + (hd - 1);
    const targetAbsDay = anchorGregorianAbsDay + (epochDay - anchorHijriEpochDay);
    return absoluteDayToGregorian(targetAbsDay);
  }

  return {
    getMonthLength,
    gregorianToHijri,
    hijriToGregorian,
  };
}
