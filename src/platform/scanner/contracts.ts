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
 * Feature-consumable lifecycle milestones. These describe resource and
 * presentation boundaries; they are not a mandatory linear UI state machine.
 */
export type ScannerLifecycleEventName =
  | 'OPENING'
  | 'READY'
  | 'SCANNING'
  | 'EXIT_REQUESTED'
  | 'CAMERA_RELEASED'
  | 'EXIT_PRESENTATION'
  | 'DISPOSED';

export type ScannerLifecycleEvent = {
  type: ScannerLifecycleEventName;
  sessionId: string;
  timestamp: number;
};

export type ScannerLifecycleObserver = (event: ScannerLifecycleEvent) => void;

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
  suspend(reason?: 'hidden' | 'manual'): Promise<void>;
  resume(): Promise<void>;
  /** Retire this session for foreground recovery without emitting feature exit milestones. */
  disposeForRecovery(): Promise<void>;
  close(): Promise<void>;
  /** Publish completion of the feature-owned exit presentation. */
  notifyExitPresentation(): void;
}
