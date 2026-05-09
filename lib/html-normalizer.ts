/**
 * Normalize rich-text HTML into a fragment-safe string.
 * Strips full-document wrappers that can break React hydration/rendering.
 */
export function normalizeRichTextHtml(input: string | null | undefined): string {
  if (typeof input !== 'string') return ''

  let value = input.trim()
  if (!value) return ''

  value = value
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')

  const bodyMatch = value.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    value = bodyMatch[1]
  }

  return value.trim()
}

export function normalizeOptionalRichTextHtml(input: string | null | undefined): string | undefined {
  if (input === null || input === undefined) return undefined
  const normalized = normalizeRichTextHtml(input)
  return normalized.length > 0 ? normalized : ''
}
