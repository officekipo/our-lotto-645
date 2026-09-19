export type CountKey = 3 | 5 | 10;

export type DrawData = {
  round: number;
  date: string;
  numbers: number[];
  bonus: number;
  firstWinners: number;
  firstPrize: number;
  secondWinners: number;
  secondPrize: number;
  thirdWinners: number;
  thirdPrize: number;
};

export type HistoryDraw = DrawData;

export type LottoStats = {
  numberFrequency: Record<number, number>;
  topNumbers: Array<{ number: number; count: number }>;
  averageSum: number;
  averageOddCount: number;
  consecutiveRate: number;
  highNumberRate: number;
  rounds: number;
};

export type WinnerStore = {
  round: number;
  rank: 1 | 2;
  storeId: string;
  name: string;
  region: string;
  address: string;
  phone: string;
  method: string;
  latitude: number | null;
  longitude: number | null;
};
