export type GregorianDate = {
  readonly gy: number;
  readonly gm: number;
  readonly gd: number;
};

export type HijriDate = {
  readonly hy: number;
  readonly hm: number;
  readonly hd: number;
};

export type HijriMonthLength = 29 | 30;

export type MonthLengthFallback = (
  hy: number,
  hm: number,
) => HijriMonthLength | null;

export type HijriMonthDataset = Readonly<Record<number, readonly HijriMonthLength[]>>;

export type HijriAnchor = GregorianDate & HijriDate;

export type IranEstehlalCalendar = {
  getMonthLength(hy: number, hm: number): HijriMonthLength | null;
  gregorianToHijri(gy: number, gm: number, gd: number): HijriDate | null;
  hijriToGregorian(hy: number, hm: number, hd: number): GregorianDate | null;
};
