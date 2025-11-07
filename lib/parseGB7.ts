export interface GB7Header {
  version: number
  hasMask: boolean
  width: number
  height: number
}

const GB7_SIGNATURE = [0x47, 0x42, 0x37, 0x1D]

export async function parseGB7File(file: File): Promise<{
  header: GB7Header,
  imageData: ImageData,
  url: string
}> {
  return new Promise((resolve, reject) => {    
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        if (!event.target || !event.target.result) {
          throw new Error('Failed to read file')
        }
        
        const buffer = event.target.result as ArrayBuffer
        const dataView = new DataView(buffer)
        const uint8Array = new Uint8Array(buffer)
        
        for (let i = 0; i < GB7_SIGNATURE.length; i++) {
          if (dataView.getUint8(i) !== GB7_SIGNATURE[i]) {
            throw new Error('Invalid GrayBit-7 file signature')
          }
        }
        
        const version = dataView.getUint8(4)
        const flags = dataView.getUint8(5)
        const hasMask = (flags & 0x01) === 1
        const width = dataView.getUint16(6, false)
        const height = dataView.getUint16(8, false)
        
        const header: GB7Header = {
          version,
          hasMask,
          width,
          height
        }
        
        const headerSize = 12
        const imageDataSize = width * height
        
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          throw new Error('Failed to create canvas context')
        }
        
        const imageData = ctx.createImageData(width, height)
        
        for (let i = 0; i < imageDataSize; i++) {
          const pixelByte = uint8Array[headerSize + i]
          const grayscaleValue = pixelByte & 0x7F
          
          const scaledValue = Math.floor(grayscaleValue * 255 / 127)
          
          const pos = i * 4
          imageData.data[pos] = scaledValue     // R
          imageData.data[pos + 1] = scaledValue // G
          imageData.data[pos + 2] = scaledValue // B
          
          // alpha
          if (hasMask) {
            imageData.data[pos + 3] = (pixelByte & 0x80) ? 255 : 0
          } else {
            imageData.data[pos + 3] = 255
          }
        }
        
        ctx.putImageData(imageData, 0, 0)
        const url = canvas.toDataURL('image/png')
        
        resolve({
          header,
          imageData,
          url
        })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Error reading file'))
    }

    reader.readAsArrayBuffer(file)
  })
} 
