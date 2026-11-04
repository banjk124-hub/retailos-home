import type { CSSProperties } from 'react';
import { BrandMark } from '../brand';
import {
  getBackgroundDefinition,
  type BackgroundExperience,
} from '../config/backgrounds';

type Props = {
  experience: BackgroundExperience;
};

type BackgroundStyle = CSSProperties & {
  '--brand-background-accent': string;
  '--brand-background-glow': number;
  '--brand-background-mark-opacity': number;
};

export function ExperienceBackground({ experience }: Props) {
  const background = getBackgroundDefinition(experience);
  const style: BackgroundStyle = {
    '--brand-background-accent': background.accent,
    '--brand-background-glow': background.glow,
    '--brand-background-mark-opacity': background.markOpacity,
  };

  return (
    <div
      className="retailos-background"
      data-experience={experience}
      aria-hidden="true"
      style={style}
    >
      <span className="retailos-background__glow retailos-background__glow--primary" />
      <span className="retailos-background__glow retailos-background__glow--secondary" />
      <span className="retailos-background__halo" />
      <BrandMark className="retailos-background__mark" />
    </div>
  );
}
