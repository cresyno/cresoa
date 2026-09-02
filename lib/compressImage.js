/**
 * Compress an image file to ≤200KB using Canvas.
 * @param {File} file - The image file to compress.
 * @param {number} maxSizeKB - Maximum size in KB (default 200).
 * @returns {Promise<Blob>} - Compressed image as a Blob.
 */
export async function compressImage(file, maxSizeKB = 200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Determine initial dimensions
        let width = img.width
        let height = img.height
        const maxDim = 1600 // Cap dimensions to avoid huge images
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // Try JPEG with quality from 0.9 down to 0.5 until size ≤ maxSizeKB
        let quality = 0.9
        let result = null
        let blob = null

        const tryCompress = () => {
          canvas.toBlob(
            (b) => {
              if (!b) {
                reject(new Error('Failed to compress image'))
                return
              }
              if (b.size / 1024 <= maxSizeKB) {
                resolve(b)
              } else if (quality > 0.5) {
                quality -= 0.1
                tryCompress()
              } else {
                // If still too big, reduce dimensions again
                if (width > 800) {
                  width *= 0.8
                  height *= 0.8
                  canvas.width = width
                  canvas.height = height
                  ctx.drawImage(img, 0, 0, width, height)
                  quality = 0.8
                  tryCompress()
                } else {
                  resolve(b) // accept even if slightly over (last resort)
                }
              }
            },
            'image/jpeg',
            quality
          )
        }
        tryCompress()
      }
      img.onerror = () => reject(new Error('Invalid image'))
      img.src = event.target.result
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
        }
