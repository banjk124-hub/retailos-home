type Props = {
  className?: string;
};

export function BrandMark({ className = '' }: Props) {
  return (
    <svg
      className={`retailos-brand-glyph ${className}`.trim()}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className="retailos-brand-glyph__spine" d="M11 38V10" />
      <path className="retailos-brand-glyph__letter" d="M12 11h14c7 0 11 4 11 10s-4 10-11 10H12m13-10 12 17" />
      <path className="retailos-brand-glyph__shelf" d="M8 41h32" />
      <circle className="retailos-brand-glyph__signal" cx="37" cy="9" r="3" />
    </svg>
  );
}
