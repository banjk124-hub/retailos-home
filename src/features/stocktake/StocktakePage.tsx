import { useCallback, useMemo } from 'react';
import { ClipboardCheck, Home } from 'lucide-react';
import type { JourneyPageProps } from '../../platform/journey/journeyPageRegistry';
import { useJourneyController } from '../../platform/journey/JourneyControllerProvider';
import { useShellNavigationRegistration } from '../../platform/shell/shellNavigationContext';
import StocktakeModule from './components/StocktakeModule';

const STOCKTAKE_NAV_ITEMS = [
  { id: 'home', label: 'Trang chủ', icon: Home },
  { id: 'stocktake', label: 'Kiểm kê', icon: ClipboardCheck },
];

export default function StocktakePage({ employee, platform }: JourneyPageProps) {
  const journey = useJourneyController();
  const returnHome = useCallback(() => {
    void journey.dispatch({ kind: 'pop' });
  }, [journey]);
  const handleShellSelect = useCallback((id: string) => {
    if (id === 'home') returnHome();
  }, [returnHome]);
  const navigationConfig = useMemo(() => ({
    items: STOCKTAKE_NAV_ITEMS,
    activeId: 'stocktake',
    onSelect: handleShellSelect,
    label: 'Điều hướng kiểm kê',
  }), [handleShellSelect]);

  useShellNavigationRegistration('stocktake', navigationConfig);

  return (
    <main className="app-shell has-shell-navigation stocktake-page-shell">
      <StocktakeModule employee={employee} onClose={returnHome} platform={platform} />
    </main>
  );
}
