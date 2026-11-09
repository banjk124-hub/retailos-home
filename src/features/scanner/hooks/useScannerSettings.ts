import { useSyncExternalStore } from 'react';
import {
  getScannerSettings,
  subscribeScannerSettings,
} from '../services/scannerSettingsStore';

/** Reactive view of the one device-local scanner preference store. */
export function useScannerSettings() {
  return useSyncExternalStore(
    subscribeScannerSettings,
    getScannerSettings,
    getScannerSettings,
  );
}
