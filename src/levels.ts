/** A single zoom level in the fractal stack. Either text or image. */
export interface ZoomLevel {
  /** The text to display (for text levels) */
  text?: string;
  /** Character index of the "portal" letter (the one you zoom into to find the next level).
   *  Omit on the last level (no portal needed — nothing deeper). */
  portalIndex?: number;

  /** URL or path to an image (for image levels). Mutually exclusive with text. */
  imageUrl?: string;
  /** Portal position within the image as percentages from top-left (0–100).
   *  This is where the next level lives — zoom into this spot. */
  portalPosition?: { x: number; y: number };
}

/** True if this level displays an image rather than text. */
export function isImageLevel(level: ZoomLevel): boolean {
  return !!level.imageUrl;
}

/** Split a text level's text around its portal character. */
export function splitAtPortal(level: ZoomLevel): { before: string; portal: string; after: string } | null {
  if (!level.text || level.portalIndex == null) return null;
  return {
    before: level.text.slice(0, level.portalIndex),
    portal: level.text[level.portalIndex],
    after: level.text.slice(level.portalIndex + 1),
  };
}

/** Get a display label for any level (text or image). */
export function levelLabel(level: ZoomLevel): string {
  if (level.imageUrl) {
    const name = level.imageUrl.split('/').pop() || level.imageUrl;
    return `🖼 ${name}`;
  }
  return level.text || '(empty)';
}

/**
 * Default levels — add as many as you want.
 * Each portal character / portal position becomes the "window" you zoom into
 * to see the next level.
 *
 * Text levels use `portalIndex` (character index).
 * Image levels use `portalPosition` ({ x, y } as percentages 0–100 from top-left).
 *
 *   Level 0: "Welcome"           → zoom into the "o" (index 4)
 *   Level 1: "to the zoom grid"  → zoom into the "o" in "zoom" (index 8)
 *   Level 2: "going deeper"      → zoom into the "o" (index 1)
 *   Level 3: "how far down"      → zoom into the "o" (index 2)
 *   Level 4: "bottom"            → last level, no portal
 */
export const DEFAULT_LEVELS: ZoomLevel[] = [
  { text: 'Welcome', portalIndex: 4 },
  { text: 'to the zoom grid', portalIndex: 8 },
  { text: 'going deeper', portalIndex: 1 },
  { text: 'how far down', portalIndex: 2 },
  { text: 'bottom' },
];
