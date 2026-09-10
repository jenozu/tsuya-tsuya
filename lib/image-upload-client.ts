export async function uploadProductImage(file: File, fileName?: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file, fileName || file.name)

  const response = await fetch('/api/admin/product-images', { method: 'POST', body: formData })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || typeof result.url !== 'string') {
    throw new Error(result.error || 'Image upload failed')
  }
  return result.url
}

export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  const response = await fetch('/api/admin/product-images', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: imageUrl }),
  })
  return response.ok
}
