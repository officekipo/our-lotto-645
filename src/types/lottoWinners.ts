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
