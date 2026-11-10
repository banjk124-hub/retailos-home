/**
 * Rotate a single-channel luminance frame 90 degrees clockwise.
 * Coordinates are source pixels; output width/height are swapped.
 * Invalid dimensions or buffer lengths fail closed.
 */
export function rotateLuminance90Clockwise(
  luminance: Uint8ClampedArray,
  width: number,
  height: number,
): { luminance: Uint8ClampedArray; width: number; height: number } | null {
  if (!(luminance instanceof Uint8ClampedArray)
    || !Number.isSafeInteger(width)
    || !Number.isSafeInteger(height)
    || width <= 0
    || height <= 0
    || !Number.isSafeInteger(width * height)
    || luminance.length !== width * height) {
    return null;
  }

  const rotatedWidth = height;
  const rotatedHeight = width;
  const rotated = new Uint8ClampedArray(luminance.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const destinationIndex = x * rotatedWidth + (height - 1 - y);
      rotated[destinationIndex] = luminance[y * width + x];
    }
  }

  return {
    luminance: rotated,
    width: rotatedWidth,
    height: rotatedHeight,
  };
}

/**
 * Keep the expensive orientation/deskew path on a stable valid-ROI sequence.
 * This counter is deliberately independent of diagnostics sampling windows.
 */
export function shouldAttemptExtendedDecode(frameSequence: number): boolean {
  return Number.isSafeInteger(frameSequence)
    && frameSequence > 0
    && frameSequence % 3 === 0;
}
