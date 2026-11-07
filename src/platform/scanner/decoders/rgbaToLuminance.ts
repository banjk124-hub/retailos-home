/**
 * Convert Canvas ImageData RGBA pixels into an 8-bit grayscale luminance
 * buffer expected by ZXing's RGBLuminanceSource.
 *
 * ImageData stores 4 bytes per pixel (R, G, B, A).
 * ZXing expects 1 luminance byte per pixel when given Uint8ClampedArray.
 */
export function rgbaToLuminance(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width <= 0 || height <= 0) {
    throw new Error('Invalid image dimensions for RGBA luminance conversion.');
  }

  const pixelCount = width * height;

  if (!Number.isSafeInteger(pixelCount) || rgba.length !== pixelCount * 4) {
    throw new Error('RGBA buffer length does not match the supplied dimensions.');
  }

  const luminance = new Uint8ClampedArray(pixelCount);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const red = rgba[offset];
    const green = rgba[offset + 1];
    const blue = rgba[offset + 2];

    // Rec. 601 luma approximation. Alpha is intentionally ignored.
    luminance[pixel] = Math.round(
      0.299 * red + 0.587 * green + 0.114 * blue,
    );
  }

  return luminance;
}