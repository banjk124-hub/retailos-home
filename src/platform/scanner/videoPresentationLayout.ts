const PRESENTATION_LAYOUT_MAX_FRAMES = 8;
const PRESENTATION_LAYOUT_TOLERANCE_PX = 1;

type RectSnapshot = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function readRect(element: Element): RectSnapshot {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function isUsableRect(rect: RectSnapshot): boolean {
  return rect.width > 1 && rect.height > 1;
}

function rectsMatch(a: RectSnapshot, b: RectSnapshot): boolean {
  return Math.abs(a.left - b.left) <= PRESENTATION_LAYOUT_TOLERANCE_PX
    && Math.abs(a.top - b.top) <= PRESENTATION_LAYOUT_TOLERANCE_PX
    && Math.abs(a.width - b.width) <= PRESENTATION_LAYOUT_TOLERANCE_PX
    && Math.abs(a.height - b.height) <= PRESENTATION_LAYOUT_TOLERANCE_PX;
}

/**
 * Wait for the mounted preview box and its video element to share stable,
 * non-zero geometry before attaching a MediaStream. This is a short,
 * event-loop/layout barrier for WebKit's native video presentation layer;
 * it does not poll media frames or acquire camera resources.
 */
export async function waitForVideoPresentationLayout(video: HTMLVideoElement): Promise<void> {
  const container = video.parentElement;
  if (!container) {
    throw new Error('Camera preview element is missing its presentation container.');
  }

  let previousContainer: RectSnapshot | null = null;
  let previousVideo: RectSnapshot | null = null;

  for (let frame = 0; frame < PRESENTATION_LAYOUT_MAX_FRAMES; frame += 1) {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    const containerRect = readRect(container);
    const videoRect = readRect(video);
    const geometryMatches = isUsableRect(containerRect)
      && isUsableRect(videoRect)
      && rectsMatch(containerRect, videoRect);
    const geometryIsStable = previousContainer !== null
      && previousVideo !== null
      && rectsMatch(previousContainer, containerRect)
      && rectsMatch(previousVideo, videoRect);

    if (geometryMatches && geometryIsStable) return;

    previousContainer = containerRect;
    previousVideo = videoRect;
  }

  throw new Error('Camera preview layout did not stabilize before video playback.');
}
