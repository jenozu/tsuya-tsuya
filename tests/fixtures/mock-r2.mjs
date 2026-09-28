// Task 7: never access a real bucket from route integration tests.
export const writes = []
let failNextPut = false
let failNextDelete = false
export function resetR2() {
  writes.length = 0
  failNextPut = false
  failNextDelete = false
}
export function failPutOnce() { failNextPut = true }
export function failDeleteOnce() { failNextDelete = true }
export function objectKeyFromPublicUrl(url) {
  const base = 'https://test-r2.example.invalid/'
  if (typeof url !== 'string' || !url.startsWith(base)) return null
  try { return url.slice(base.length).split('/').map(decodeURIComponent).join('/') }
  catch { return null }
}
export async function putR2Object({key,body,contentType}) {
  if (failNextPut) { failNextPut = false; throw new Error('PRIVATE_R2_WRITE_ERROR') }
  writes.push({action:'put',key,body:Buffer.from(body),contentType})
  return 'https://test-r2.example.invalid/' + key
}
export async function deleteR2Object(key) {
  if (failNextDelete) { failNextDelete = false; throw new Error('PRIVATE_R2_DELETE_ERROR') }
  writes.push({action:'delete',key})
}
