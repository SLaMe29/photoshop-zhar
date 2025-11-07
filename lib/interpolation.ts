/**
 * Методы интерполяции для изменения размера изображения
 */

/**
 * Интерполяция методом ближайшего соседа
 *
 * Этот метод выбирает значение ближайшего пикселя для каждой позиции в выходном изображении.
 * Это самый простой и быстрый метод, но может привести к пикселизации при увеличении изображения.
 *
 * @param srcData Исходные данные изображения
 * @param srcWidth Ширина исходного изображения
 * @param srcHeight Высота исходного изображения
 * @param destWidth Ширина целевого изображения
 * @param destHeight Высота целевого изображения
 * @returns Новый объект ImageData с измененными размерами
 */
export function nearestNeighbor(
  srcData: ImageData,
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number
): ImageData {
  const destData = new ImageData(destWidth, destHeight);
  const xRatio = srcWidth / destWidth;
  const yRatio = srcHeight / destHeight;

  for (let y = 0; y < destHeight; y++) {
    const srcY = Math.min(Math.floor(y * yRatio), srcHeight - 1);
    
    for (let x = 0; x < destWidth; x++) {
      const srcX = Math.min(Math.floor(x * xRatio), srcWidth - 1);
      
      const srcPos = (srcY * srcWidth + srcX) * 4;
      const destPos = (y * destWidth + x) * 4;
      
      destData.data[destPos] = srcData.data[srcPos];         // R
      destData.data[destPos + 1] = srcData.data[srcPos + 1]; // G
      destData.data[destPos + 2] = srcData.data[srcPos + 2]; // B
      destData.data[destPos + 3] = srcData.data[srcPos + 3]; // A
    }
  }
  
  return destData;
}

/**
 * Билинейная интерполяция
 *
 * Этот метод вычисляет взвешенное среднее значение 4 ближайших пикселей для каждой позиции
 * в выходном изображении. Дает более гладкие результаты, чем метод ближайшего соседа.
 *
 * @param srcData Исходные данные изображения
 * @param srcWidth Ширина исходного изображения
 * @param srcHeight Высота исходного изображения
 * @param destWidth Ширина целевого изображения
 * @param destHeight Высота целевого изображения
 * @returns Новый объект ImageData с измененными размерами
 */
export function bilinearInterpolation(
  srcData: ImageData,
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number
): ImageData {
  const destData = new ImageData(destWidth, destHeight);
  const xRatio = (srcWidth - 1) / destWidth;
  const yRatio = (srcHeight - 1) / destHeight;

  for (let y = 0; y < destHeight; y++) {
    const yPos = y * yRatio;
    const y1 = Math.floor(yPos);
    const y2 = Math.min(y1 + 1, srcHeight - 1);
    const yDiff = yPos - y1;
    
    for (let x = 0; x < destWidth; x++) {
      const xPos = x * xRatio;
      const x1 = Math.floor(xPos);
      const x2 = Math.min(x1 + 1, srcWidth - 1);
      const xDiff = xPos - x1;
      
      // Get the four neighboring pixels
      const p1 = (y1 * srcWidth + x1) * 4; // top-left
      const p2 = (y1 * srcWidth + x2) * 4; // top-right
      const p3 = (y2 * srcWidth + x1) * 4; // bottom-left
      const p4 = (y2 * srcWidth + x2) * 4; // bottom-right
      
      // Calculate destination pixel position
      const destPos = (y * destWidth + x) * 4;
      
      // Interpolate each color channel
      for (let i = 0; i < 4; i++) {
        // Bilinear interpolation formula:
        // f(x,y) = f(0,0)(1-x)(1-y) + f(1,0)x(1-y) + f(0,1)(1-x)y + f(1,1)xy
        const top = (1 - xDiff) * srcData.data[p1 + i] + xDiff * srcData.data[p2 + i];
        const bottom = (1 - xDiff) * srcData.data[p3 + i] + xDiff * srcData.data[p4 + i];
        const value = (1 - yDiff) * top + yDiff * bottom;
        
        destData.data[destPos + i] = Math.round(value);
      }
    }
  }
  
  return destData;
}

/**
 * Изменить размер изображения, используя указанный метод интерполяции
 *
 * @param srcData Исходные данные изображения
 * @param srcWidth Ширина исходного изображения
 * @param srcHeight Высота исходного изображения
 * @param destWidth Ширина целевого изображения
 * @param destHeight Высота целевого изображения
 * @param method Метод интерполяции ('nearest' или 'bilinear')
 * @returns Новый объект ImageData с измененными размерами
 */
export function resizeImage(
  srcData: ImageData,
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number,
  method: 'nearest' | 'bilinear' = 'bilinear'
): ImageData {
  if (method === 'nearest') {
    return nearestNeighbor(srcData, srcWidth, srcHeight, destWidth, destHeight);
  } else {
    return bilinearInterpolation(srcData, srcWidth, srcHeight, destWidth, destHeight);
  }
}

/**
 * Получить информацию о методах интерполяции
 */
export const interpolationInfo = {
  nearest: {
    name: "Ближайший сосед",
    description: "Самый быстрый метод, который выбирает ближайший пиксель. При увеличении изображения может давать пикселизацию, но сохраняет четкие края и хорошо подходит для пиксельной графики."
  },
  bilinear: {
    name: "Билинейная",
    description: "Вычисляет взвешенное среднее значение 4 соседних пикселей. Дает более гладкие результаты, чем метод ближайшего соседа, и хорошо подходит для фотографий."
  }
};