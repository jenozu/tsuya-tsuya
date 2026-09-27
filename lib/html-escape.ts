/** Escape untrusted plain text before interpolation into transactional HTML. */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: unknown): string {
  const text = value == null ? '' : String(value)
  return text.replace(/[&<>"']/g, char => HTML_ENTITIES[char])
}
