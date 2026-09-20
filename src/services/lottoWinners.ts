import type { WinnerStore } from '../types/lotto';

const API_BASE = 'https://www.dhlottery.co.kr/wnprchsplcsrch/selectLtWnShp.do';
const cache = new Map<string, WinnerStore[]>();

export type { WinnerStore } from '../types/lotto';

async function fetchWinnerStores(round: number, rank: 1 | 2): Promise<WinnerStore[]> {
  const key = `${round}:${rank}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}?srchWnShpRnk=${rank}&srchLtEpsd=${round}`, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) throw new Error(`Winner store API error: ${response.status}`);
  const json = await response.json();
  const list = Array.isArray(json?.data?.list) ? json.data.list : [];
  const stores: WinnerStore[] = list.map((item: any) => ({
    round,
    rank,
    storeId: String(item.ltShpId ?? ''),
    name: String(item.shpNm ?? '판매점'),
    region: String(item.region ?? item.tm1ShpLctnAddr ?? '지역 미상'),
    address: String(item.shpAddr ?? [item.tm1ShpLctnAddr, item.tm2ShpLctnAddr, item.tm3ShpLctnAddr].filter(Boolean).join(' ')),
    phone: String(item.shpTelno ?? ''),
    method: String(item.atmtPsvYnTxt ?? ''),
    latitude: Number.isFinite(Number(item.shpLat)) ? Number(item.shpLat) : null,
    longitude: Number.isFinite(Number(item.shpLot)) ? Number(item.shpLot) : null,
  }));
  cache.set(key, stores);
  return stores;
}

export async function fetchWinnerStoreHistory(startRound: number, endRound: number): Promise<{ first: WinnerStore[]; second: WinnerStore[] }> {
  const rounds = Array.from({ length: Math.max(0, endRound - startRound + 1) }, (_, index) => startRound + index);
  const jobs = rounds.flatMap((round) => [
    { round, rank: 1 as const },
    { round, rank: 2 as const },
  ]);
  const result: { first: WinnerStore[]; second: WinnerStore[] } = { first: [], second: [] };
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      try {
        const stores = await fetchWinnerStores(job.round, job.rank);
        if (job.rank === 1) result.first.push(...stores);
        else result.second.push(...stores);
      } catch (error) {
        console.warn(`Winner store API failed: ${job.round}/${job.rank}`, error);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, worker));
  return result;
}
