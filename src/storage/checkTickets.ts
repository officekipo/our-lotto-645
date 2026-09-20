import AsyncStorage from '@react-native-async-storage/async-storage';

export type PurchaseType = '자동' | '수동' | '반자동' | '직접 입력';

export type SavedCheckTicket = {
  id: string;
  round: number;
  numbers: number[];
  source: '수기' | 'QR';
  purchaseType?: PurchaseType | null;
  rank: string | null;
  matches: number;
  bonusMatch: boolean;
  prize: number;
  claimed: boolean;
  createdAt: number;
};

const STORAGE_KEY = 'our-lotto:check-tickets:v1';

export async function loadCheckTickets(): Promise<SavedCheckTicket[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((ticket) => ({
      ...ticket,
      purchaseType: ticket.purchaseType ?? null,
    }));
  } catch {
    return [];
  }
}

export async function saveCheckTickets(tickets: SavedCheckTicket[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch {
    // 저장 실패가 당첨 확인 기능을 막지 않도록 처리합니다.
  }
}
