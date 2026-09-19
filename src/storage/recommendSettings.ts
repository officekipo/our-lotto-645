import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecommendSavedData = {
  myNumbers: number[][];
  required: number[];
  excluded: number[];
};

const STORAGE_KEY = '@our-lotto/recommend-settings-v1';
const EMPTY_DATA: RecommendSavedData = { myNumbers: [], required: [], excluded: [] };

export async function loadRecommendSavedData(): Promise<RecommendSavedData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw) as Partial<RecommendSavedData>;
    return {
      myNumbers: Array.isArray(parsed.myNumbers)
        ? parsed.myNumbers.filter((numbers): numbers is number[] => Array.isArray(numbers) && numbers.length === 6)
        : [],
      required: Array.isArray(parsed.required) ? parsed.required.filter(Number.isInteger).slice(0, 6) : [],
      excluded: Array.isArray(parsed.excluded) ? parsed.excluded.filter(Number.isInteger) : [],
    };
  } catch {
    return EMPTY_DATA;
  }
}

export async function saveRecommendSavedData(data: RecommendSavedData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
