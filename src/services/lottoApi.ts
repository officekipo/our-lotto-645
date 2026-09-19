import type { DrawData, HistoryDraw } from '../types/lotto';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DRAW_TIMEOUT_MS = 8000;
const HISTORY_TIMEOUT_MS = 10000;

let latestDrawCache: { draw: DrawData; savedAt: number } | null = null;
let historyCache = new Map<number, { draws: HistoryDraw[]; savedAt: number }>();

function getStorage(): Storage | null {
  try {
    return typeof globalThis !== 'undefined' && 'localStorage' in globalThis
      ? globalThis.localStorage
      : null;
  } catch {
    return null;
  }
}

function readCache<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; value: T };
    return Date.now() - parsed.savedAt < CACHE_TTL_MS ? parsed.value : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // 캐시 저장 실패는 데이터 조회를 방해하지 않습니다.
  }
}

async function fetchJson(url: string, timeoutMs: number): Promise<UnknownObject | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function readStaleCache<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; value: T };
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

function isValidDraw(draw: DrawData | null, expectedRound?: number): draw is DrawData {
  if (!draw) return false;
  if (expectedRound !== undefined && draw.round !== expectedRound) return false;
  if (!Number.isInteger(draw.round) || draw.round < 1) return false;
  if (!Array.isArray(draw.numbers) || draw.numbers.length !== 6) return false;
  if (new Set(draw.numbers).size !== 6) return false;
  if (draw.numbers.some((number) => !Number.isInteger(number) || number < 1 || number > 45)) return false;
  if (!Number.isInteger(draw.bonus) || draw.bonus < 1 || draw.bonus > 45 || draw.numbers.includes(draw.bonus)) return false;
  return true;
}

type UnknownObject = Record<string, any>;

function firstPositiveCount(values: unknown[], fallback = 0): number {
  const value = values.map(Number).find((item) => Number.isFinite(item) && item > 0);
  return value ?? fallback;
}

function normalizeDraw(data: UnknownObject): DrawData | null {
  if (!data) return null;

  const item = data?.data?.list?.[0];

  if (item) {
    const numbers = [
      Number(item.tm1WnNo),
      Number(item.tm2WnNo),
      Number(item.tm3WnNo),
      Number(item.tm4WnNo),
      Number(item.tm5WnNo),
      Number(item.tm6WnNo),
    ].filter(Number.isFinite);

    if (numbers.length === 6) {
      return {
        round: Number(item.ltEpsd),
        date: String(item.ltRflYmd ?? item.date ?? ''),
        numbers,
        bonus: Number(item.bnsWnNo ?? item.bonus ?? 0),
        firstPrize: Number(item.rnk1WnAmt ?? item.firstWinamnt ?? item.firstPrize ?? 0),
        firstWinners: firstPositiveCount([item.rnk1WnNope, item.rnk1WnCo, item.firstPrzwnerCo, item.firstWinners]),
        secondPrize: Number(item.rnk2WnAmt ?? item.secondWinamnt ?? item.secondPrize ?? 0),
        secondWinners: firstPositiveCount([item.rnk2WnNope, item.rnk2WnCo, item.secondPrzwnerCo, item.secondWinners]),
        thirdPrize: Number(item.rnk3WnAmt ?? item.thirdWinamnt ?? item.thirdPrize ?? 0),
        thirdWinners: firstPositiveCount([item.rnk3WnNope, item.rnk3WnCo, item.thirdPrzwnerCo, item.thirdWinners]),
      };
    }
  }

  if (data.returnValue === 'success') {
    const numbers = [
      data.drwtNo1, data.drwtNo2, data.drwtNo3,
      data.drwtNo4, data.drwtNo5, data.drwtNo6,
    ].map(Number);

    if (numbers.every(Number.isFinite)) {
      return {
        round: Number(data.drwNo),
        date: String(data.drwNoDate ?? ''),
        numbers,
        bonus: Number(data.bnusNo),
        firstPrize: Number(data.firstWinamnt ?? 0),
        firstWinners: firstPositiveCount([data.rnk1WnNope, data.firstPrzwnerCo, data.firstWinners]),
        secondPrize: Number(data.secondWinamnt ?? 0),
        secondWinners: firstPositiveCount([data.rnk2WnNope, data.secondPrzwnerCo, data.secondWinners]),
        thirdPrize: Number(data.thirdWinamnt ?? 0),
        thirdWinners: firstPositiveCount([data.rnk3WnNope, data.thirdPrzwnerCo, data.thirdWinners]),
      };
    }
  }

  return null;
}

export async function fetchLatestDraw(options: { force?: boolean } = {}): Promise<DrawData | null> {
  const cacheKey = 'lotto:v3:latest';

  if (!options.force) {
    const memory = latestDrawCache;
    if (memory && Date.now() - memory.savedAt < CACHE_TTL_MS) return memory.draw;
    const persisted = readCache<DrawData>(cacheKey);
    if (persisted && isValidDraw(persisted)) {
      latestDrawCache = { draw: persisted, savedAt: Date.now() };
      return persisted;
    }
  }

  const cacheBust = Date.now();
  const urls = [
    `https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do?srchDir=center&srchLtEpsd=all&_=${cacheBust}`,
    `https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=all&_=${cacheBust}`,
  ];

  for (const url of urls) {
    const data = await fetchJson(url, DRAW_TIMEOUT_MS);
    const list = Array.isArray(data?.data?.list) ? data.data.list : [];
    const candidates = list
      .map((item: UnknownObject) => normalizeDraw({ data: { list: [item] } }))
      .filter((item: DrawData | null): item is DrawData => isValidDraw(item));
    candidates.sort((a: DrawData, b: DrawData) => b.round - a.round);
    if (candidates[0]) {
      latestDrawCache = { draw: candidates[0], savedAt: Date.now() };
      writeCache(cacheKey, candidates[0]);
      writeCache(`lotto:v3:draw:${candidates[0].round}`, candidates[0]);
      return candidates[0];
    }
  }

  const stale = readStaleCache<DrawData>(cacheKey);
  if (isValidDraw(stale)) {
    latestDrawCache = { draw: stale, savedAt: Date.now() };
    return stale;
  }

  return null;
}

export async function fetchDraw(round: number, options: { force?: boolean } = {}): Promise<DrawData | null> {
  const cacheKey = `lotto:v3:draw:${round}`;

  if (!options.force) {
    const memory = latestDrawCache;
    if (memory && memory.draw.round === round && Date.now() - memory.savedAt < CACHE_TTL_MS) {
      return memory.draw;
    }
    const persisted = readCache<DrawData>(cacheKey);
    if (persisted) {
      latestDrawCache = { draw: persisted, savedAt: Date.now() };
      return persisted;
    }
  }

  const cacheBust = Date.now();
  const urls = [
    `https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do?srchDir=center&srchLtEpsd=${round}&_=${cacheBust}`,
    `https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchDir=center&srchLtEpsd=${round}&_=${cacheBust}`,
    `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}&_=${cacheBust}`,
  ];

  for (const url of urls) {
    const data = await fetchJson(url, DRAW_TIMEOUT_MS);
    const result = normalizeDraw(data ?? {});
    if (isValidDraw(result, round)) {
      latestDrawCache = { draw: result, savedAt: Date.now() };
      writeCache(cacheKey, result);
      return result;
    }
  }

  // 네트워크 장애/동행복권 응답 지연 시에도 이미 저장된 실제 회차 데이터가 있다면
  // 하드코딩 데이터 대신 해당 캐시를 사용해 앱을 빈 화면으로 만들지 않습니다.
  const stale = readStaleCache<DrawData>(cacheKey);
  if (isValidDraw(stale, round)) {
    latestDrawCache = { draw: stale, savedAt: Date.now() };
    return stale;
  }

  return null;
}

export function normalizeHistoryItem(item: UnknownObject): HistoryDraw | null {
  if (!item) return null;

  const numbers = [
    item.numbers?.[0] ?? item.drwtNo1 ?? item.num1,
    item.numbers?.[1] ?? item.drwtNo2 ?? item.num2,
    item.numbers?.[2] ?? item.drwtNo3 ?? item.num3,
    item.numbers?.[3] ?? item.drwtNo4 ?? item.num4,
    item.numbers?.[4] ?? item.drwtNo5 ?? item.num5,
    item.numbers?.[5] ?? item.drwtNo6 ?? item.num6,
  ].map(Number);

  if (numbers.length !== 6 || numbers.some((number) => !Number.isInteger(number) || number < 1 || number > 45) || new Set(numbers).size !== 6) {
    return null;
  }

  const round = Number(item.round ?? item.drwNo ?? item.ltEpsd);
  if (!Number.isFinite(round)) return null;

  return {
    round,
    date: String(item.date ?? item.drwNoDate ?? item.ltRflYmd ?? ''),
    numbers,
    bonus: Number(item.bonus ?? item.bnusNo ?? item.bnsWnNo ?? 0),
    firstPrize: Number(item.firstPrize ?? item.firstWinamnt ?? item.rnk1WnAmt ?? 0),
    firstWinners: firstPositiveCount([item.firstWinners, item.firstPrzwnerCo, item.rnk1WnNope, item.rnk1WnCo]),
    secondPrize: Number(item.secondPrize ?? item.secondWinamnt ?? item.rnk2WnAmt ?? 0),
    secondWinners: firstPositiveCount([item.secondWinners, item.secondPrzwnerCo, item.rnk2WnNope, item.rnk2WnCo]),
    thirdPrize: Number(item.thirdPrize ?? item.thirdWinamnt ?? item.rnk3WnAmt ?? 0),
    thirdWinners: firstPositiveCount([item.thirdWinners, item.thirdPrzwnerCo, item.rnk3WnNope, item.rnk3WnCo]),
  };
}

export async function fetchHistory(limit = 52, options: { force?: boolean } = {}): Promise<HistoryDraw[]> {
  if (!options.force) {
    const memory = historyCache.get(limit);
    if (memory && Date.now() - memory.savedAt < CACHE_TTL_MS) return memory.draws;
    const persisted = readCache<HistoryDraw[]>(`lotto:v3:history:${limit}`);
    if (persisted) {
      historyCache.set(limit, { draws: persisted, savedAt: Date.now() });
      return persisted;
    }
  }

  try {
    const data = await fetchJson(
      `https://www.lottopig.kr/api/lotto/draws?limit=${limit}&offset=0`,
      HISTORY_TIMEOUT_MS,
    );
    if (!data) throw new Error('History API request failed');

    const rawList: UnknownObject[] =
      Array.isArray(data) ? data :
      Array.isArray(data?.draws) ? data.draws :
      Array.isArray(data?.data) ? data.data :
      Array.isArray(data?.list) ? data.list :
      Array.isArray(data?.data?.draws) ? data.data.draws :
      Array.isArray(data?.data?.list) ? data.data.list : [];

    const draws = rawList
      .map(normalizeHistoryItem)
      .filter((draw): draw is HistoryDraw => draw !== null);


    const sorted = draws.sort((a: HistoryDraw, b: HistoryDraw) => b.round - a.round);
    if (sorted.length > 0) {
      historyCache.set(limit, { draws: sorted, savedAt: Date.now() });
      writeCache(`lotto:v3:history:${limit}`, sorted);
    }
    return sorted;
  } catch (error) {
    console.warn('History API failed:', error);
  }

  const stale = readStaleCache<HistoryDraw[]>(`lotto:v3:history:${limit}`);
  if (Array.isArray(stale) && stale.length > 0) {
    historyCache.set(limit, { draws: stale, savedAt: Date.now() });
    return stale;
  }

  return [];
}
