export type BackgroundExperience = 'login' | 'home' | 'scanner';

export type BackgroundDefinition = {
  id: string;
  accent: string;
  glow: number;
  markOpacity: number;
};

export const BACKGROUND_REGISTRY = {
  'retailos-login': {
    id: 'retailos-login',
    accent: '#e51f2d',
    glow: 0.2,
    markOpacity: 0.08,
  },
  'retailos-home': {
    id: 'retailos-home',
    accent: '#d92736',
    glow: 0.14,
    markOpacity: 0.06,
  },
  'retailos-scanner': {
    id: 'retailos-scanner',
    accent: '#bd1429',
    glow: 0.1,
    markOpacity: 0.05,
  },
} satisfies Record<string, BackgroundDefinition>;

export const DEFAULT_BACKGROUNDS: Record<BackgroundExperience, keyof typeof BACKGROUND_REGISTRY> = {
  login: 'retailos-login',
  home: 'retailos-home',
  scanner: 'retailos-scanner',
};

export function getBackgroundDefinition(experience: BackgroundExperience) {
  return BACKGROUND_REGISTRY[DEFAULT_BACKGROUNDS[experience]];
}
