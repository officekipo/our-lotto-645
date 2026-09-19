import type { HistoryDraw, LottoStats } from '../types/lotto';

export type OddEvenDistribution = { odd: number; even: number };
export type RangeDistribution = { label: string; min: number; max: number; count: number; percentage: number };
export type SumDistribution = { min: number; max: number; count: number; percentage: number };
export type DrawPattern = { odd: number; even: number; count: number; percentage: number };
export type NumberAnalysis = { number: number; frequency: number; recentFrequency: number; gap: number; lastSeenRound: number | null };

export type AdvancedLottoStats = LottoStats & {
  oddEven: OddEvenDistribution;
  rangeDistribution: RangeDistribution[];
  sumDistribution: SumDistribution[];
  oddEvenPatterns: DrawPattern[];
  numberAnalysis: NumberAnalysis[];
};

const RANGES = [
  { label: '1~10', min: 1, max: 10 },
  { label: '11~20', min: 11, max: 20 },
  { label: '21~30', min: 21, max: 30 },
  { label: '31~40', min: 31, max: 40 },
  { label: '41~45', min: 41, max: 45 },
];

export function buildStats(draws: HistoryDraw[]): AdvancedLottoStats {
  const numberFrequency: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) numberFrequency[n] = 0;

  if (!draws.length) return { numberFrequency, topNumbers: [], averageSum: 0, averageOddCount: 0, consecutiveRate: 0, highNumberRate: 0, rounds: 0, oddEven: { odd: 0, even: 0 }, rangeDistribution: RANGES.map(r => ({ ...r, count: 0, percentage: 0 })), sumDistribution: [], oddEvenPatterns: [], numberAnalysis: [] };

  const sorted = [...draws].sort((a, b) => b.round - a.round);
  const recent = sorted.slice(0, Math.min(20, sorted.length));
  let totalSum = 0, totalOdd = 0, consecutive = 0, high = 0, odd = 0, even = 0;
  const patterns = new Map<string, number>();
  const sums = new Map<string, number>();

  for (const draw of draws) {
    for (const n of draw.numbers) if (n >= 1 && n <= 45) numberFrequency[n]++;
    const sum = draw.numbers.reduce((a, b) => a + b, 0);
    const oddCount = draw.numbers.filter(n => n % 2 === 1).length;
    totalSum += sum; totalOdd += oddCount; odd += oddCount; even += 6 - oddCount;
    const nums = [...draw.numbers].sort((a, b) => a - b);
    if (nums.some((n, i) => i > 0 && n === nums[i - 1] + 1)) consecutive++;
    if (draw.numbers.some(n => n >= 41)) high++;
    const pk = `${oddCount}:${6 - oddCount}`; patterns.set(pk, (patterns.get(pk) ?? 0) + 1);
    const min = Math.floor(sum / 20) * 20; const sk = `${min}-${min + 19}`; sums.set(sk, (sums.get(sk) ?? 0) + 1);
  }

  const topNumbers = Object.entries(numberFrequency).map(([number, count]) => ({ number: Number(number), count })).sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 5);
  const rangeDistribution = RANGES.map(r => { const count = draws.reduce((total, d) => total + d.numbers.filter(n => n >= r.min && n <= r.max).length, 0); return { ...r, count, percentage: count / (draws.length * 6) * 100 }; });
  const sumDistribution = [...sums.entries()].map(([key, count]) => { const [min, max] = key.split('-').map(Number); return { min, max, count, percentage: count / draws.length * 100 }; }).sort((a, b) => a.min - b.min);
  const oddEvenPatterns = [...patterns.entries()].map(([key, count]) => { const [o, e] = key.split(':').map(Number); return { odd: o, even: e, count, percentage: count / draws.length * 100 }; }).sort((a, b) => b.count - a.count);
  const numberAnalysis = Array.from({ length: 45 }, (_, i) => { const number = i + 1; const frequency = draws.filter(d => d.numbers.includes(number)).length; const recentFrequency = recent.filter(d => d.numbers.includes(number)).length; const index = sorted.findIndex(d => d.numbers.includes(number)); return { number, frequency, recentFrequency, gap: index === -1 ? sorted.length : index, lastSeenRound: index === -1 ? null : sorted[index].round }; });

  return { numberFrequency, topNumbers, averageSum: totalSum / draws.length, averageOddCount: totalOdd / draws.length, consecutiveRate: consecutive / draws.length * 100, highNumberRate: high / draws.length * 100, rounds: draws.length, oddEven: { odd, even }, rangeDistribution, sumDistribution, oddEvenPatterns, numberAnalysis };
}
