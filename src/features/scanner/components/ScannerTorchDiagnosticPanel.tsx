import type { CSSProperties } from 'react';
import type { ScannerTorchDiagnosticSample } from '../../../platform/scanner/contracts';

type Props = {
  samples: ScannerTorchDiagnosticSample[];
};

const panelStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 220,
  left: 10,
  right: 10,
  bottom: 'max(10px, env(safe-area-inset-bottom))',
  maxHeight: '38dvh',
  overflow: 'auto',
  border: '1px solid rgba(255,255,255,.28)',
  borderRadius: 12,
  background: 'rgba(18, 20, 25, .94)',
  color: '#f7f8fa',
  boxShadow: '0 8px 28px rgba(0,0,0,.32)',
  font: '11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(112px, 42%) minmax(0, 1fr)',
  gap: 8,
  padding: '3px 0',
  borderTop: '1px solid rgba(255,255,255,.1)',
  overflowWrap: 'anywhere',
};

function value(value: string | number | boolean | null): string {
  return value === null ? 'not-reported' : String(value);
}

/** Opt-in, read-only diagnostic surface. Enabled only by ?scannerDebug=1. */
export default function ScannerTorchDiagnosticPanel({ samples }: Props) {
  if (samples.length === 0) return null;
  return (
    <details style={panelStyle} open>
      <summary style={{ position: 'sticky', top: 0, padding: '9px 11px', background: '#242832', fontWeight: 800, cursor: 'pointer' }}>
        SCANNER TORCH DIAGNOSTICS · {samples.length} samples
      </summary>
      <div style={{ padding: '7px 11px 10px' }}>
        {samples.map((sample) => (
          <section key={sample.sample} style={{ marginBottom: 10 }}>
            <strong>{sample.sample} · +{sample.elapsedMs}ms</strong>
            <div style={rowStyle}><span>torch capability</span><strong>{value(sample.torchCapability)}</strong></div>
            <div style={rowStyle}><span>settings.torch</span><strong>{value(sample.settingsTorch)}</strong></div>
            <div style={rowStyle}><span>getCapabilities()</span><span>{sample.capabilityApi}{sample.capabilitiesErrorName ? ` · ${sample.capabilitiesErrorName}` : ''}</span></div>
            <div style={rowStyle}><span>getSettings()</span><span>{sample.settingsApi}{sample.settingsErrorName ? ` · ${sample.settingsErrorName}` : ''}</span></div>
            <div style={rowStyle}><span>applyConstraints()</span><span>{value(sample.applyConstraintsApi)}</span></div>
            <div style={rowStyle}><span>track</span><span>{sample.trackReadyState} · muted={value(sample.trackMuted)}</span></div>
            <div style={rowStyle}><span>camera</span><span>{value(sample.facingMode)} · {value(sample.width)}×{value(sample.height)} · {value(sample.frameRate)}fps</span></div>
          </section>
        ))}
        <p style={{ margin: '8px 0 0', color: '#bdc4d1' }}>
          Debug only. No deviceId or personal identifiers are collected. Remove ?scannerDebug=1 to hide this panel.
        </p>
      </div>
    </details>
  );
}
