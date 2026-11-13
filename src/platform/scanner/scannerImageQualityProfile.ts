import type { ScannerFocusQualitySample } from './scannerFocusQuality';
import type { ScannerImageQuality, ScannerImageQualityIssue } from './scannerImageEnhancement';

export type ScannerImageQualityFindingCode = ScannerImageQualityIssue | 'low_sharpness' | 'motion_detected' | 'insufficient_visual_detail';
export type ScannerImageQualityFinding = {
  code: ScannerImageQualityFindingCode;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  recommendation: string;
};

export type ScannerImageQualityProfile = {
  schemaVersion: 1; timestamp: number;
  roi: { frameWidth: number; frameHeight: number; x: number; y: number; width: number; height: number; sampleWidth: number; sampleHeight: number };
  focus: { valid: boolean; sharpness: number; edgeCoverage: number; luminanceStdDev: number; motionScore: number; motionAvailable: boolean };
  exposure: { meanLuminance: number; darkFraction: number; brightFraction: number; dynamicRange: number };
  contrast: { horizontal: number; vertical: number; edgeStrength: number };
  noise: { horizontal: number; vertical: number };
  glare: { fraction: number; bandCoverage: number; orientation: 'horizontal' | 'vertical' | 'both' | null };
  issues: ScannerImageQualityIssue[];
  findings: ScannerImageQualityFinding[];
  diagnosis: string | null;
};

export type ScannerImageQualityProfileInput = {
  timestamp: number; frameWidth: number; frameHeight: number;
  roiX: number; roiY: number; roiWidth: number; roiHeight: number;
  sampleWidth: number; sampleHeight: number;
  focus: Pick<ScannerFocusQualitySample, 'valid' | 'sharpness' | 'edgeCoverage' | 'luminanceStdDev' | 'motionScore' | 'motionAvailable'>;
  image: ScannerImageQuality;
};

const finite = (values: number[]) => values.every(Number.isFinite);
const round = (value: number) => Number(value.toFixed(2));

const ISSUE_FINDINGS: Record<ScannerImageQualityIssue, Omit<ScannerImageQualityFinding, 'code'>> = {
  low_dynamic_range: { severity: 'warning', description: 'Ảnh có dải sáng tối hẹp, các vạch barcode khó tách biệt.', recommendation: 'Đưa mã vạch đến vùng sáng đều hơn và tránh nền phản sáng.' },
  low_contrast: { severity: 'warning', description: 'Độ tương phản của các vạch barcode đang thấp.', recommendation: 'Giữ mã vạch hướng thẳng về camera và tránh ánh sáng chiếu xiên.' },
  underexposed: { severity: 'warning', description: 'Ảnh đang thiếu sáng; chi tiết tối của mã vạch có thể bị mất.', recommendation: 'Đưa mã vạch đến nơi đủ sáng và tránh bóng che vùng quét.' },
  overexposed: { severity: 'warning', description: 'Ảnh đang quá sáng; vùng trắng có thể bị mất chi tiết.', recommendation: 'Điều chỉnh góc sản phẩm để giảm ánh sáng chiếu trực tiếp.' },
  shadow_clipping: { severity: 'warning', description: 'Một phần ảnh bị chìm đen, làm mất ranh giới giữa các vạch.', recommendation: 'Tránh bóng đổ lên mã vạch và tăng ánh sáng môi trường.' },
  highlight_clipping: { severity: 'warning', description: 'Một phần ảnh bị cháy sáng, làm mất ranh giới giữa các vạch.', recommendation: 'Điều chỉnh góc sản phẩm để giảm vùng sáng gắt.' },
  high_noise: { severity: 'warning', description: 'Ảnh có nhiều nhiễu, đường biên barcode không ổn định.', recommendation: 'Giữ thiết bị ổn định và cải thiện ánh sáng trước khi quét lại.' },
  specular_glare: { severity: 'critical', description: 'Phát hiện vùng phản sáng; thông tin hình ảnh tại vùng này có thể đã bị mất.', recommendation: 'Nghiêng nhẹ sản phẩm để đưa vùng phản sáng ra khỏi mã vạch.' },
};

function buildFindings(focus: ScannerImageQualityProfileInput['focus'], image: ScannerImageQuality): ScannerImageQualityFinding[] {
  const findings = image.issues.map((code) => ({ code, ...ISSUE_FINDINGS[code] }));
  if (focus.motionAvailable && focus.motionScore > 14) findings.push({
    code: 'motion_detected', severity: 'warning',
    description: 'Hình ảnh thay đổi rõ giữa các khung hình; thiết bị hoặc sản phẩm có thể đang rung/di chuyển.',
    recommendation: 'Giữ thiết bị và sản phẩm ổn định trong giây lát.',
  });
  if (focus.valid && focus.edgeCoverage >= 0.002 && focus.sharpness < 8) findings.push({
    code: 'low_sharpness', severity: 'warning',
    description: 'Các cạnh trong vùng mã vạch chưa đủ sắc nét để nhận dạng ổn định.',
    recommendation: 'Giữ camera ổn định và điều chỉnh khoảng cách để mã vạch rõ nét hơn.',
  });
  if (!focus.valid) findings.push({
    code: 'insufficient_visual_detail', severity: 'info',
    description: 'Chưa có đủ chi tiết hình ảnh để đánh giá độ nét; chưa thể kết luận camera bị mất nét.',
    recommendation: 'Đưa mã vạch vào rõ vùng quét và giữ yên để hệ thống đánh giá lại.',
  });
  return findings;
}

/** Builds a scalar-only observation profile and multi-label diagnosis. No camera, decode or UI decisions. */
export function createScannerImageQualityProfile(input: ScannerImageQualityProfileInput): ScannerImageQualityProfile | null {
  const { timestamp, frameWidth, frameHeight, roiX, roiY, roiWidth, roiHeight, sampleWidth, sampleHeight, focus, image } = input;
  if (![frameWidth, frameHeight, roiX, roiY, roiWidth, roiHeight, sampleWidth, sampleHeight].every(Number.isSafeInteger)
    || frameWidth < 1 || frameHeight < 1 || roiX < 0 || roiY < 0 || roiWidth < 1 || roiHeight < 1
    || roiX + roiWidth > frameWidth || roiY + roiHeight > frameHeight
    || sampleWidth < 1 || sampleHeight < 1 || !Number.isSafeInteger(sampleWidth * sampleHeight)
    || sampleWidth * sampleHeight > 1_500_000 || !Number.isFinite(timestamp)
    || !finite([focus.sharpness, focus.edgeCoverage, focus.luminanceStdDev, focus.motionScore, image.meanLuminance, image.darkFraction, image.brightFraction, image.dynamicRange, image.contrast, image.verticalContrast, image.edgeStrength, image.noise, image.verticalNoise, image.specularGlareFraction, image.glareBandCoverage])
    || typeof focus.valid !== 'boolean' || typeof focus.motionAvailable !== 'boolean'
    || focus.sharpness < 0 || focus.edgeCoverage < 0 || focus.edgeCoverage > 1 || focus.luminanceStdDev < 0 || focus.motionScore < 0
    || image.darkFraction < 0 || image.darkFraction > 1 || image.brightFraction < 0 || image.brightFraction > 1
    || image.specularGlareFraction < 0 || image.specularGlareFraction > 1 || image.glareBandCoverage < 0 || image.glareBandCoverage > 1
    || image.meanLuminance < 0 || image.meanLuminance > 255 || image.dynamicRange < 0 || image.dynamicRange > 255
    || image.contrast < 0 || image.verticalContrast < 0 || image.edgeStrength < 0 || image.noise < 0 || image.verticalNoise < 0
    || !Array.isArray(image.issues) || image.issues.some((issue) => !Object.hasOwn(ISSUE_FINDINGS, issue))
    || !['horizontal', 'vertical', 'both', null].includes(image.glareBandOrientation)) return null;
  const findings = buildFindings(focus, image);
  return {
    schemaVersion: 1, timestamp,
    roi: { frameWidth, frameHeight, x: roiX, y: roiY, width: roiWidth, height: roiHeight, sampleWidth, sampleHeight },
    focus: { valid: focus.valid, sharpness: round(focus.sharpness), edgeCoverage: round(focus.edgeCoverage), luminanceStdDev: round(focus.luminanceStdDev), motionScore: round(focus.motionScore), motionAvailable: focus.motionAvailable },
    exposure: { meanLuminance: round(image.meanLuminance), darkFraction: round(image.darkFraction), brightFraction: round(image.brightFraction), dynamicRange: round(image.dynamicRange) },
    contrast: { horizontal: round(image.contrast), vertical: round(image.verticalContrast), edgeStrength: round(image.edgeStrength) },
    noise: { horizontal: round(image.noise), vertical: round(image.verticalNoise) },
    glare: { fraction: round(image.specularGlareFraction), bandCoverage: round(image.glareBandCoverage), orientation: image.glareBandOrientation },
    issues: [...image.issues], findings, diagnosis: findings.length ? findings.map((finding) => finding.description).join(' ') : null,
  };
}
