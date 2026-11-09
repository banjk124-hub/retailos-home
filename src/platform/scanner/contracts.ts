/**
 * Platform-neutral contracts for the RetailOS Universal Scanner.
 *
 * These contracts deliberately contain no React, camera acquisition, decoder
 * implementation, or feature presentation dependencies.
 */

export const SUPPORTED_BARCODE_FORMATS = ['EAN_8', 'EAN_13', 'CODE_128'] as const;

export type SupportedBarcodeSymbology = (typeof SUPPORTED_BARCODE_FORMATS)[number];

export type ScannerSymbology =
  | 'EAN_8'
  | 'EAN_13'
  | 'UPC_A'
  | 'UPC_E'
  | 'CODE_128'
  | 'CODE_39'
  | 'CODE_93'
  | 'ITF'
  | 'CODABAR'
  | 'QR_CODE'
  | 'DATA_MATRIX'
  | 'PDF_417'
  | 'AZTEC'
  | 'RSS_14'
  | 'RSS_EXPANDED'
  | 'MAXICODE'
  | 'MICRO_QR_CODE';

export type ScannerProfileName = 'COMPACT' | 'STANDARD' | 'HIGH';

export type ScannerLifecycleState =
  | 'idle'
  | 'requesting'
  | 'initializing'
  | 'ready'
  | 'scanning'
  | 'suspended'
  | 'recovering'
  | 'stopped'
  | 'error'
  | 'disposed';


/**
 * Optional technical milestones emitted by the platform session.
 * They describe scanner resources and execution only; feature presentation
 * and UI completion are deliberately outside this contract.
 */
export type ScannerLifecycleEventName =
  | 'OPENING'
  | 'READY'
  | 'SCANNING'
  | 'SESSION_CLOSE_STARTED'
  | 'CAMERA_LEASE_RELEASED'
  | 'DISPOSED';

export type ScannerLifecycleEvent = {
  type: ScannerLifecycleEventName;
  sessionId: string;
  timestamp: number;
};

export type ScannerLifecycleObserver = (event: ScannerLifecycleEvent) => void;

/** Read-only Torch capability sample for on-device diagnostics. No device identifiers are exposed. */
export type ScannerTorchDiagnosticSample = {
  sample: 'first-frame' | '250ms' | '1000ms' | '2500ms';
  timestamp: number;
  elapsedMs: number;
  capabilityApi: 'available' | 'missing' | 'error';
  settingsApi: 'available' | 'missing' | 'error';
  torchCapability: boolean | 'not-exposed' | 'unavailable';
  settingsTorch: boolean | 'not-exposed' | 'unavailable';
  applyConstraintsApi: boolean;
  trackReadyState: string;
  trackMuted: boolean;
  facingMode: string | null;
  width: number | null;
  height: number | null;
  frameRate: number | null;
  capabilitiesErrorName: string | null;
  settingsErrorName: string | null;
};

/** Camera torch state. Support is discovered from the active video track. */
export type ScannerTorchState = {
  supported: boolean;
  enabled: boolean;
  pending: boolean;
  error?: string;
};


export type ScannerPoint = {
  x: number;
  y: number;
};

export type ScannerGeometry = {
  /** Coordinates are relative to the unrotated source frame, in pixels. */
  coordinateSpace: 'source-frame-pixels';
  frameWidth: number;
  frameHeight: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cornerPoints?: ScannerPoint[];
};

export type ScannerResult = {
  value: string;
  symbology: ScannerSymbology;
  geometry?: ScannerGeometry;
  timestamp: number;
  decoder: {
    id: string;
    version?: string;
  };
};

export type ScannerCameraProfile = {
  name: ScannerProfileName;
  preferredWidth: number;
  preferredHeight: number;
  preferredFrameRate?: number;
  facingMode: 'environment' | 'user';
};

export type ScannerActualCameraSettings = {
  width?: number;
  height?: number;
  frameRate?: number;
  facingMode?: string;
  deviceId?: string;
};

export type ScannerCapabilities = {
  secureContext: boolean;
  mediaDevices: boolean;
  getUserMedia: boolean;
  requestVideoFrameCallback: boolean;
  worker: boolean;
  webAssembly: boolean;
  vibration: boolean;
};

export type ScannerOpenOptions = {
  profile: ScannerProfileName;
  formats: ScannerSymbology[];
  mode: 'single' | 'continuous';
  sameCodeCooldownMs?: number;
  audioFeedback?: boolean;
  hapticFeedback?: boolean;
  onResult: (result: ScannerResult) => void;
  onStateChange?: (state: ScannerLifecycleState) => void;
  /** Optional feature observer. The platform session binds it to its own session ID. */
  lifecycleObserver?: ScannerLifecycleObserver;
  /** Fires once the attached video element has its first usable camera frame. */
  onPreviewReady?: () => void;
  /** Optional technical camera capability updates; presentation stays feature-owned. */
  onTorchStateChange?: (state: ScannerTorchState) => void;
  /** Optional read-only diagnostics; does not affect capability or presentation decisions. */
  onTorchDiagnosticsChange?: (sample: ScannerTorchDiagnosticSample) => void;
  onError?: (error: ScannerError) => void;
};

export type ScannerErrorCode =
  | 'INSECURE_CONTEXT'
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'PERMISSION_DISMISSED'
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_BUSY'
  | 'CONSTRAINTS_UNSATISFIED'
  | 'STREAM_INTERRUPTED'
  | 'DECODER_FAILED'
  | 'RESULT_HANDLER_FAILED'
  | 'LIFECYCLE_CONFLICT'
  | 'UNKNOWN';

export type ScannerError = {
  code: ScannerErrorCode;
  message: string;
  recoverable: boolean;
  cause?: unknown;
};

export interface ScannerSession {
  readonly id: string;
  readonly state: ScannerLifecycleState;
  start(): Promise<void>;
  getTorchState(): ScannerTorchState;
  setTorchEnabled(enabled: boolean): Promise<ScannerTorchState>;
  suspend(reason?: 'hidden' | 'manual'): Promise<void>;
  resume(): Promise<void>;
  /** Retire this session for foreground recovery without emitting feature exit milestones. */
  disposeForRecovery(): Promise<void>;
  close(): Promise<void>;
}
