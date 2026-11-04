/** Strip Hebrew niqqud / cantillation so search matches regardless of vowel marks. */
export function stripNiqqud(s: string): string {
  return s.replace(/[֑-ׇ]/g, '')
}

export function normalize(s: string): string {
  return stripNiqqud(s).toLowerCase().trim()
}

export function matches(haystack: string, needle: string): boolean {
  const n = normalize(needle)
  if (!n) return true
  return normalize(haystack).includes(n)
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10)
}
