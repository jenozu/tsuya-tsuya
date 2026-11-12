// Scripted fake fetch for Printify tests: records calls, never touches the network.
export function createMockPrintify(...script) {
  const calls = []
  const queue = [...script]
  async function fetch(url, init) {
    calls.push({ url, init })
    const next = queue.shift()
    if (!next) throw new Error('mock-printify: script exhausted')
    if (next.throw) throw next.throw
    return new Response(JSON.stringify(next.body ?? {}), { status: next.status ?? 200, headers: next.headers ?? {} })
  }
  return { fetch, calls }
}
