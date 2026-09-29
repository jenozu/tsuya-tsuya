/**
 * Bound JSON request bodies by actual bytes, not attacker-supplied
 * Content-Length. A reverse proxy/WAF still needs its own size and rate rules.
 */
export class RequestBodyError extends Error {
  constructor(
    public readonly status: 400 | 413 | 415,
    public readonly publicMessage: string,
  ) {
    super(publicMessage)
    this.name = 'RequestBodyError'
  }
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error('Invalid private request size configuration')
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!/^application\/json(?:\s*;\s*charset\s*=\s*utf-8\s*)?$/i.test(contentType)) {
    throw new RequestBodyError(415, 'Expected a JSON request.')
  }

  const length = request.headers.get('content-length')
  if (length !== null) {
    if (!/^(0|[1-9][0-9]*)$/.test(length)) {
      throw new RequestBodyError(400, 'Invalid request length.')
    }
    if (Number(length) > maxBytes) {
      throw new RequestBodyError(413, 'Request body is too large.')
    }
  }

  if (!request.body) throw new RequestBodyError(400, 'Invalid JSON request.')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        // Do not read or buffer the rest of an oversized chunked request.
        void reader.cancel().catch(() => undefined)
        throw new RequestBodyError(413, 'Request body is too large.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  if (!total) throw new RequestBodyError(400, 'Invalid JSON request.')
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(merged))
  } catch {
    throw new RequestBodyError(400, 'Invalid JSON request.')
  }
}
