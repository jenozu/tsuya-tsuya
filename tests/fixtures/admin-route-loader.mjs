import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/data') {
    return { url: pathToFileURL(path.join(root, 'tests/fixtures/mock-catalog.mjs')).href, shortCircuit: true }
  }
  if (specifier === 'next/server') return nextResolve('next/server.js', context)
  if (specifier === 'next/cache') {
    return { url: pathToFileURL(path.join(root, 'tests/fixtures/mock-next-cache.mjs')).href, shortCircuit: true }
  }
  if (specifier.startsWith('@/')) {
    const relative = specifier.slice(2)
    if (relative.includes('..')) throw new Error('Path traversal in test-only alias loader')
    return { url: pathToFileURL(path.join(root, relative + '.ts')).href, shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
