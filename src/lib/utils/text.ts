/**
 * Normalize text for tolerant search: lowercase, strip accents, collapse spaces.
 */
export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Bounded Levenshtein distance. Returns Infinity when distance exceeds `max`.
 */
export function levenshteinBounded(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return Number.POSITIVE_INFINITY;
  if (la === 0) return lb <= max ? lb : Number.POSITIVE_INFINITY;
  if (lb === 0) return la <= max ? la : Number.POSITIVE_INFINITY;

  let prev = new Array<number>(lb + 1);
  let curr = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0]!;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      const val = Math.min(
        (prev[j]! + 1),
        (curr[j - 1]! + 1),
        (prev[j - 1]! + cost),
      );
      curr[j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > max) return Number.POSITIVE_INFINITY;
    [prev, curr] = [curr, prev];
  }

  const dist = prev[lb]!;
  return dist <= max ? dist : Number.POSITIVE_INFINITY;
}

/** True when `hay` contains `needle` or a fuzzy token match within max edits. */
export function fuzzyIncludes(
  hay: string,
  needle: string,
  maxDistance = 2,
): boolean {
  if (!needle) return true;
  if (hay.includes(needle)) return true;
  if (needle.length < 4) return false;

  const tokens = hay.split(" ").filter((t) => t.length >= needle.length - maxDistance);
  for (const token of tokens) {
    if (levenshteinBounded(token, needle, maxDistance) <= maxDistance) {
      return true;
    }
  }

  // Sliding window for multi-word cities (e.g. "sao paulo")
  if (needle.includes(" ")) {
    const window = needle.length + maxDistance;
    for (let i = 0; i <= hay.length - needle.length + maxDistance; i++) {
      const slice = hay.slice(i, i + window);
      if (levenshteinBounded(slice.slice(0, needle.length), needle, maxDistance) <= maxDistance) {
        return true;
      }
    }
  }

  return false;
}
