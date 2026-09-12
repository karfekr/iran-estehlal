import type { GregorianDate } from "./types.js";

function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

export function isLeapGregorianYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function daysInGregorianMonth(year: number, month: number): number {
  if (month === 2 && isLeapGregorianYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1] ?? 30;
}

export function isValidGregorianDate(gy: number, gm: number, gd: number): boolean {
  if (!Number.isInteger(gy) || !Number.isInteger(gm) || !Number.isInteger(gd)) return false;
  if (gm < 1 || gm > 12) return false;
  if (gd < 1 || gd > daysInGregorianMonth(gy, gm)) return false;
  return true;
}

export function gregorianToAbsoluteDay(gy: number, gm: number, gd: number): number {
  const y = gm <= 2 ? gy - 1 : gy;
  const era = floorDiv(y, 400);
  const yoe = y - era * 400;
  const mp = gm + (gm > 2 ? -3 : 9);
  const doy = floorDiv(153 * mp + 2, 5) + gd - 1;
  const doe = yoe * 365 + floorDiv(yoe, 4) - floorDiv(yoe, 100) + doy;
  return era * 146097 + doe - 719468;
}

export function absoluteDayToGregorian(absDay: number): GregorianDate {
  const z = absDay + 719468;
  const era = floorDiv(z, 146097);
  const doe = z - era * 146097;
  const yoe = floorDiv(
    doe - floorDiv(doe, 1460) + floorDiv(doe, 36524) - floorDiv(doe, 146096),
    365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + floorDiv(yoe, 4) - floorDiv(yoe, 100));
  const mp = floorDiv(5 * doy + 2, 153);
  const gd = doy - floorDiv(153 * mp + 2, 5) + 1;
  const gm = mp + (mp < 10 ? 3 : -9);
  const gy = y + (gm <= 2 ? 1 : 0);
  return { gy, gm, gd };
}

export function compareGregorianDates(a: GregorianDate, b: GregorianDate): number {
  return gregorianToAbsoluteDay(a.gy, a.gm, a.gd) - gregorianToAbsoluteDay(b.gy, b.gm, b.gd);
}

export function addDaysToGregorian(date: GregorianDate, days: number): GregorianDate {
  return absoluteDayToGregorian(gregorianToAbsoluteDay(date.gy, date.gm, date.gd) + days);
}

export function diffGregorianDays(a: GregorianDate, b: GregorianDate): number {
  return gregorianToAbsoluteDay(b.gy, b.gm, b.gd) - gregorianToAbsoluteDay(a.gy, a.gm, a.gd);
}
