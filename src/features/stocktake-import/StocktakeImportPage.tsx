import { useCallback, useMemo } from 'react';
import { FileSpreadsheet, Home } from 'lucide-react';
import type { JourneyPageProps } from '../../platform/journey/journeyPageRegistry';
import { useJourneyController } from '../../platform/journey/JourneyControllerProvider';
import { useShellNavigationRegistration } from '../../platform/shell/shellNavigationContext';
import StocktakeImportModule from './components/StocktakeImportModule';

const STOCKTAKE_IMPORT_NAV_ITEMS = [
  { id: 'home', label: 'Trang chủ', icon: Home },
  { id: 'stocktake-import', label: 'Xuất file', icon: FileSpreadsheet },
];

export default function StocktakeImportPage({ employee }: JourneyPageProps) {
  const journey = useJourneyController();
  const returnHome = useCallback(() => {
    void journey.dispatch({ kind: 'pop' });
  }, [journey]);
  const handleShellSelect = useCallback((id: string) => {
    if (id === 'home') returnHome();
  }, [returnHome]);
  const navigationConfig = useMemo(() => ({
    items: STOCKTAKE_IMPORT_NAV_ITEMS,
    activeId: 'stocktake-import',
    onSelect: handleShellSelect,
    label: 'Điều hướng xuất file kiểm kê',
  }), [handleShellSelect]);

  useShellNavigationRegistration('stocktake-import', navigationConfig);

  return (
    <main className="app-shell has-shell-navigation stocktake-import-page-shell">
      <StocktakeImportModule employee={employee} onClose={returnHome} />
    </main>
  );
}
