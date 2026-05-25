/** A single zoom level in the fractal text stack. */
export interface ZoomLevel {
  /** The text to display at this level */
  text: string;
  /** Character index of the "portal" letter (the one you zoom into to find the next level).
   *  Omit on the last level (no portal needed — nothing deeper). */
  portalIndex?: number;
}

/** Split a level's text around its portal character. */
export function splitAtPortal(level: ZoomLevel): { before: string; portal: string; after: string } | null {
  if (level.portalIndex == null) return null;
  return {
    before: level.text.slice(0, level.portalIndex),
    portal: level.text[level.portalIndex],
    after: level.text.slice(level.portalIndex + 1),
  };
}

/**
 * Default levels — add as many as you want.
 * Each portal character becomes the "window" you zoom into to see the next level.
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
