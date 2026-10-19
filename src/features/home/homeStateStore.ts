export type HomeUiState = {
  activeNav: string;
  search: string;
  activeFilter: string;
  scrollY: number;
};

const HOME_STATE_KEY = 'retailos.homeUi.v1';
const DEFAULT_STATE: HomeUiState = { activeNav: 'home', search: '', activeFilter: 'Tất cả', scrollY: 0 };

export function readHomeUiState(): HomeUiState {
  try {
    const parsed = JSON.parse(localStorage.getItem(HOME_STATE_KEY) ?? 'null') as Partial<HomeUiState> | null;
    if (!parsed) return DEFAULT_STATE;
    return {
      activeNav: typeof parsed.activeNav === 'string' ? parsed.activeNav : DEFAULT_STATE.activeNav,
      search: typeof parsed.search === 'string' ? parsed.search : DEFAULT_STATE.search,
      activeFilter: typeof parsed.activeFilter === 'string' ? parsed.activeFilter : DEFAULT_STATE.activeFilter,
      scrollY: typeof parsed.scrollY === 'number' && Number.isFinite(parsed.scrollY) ? Math.max(0, parsed.scrollY) : 0,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveHomeUiState(state: HomeUiState): void {
  try { localStorage.setItem(HOME_STATE_KEY, JSON.stringify(state)); }
  catch { /* The UI remains usable if storage is unavailable. */ }
}
