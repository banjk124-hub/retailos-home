import { useEffect, useState } from 'react';

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

const LOW_BATTERY_THRESHOLD = 0.2;
const REMOVED_APPEARANCE_STORAGE_KEY = 'retailos.appearance.v1';

function isConstrainedDevice(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  const cores = navigator.hardwareConcurrency;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return Boolean(connection?.saveData) || (typeof cores === 'number' && cores <= 4) ||
    (typeof memory === 'number' && memory <= 4);
}

export function useAdaptiveAppearance(): void {
  const [isLowBattery, setIsLowBattery] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMediaPreferences = () => {
      setPrefersReducedMotion(reducedMotion.matches);
    };
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
        console.warn('Không thể đọc trạng thái pin; tiếp tục với chế độ hiệu ứng thông thường:', error);
      }
    };
    void attachBattery();

    return () => {
      cancelled = true;
      reducedMotion.removeEventListener('change', syncMediaPreferences);
      battery?.removeEventListener('levelchange', syncBattery);
      battery?.removeEventListener('chargingchange', syncBattery);
    };
  }, []);

  const isLowPower = isLowBattery || prefersReducedMotion || isConstrainedDevice();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = 'light';
    try {
      localStorage.removeItem(REMOVED_APPEARANCE_STORAGE_KEY);
    } catch (error) {
      console.warn('Không thể xóa tùy chọn giao diện tối đã bỏ:', error);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.powerMode = isLowPower ? 'conserve' : 'normal';
  }, [isLowPower]);
}
