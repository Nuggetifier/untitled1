export type Texture = {
  readonly image: HTMLImageElement
  readonly width: number
  readonly height: number
  // Flat array: R, G, B, A for each pixel, one row after another.
  // Read once on first access, then cached. Editing it does not alter the image.
  readonly pixels: Uint8ClampedArray
}

const loadedTextures = new Map<string, Promise<Texture>>()

export function loadTexture(url: string): Promise<Texture> {
  const existing = loadedTextures.get(url)
  if (existing) return existing

  const loading = decodeTexture(url).catch((error: unknown) => {
    loadedTextures.delete(url)
    throw error
  })
  loadedTextures.set(url, loading)
  return loading
}

async function decodeTexture(url: string): Promise<Texture> {
  const image = new Image()
  image.src = url
  try {
    await image.decode()
  } catch (cause) {
    throw new Error(`Could not load texture: ${url}`, { cause })
  }

  const width = image.naturalWidth
  const height = image.naturalHeight
  if (width === 0 || height === 0) {
    throw new Error(`Texture has no pixels: ${url}`)
  }

  let pixels: Uint8ClampedArray | undefined
  return {
    image,
    width,
    height,
    get pixels(): Uint8ClampedArray {
      if (!pixels) {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not create texture pixel reader')
        ctx.drawImage(image, 0, 0)
        pixels = ctx.getImageData(0, 0, width, height).data
      }
      return pixels
    },
  }
}
