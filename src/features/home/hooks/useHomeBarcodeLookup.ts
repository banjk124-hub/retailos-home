import { useCallback, useState } from 'react';
import { lookupCachedBarcode, searchCachedProducts, type BarcodeProductRecord } from '../../scanner/services/barcodeLookup';

export type HomeBarcodeLookupState = {
  query: string;
  requestId: number;
  records: BarcodeProductRecord[] | null;
  error?: string;
  failedSources?: string[];
};

export function useHomeBarcodeLookup() {
  const [barcodeLookup, setBarcodeLookup] = useState<HomeBarcodeLookupState | null>(null);
  const requestIdRef = useState({ current: 0 })[0];

  const runBarcodeLookup = useCallback((barcode: string) => {
    const requestId = ++requestIdRef.current;
    setBarcodeLookup({ query: barcode, requestId, records: null });
    void lookupCachedBarcode(barcode).then(({ records, failedSources }) => {
      setBarcodeLookup((current) => current?.requestId === requestId
        ? { ...current, records, failedSources }
        : current);
    }).catch((error: unknown) => {
      console.error('Không thể tra cứu thông tin cho mã barcode đã quét:', error);
      setBarcodeLookup((current) => current?.requestId === requestId
        ? { ...current, records: [], error: 'Không thể đọc dữ liệu sản phẩm đã lưu trên thiết bị.' }
        : current);
    });
  }, []);

  const openManualProductLookup = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setBarcodeLookup({ query: '', requestId, records: [] });
  }, []);

  const submitManualProductLookup = useCallback((queryInput?: string) => {
    const query = (queryInput ?? barcodeLookup?.query ?? '').trim();
    if (!query) return;
    const requestId = ++requestIdRef.current;
    setBarcodeLookup({ query, requestId, records: null });
    void searchCachedProducts(query).then(({ records, failedSources }) => {
      setBarcodeLookup((current) => current?.requestId === requestId
        ? { ...current, records, failedSources }
        : current);
    }).catch((error: unknown) => {
      console.error('Không thể tra cứu sản phẩm từ snapshot:', error);
      setBarcodeLookup((current) => current?.requestId === requestId
        ? { ...current, records: [], error: 'Không thể đọc dữ liệu sản phẩm đã lưu trên thiết bị.' }
        : current);
    });
  }, [barcodeLookup?.query]);

  return { barcodeLookup, setBarcodeLookup, runBarcodeLookup, openManualProductLookup, submitManualProductLookup };
}
