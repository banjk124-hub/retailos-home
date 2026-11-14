/**
 * Platform-neutral contracts for the RetailOS Universal Scanner.
 *
 * These contracts deliberately contain no React, camera acquisition, decoder
 * implementation, or feature presentation dependencies.
 */

export const SUPPORTED_BARCODE_FORMATS = [
  'EAN_8', 'EAN_13', 'UPC_A', 'UPC_E',
  'CODE_128', 'CODE_39', 'CODE_93', 'ITF', 'CODABAR',
  'QR_CODE', 'DATA_MATRIX', 'PDF_417', 'AZTEC',
  'RSS_14', 'RSS_EXPANDED', 'MAXICODE', 'MICRO_QR_CODE',
] as const;

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

export type ScannerProfileName = 'LOW' | 'MID' | 'HIGH';
export type ScannerProfileReason =
  | 'limited_capability_hint'
  | 'strong_capability_hints'
  | 'mixed_or_mid_capability_hints'
  | 'unknown_capability_conservative_fallback';

/**
 * A rectangle expressed in normalized coordinates.
 * Values are fractions of the referenced image/content dimensions, never CSS pixels.
 */
export type ScannerNormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Feature-owned scan region in the visible video-content coordinate space.
 * Origin is the top-left of the visible image; x increases left-to-right as
 * rendered by the module, including any CSS mirror transform.
 */
export type ScannerPreviewScanRegion = {
  coordinateSpace: 'preview-content-normalized';
  rect: ScannerNormalizedRect;
};

/**
 * Resolved scan region consumed by scanner processing.
 * Coordinates refer to the unrotated camera source frame, before decoder-side
 * rotation, deskew or perspective correction.
 */
export type ScannerSourceScanRegion = {
  coordinateSpace: 'source-frame-normalized';
  rect: ScannerNormalizedRect;
};

/**
 * Module intent for the camera opened from the initiating user gesture.
 * Dimensions and frame rates are preferred/ideal values, not exact demands.
 * maxFrameRate, when present, is a hard upper bound for a shared stream.
 */
export type ScannerCameraRequest = {
  facingMode: 'environment' | 'user';
  preferredWidth: number;
  preferredHeight: number;
  preferredFrameRate: number;
  maxFrameRate?: number;
};

/**
 * Required module-owned input to the shared scanner.
 * Preview geometry is resolved by the feature-owned region binding. The
 * camera request travels with the tap-origin lease and is retained by the
 * platform session so foreground recovery can reacquire the same intent.
 */
export type ScannerModuleConfig = {
  previewScanRegion: ScannerPreviewScanRegion;
  cameraRequest: ScannerCameraRequest;
};

/** Prefer 1080p source detail for small/far retail labels; browsers may negotiate lower. */
export const DEFAULT_SCANNER_CAMERA_REQUEST: ScannerCameraRequest = {
  facingMode: 'environment',
  preferredWidth: 1920,
  preferredHeight: 1080,
  preferredFrameRate: 30,
  maxFrameRate: 30,
};

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
  /** Advisory device capability tier; runtime pressure remains the adaptation authority. */
  profile: ScannerProfileName;
  profileReason?: ScannerProfileReason;
  formats: ScannerSymbology[];
  mode: 'single' | 'continuous';
  sameCodeCooldownMs?: number;
  onResult: (result: ScannerResult) => void;
  onStateChange?: (state: ScannerLifecycleState) => void;
  /** Optional feature observer. The platform session binds it to its own session ID. */
  lifecycleObserver?: ScannerLifecycleObserver;
  /** Fires once the attached video element has its first usable camera frame. */
  onPreviewReady?: () => void;
  /** Optional technical camera capability updates; presentation stays feature-owned. */
  onTorchStateChange?: (state: ScannerTorchState) => void;
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
  /** Update the active source-frame ROI without restarting camera, decoder or frame loop. */
  setScanRegion(region: ScannerSourceScanRegion | null): void;
  /** Return a defensive snapshot of the currently published source-frame ROI. */
  getScanRegion(): ScannerSourceScanRegion | null;
  start(): Promise<void>;
  getTorchState(): ScannerTorchState;
  setTorchEnabled(enabled: boolean): Promise<ScannerTorchState>;
  suspend(reason?: 'hidden' | 'manual'): Promise<void>;
  resume(): Promise<void>;
  /** Retire this session for foreground recovery without emitting feature exit milestones. */
  disposeForRecovery(): Promise<void>;
  close(): Promise<void>;
}
