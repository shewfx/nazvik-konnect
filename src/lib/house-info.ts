
import { getHouseSettings as apiGetHouseSettings, updateHouseSettings as apiUpdateHouseSettings } from 'zite-endpoints-sdk';

export type HouseInfo = {
  wifi: { ssid: string; password: string };
  emergency: { name: string; number: string }[];
  location: { lat: number; lng: number; label: string };
  checklist: { id: string; label: string }[];
  rules: string[];
};

export const DEFAULT: HouseInfo = {
  wifi: { ssid: 'Demo Wi-Fi', password: 'demo-only-password' },
  emergency: [
    { name: 'Demo contact', number: '000-000-0000' },
  ],
  location: { lat: 0, lng: 0, label: 'Demo location' },
  checklist: [
    { id: 'tv', label: 'TV / Remote working' },
    { id: 'ac', label: 'AC / Heater working' },
    { id: 'fridge', label: 'Fridge clean & running' },
    { id: 'beds', label: 'Bedsheets & pillows clean' },
    { id: 'bath', label: 'Bathroom clean, water heater ok' },
    { id: 'kitchen', label: 'Kitchen utensils intact' },
    { id: 'doors', label: 'All doors & windows lock properly' },
    { id: 'wifi', label: 'WiFi router powered on' },
  ],
  rules: [
    'Check-out by 12:00 PM. Late checkout costs 5 pts/hour.',
    'Clean up before leaving — next family appreciates it.',
    'No smoking inside the house.',
    'Lock all doors and gates when leaving.',
    'Report any damage immediately via the app.',
    'Pets allowed only in the outdoor area.',
  ],
};

export async function fetchHouseInfo(): Promise<HouseInfo> {
  try {
    const res = await apiGetHouseSettings();
    if (res.success && res.settings) {
      return { ...DEFAULT, ...res.settings };
    }
  } catch {
    // fallback to defaults
  }
  return DEFAULT;
}

export async function saveHouseInfo(info: Partial<HouseInfo>): Promise<HouseInfo> {
  const res = await apiUpdateHouseSettings(info);
  if (res.success && res.settings) {
    return { ...DEFAULT, ...res.settings };
  }
  throw new Error('Failed to save house settings');
}
