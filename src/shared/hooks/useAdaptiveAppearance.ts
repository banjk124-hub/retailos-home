import { useCallback, useEffect, useState } from 'react';

export type AppearancePreference = 'system' | 'light' | 'dark';

type BatteryManagerLike = EventTarget & {
  level: number;
  charging: boolean;
};

type BatteryNavigator = Navigator & {
  getBattery?: () => Promise<BatteryManagerLike>;
};

type NetworkInformationLike = {
  saveData?: boolean;
};

type AppearanceState = {
  preference: AppearancePreference;
  isLowPower: boolean;
  cyclePreference: () => void;
};

const STORAGE_KEY = 'retailos.appearance.v1';
const LOW_BATTERY_THRESHOLD = 0.2;

function readPreference(): AppearancePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch (error) {
    console.warn('Không thể đọc tùy chọn giao diện đã lưu:', error);
  }
  return 'system';
}

function isConstrainedDevice(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  const cores = navigator.hardwareConcurrency;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return Boolean(connection?.saveData) || (typeof cores === 'number' && cores <= 4) ||
    (typeof memory === 'number' && memory <= 4);
}

export function useAdaptiveAppearance(): AppearanceState {
  const [preference, setPreference] = useState<AppearancePreference>(readPreference);
  const [isLowBattery, setIsLowBattery] = useState(false);
  const [isDarkSystem, setIsDarkSystem] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const cyclePreference = useCallback(() => {
    setPreference((current) => current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system');
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch (error) {
      console.warn('Không thể lưu tùy chọn giao diện:', error);
    }
  }, [preference]);

  useEffect(() => {
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMediaPreferences = () => {
      setIsDarkSystem(colorScheme.matches);
      setPrefersReducedMotion(reducedMotion.matches);
    };
    colorScheme.addEventListener('change', syncMediaPreferences);
    reducedMotion.addEventListener('change', syncMediaPreferences);

    let battery: BatteryManagerLike | null = null;
    let cancelled = false;
    const syncBattery = () => setIsLowBattery(Boolean(battery && !battery.charging && battery.level <= LOW_BATTERY_THRESHOLD));
    const attachBattery = async () => {
      const getBattery = (navigator as BatteryNavigator).getBattery;
      if (!getBattery) return;
      try {
        const result = await getBattery.call(navigator);
        if (cancelled) return;
        battery = result;
        syncBattery();
        battery.addEventListener('levelchange', syncBattery);
        battery.addEventListener('chargingchange', syncBattery);
      } catch (error) {
        console.warn('Không thể đọc trạng thái pin; tiếp tục theo thiết lập hệ thống:', error);
      }
    };
    void attachBattery();

    return () => {
      cancelled = true;
      colorScheme.removeEventListener('change', syncMediaPreferences);
      reducedMotion.removeEventListener('change', syncMediaPreferences);
      battery?.removeEventListener('levelchange', syncBattery);
      battery?.removeEventListener('chargingchange', syncBattery);
    };
  }, []);

  const isLowPower = isLowBattery || prefersReducedMotion || isConstrainedDevice();
  const useDarkTheme = preference === 'dark' ||
    (preference === 'system' && (isDarkSystem || isLowBattery));

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = useDarkTheme ? 'dark' : 'light';
    root.dataset.appearancePreference = preference;
    root.dataset.powerMode = isLowPower ? 'conserve' : 'normal';
  }, [isLowPower, preference, useDarkTheme]);

  return { preference, isLowPower, cyclePreference };
}
