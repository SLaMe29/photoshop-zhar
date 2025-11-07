import type { BlendMode } from '@/context/EditorContext';

/**
 * Применяет режим наложения к двум цветам
 * @param base Базовый цвет (нижний слой) в формате [r, g, b, a]
 * @param overlay Накладываемый цвет (верхний слой) в формате [r, g, b, a]
 * @param mode Режим наложения
 * @param opacity Непрозрачность верхнего слоя (0-1)
 * @returns Результирующий цвет в формате [r, g, b, a]
 */
export function blendColors(
  base: [number, number, number, number],
  overlay: [number, number, number, number],
  mode: BlendMode,
  opacity: number
): [number, number, number, number] {
  const [br, bg, bb, ba] = base;
  const [or, og, ob, oa] = overlay;
  
  // Нормализуем значения к диапазону 0-1
  const baseR = br / 255;
  const baseG = bg / 255;
  const baseB = bb / 255;
  const overlayR = or / 255;
  const overlayG = og / 255;
  const overlayB = ob / 255;
  
  let resultR: number, resultG: number, resultB: number;
  
  switch (mode) {
    case 'normal':
      resultR = overlayR;
      resultG = overlayG;
      resultB = overlayB;
      break;
      
    case 'multiply':
      resultR = baseR * overlayR;
      resultG = baseG * overlayG;
      resultB = baseB * overlayB;
      break;
      
    case 'screen':
      resultR = 1 - (1 - baseR) * (1 - overlayR);
      resultG = 1 - (1 - baseG) * (1 - overlayG);
      resultB = 1 - (1 - baseB) * (1 - overlayB);
      break;
      
    case 'overlay':
      resultR = baseR < 0.5 
        ? 2 * baseR * overlayR 
        : 1 - 2 * (1 - baseR) * (1 - overlayR);
      resultG = baseG < 0.5 
        ? 2 * baseG * overlayG 
        : 1 - 2 * (1 - baseG) * (1 - overlayG);
      resultB = baseB < 0.5 
        ? 2 * baseB * overlayB 
        : 1 - 2 * (1 - baseB) * (1 - overlayB);
      break;
      
    default:
      resultR = overlayR;
      resultG = overlayG;
      resultB = overlayB;
  }
  
  // Применяем непрозрачность
  const finalOpacity = (oa / 255) * opacity;
  const finalR = Math.round((resultR * finalOpacity + baseR * (1 - finalOpacity)) * 255);
  const finalG = Math.round((resultG * finalOpacity + baseG * (1 - finalOpacity)) * 255);
  const finalB = Math.round((resultB * finalOpacity + baseB * (1 - finalOpacity)) * 255);
  const finalA = Math.round(Math.max(ba, oa * opacity));
  
  return [
    Math.max(0, Math.min(255, finalR)),
    Math.max(0, Math.min(255, finalG)),
    Math.max(0, Math.min(255, finalB)),
    Math.max(0, Math.min(255, finalA))
  ];
}

/**
 * Смешивает несколько слоев в один результирующий ImageData
 * @param layers Массив слоев для смешивания (от нижнего к верхнему)
 * @param width Ширина результирующего изображения
 * @param height Высота результирующего изображения
 * @returns Результирующий ImageData
 */
export function blendLayers(
  layers: Array<{
    imageData: ImageData;
    blendMode: BlendMode;
    opacity: number;
    visible: boolean;
  }>,
  width: number,
  height: number
): ImageData {
  // Создаем результирующий ImageData
  const result = new ImageData(width, height);
  const resultData = result.data;
  
  // Фильтруем только видимые слои
  const visibleLayers = layers.filter(layer => layer.visible);
  
  if (visibleLayers.length === 0) {
    // Если нет видимых слоев, возвращаем прозрачное изображение
    return result;
  }
  
  // Проходим по каждому пикселю результирующего изображения
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const resultPixelIndex = (y * width + x) * 4;
      
      // Начинаем с прозрачного пикселя
      let currentPixel: [number, number, number, number] = [0, 0, 0, 0];
      
      // Применяем каждый слой
      for (let i = 0; i < visibleLayers.length; i++) {
        const layer = visibleLayers[i];
        const layerData = layer.imageData.data;
        const layerWidth = layer.imageData.width;
        const layerHeight = layer.imageData.height;
        
        // Проверяем, что пиксель находится в пределах слоя
        if (x < layerWidth && y < layerHeight) {
          const layerPixelIndex = (y * layerWidth + x) * 4;
          
          if (layerPixelIndex + 3 < layerData.length) {
            const layerPixel: [number, number, number, number] = [
              layerData[layerPixelIndex],     // R
              layerData[layerPixelIndex + 1], // G
              layerData[layerPixelIndex + 2], // B
              layerData[layerPixelIndex + 3]  // A
            ];
            
            // Если это первый слой или текущий пиксель полностью прозрачен
            if (i === 0 || currentPixel[3] === 0) {
              currentPixel = [
                layerPixel[0],
                layerPixel[1],
                layerPixel[2],
                Math.round(layerPixel[3] * (layer.opacity / 100))
              ];
            } else {
              // Смешиваем с предыдущим результатом
              currentPixel = blendColors(
                currentPixel,
                layerPixel,
                layer.blendMode,
                layer.opacity / 100
              );
            }
          }
        }
      }
      
      // Записываем результат
      resultData[resultPixelIndex] = currentPixel[0];
      resultData[resultPixelIndex + 1] = currentPixel[1];
      resultData[resultPixelIndex + 2] = currentPixel[2];
      resultData[resultPixelIndex + 3] = currentPixel[3];
    }
  }
  
  return result;
}

/**
 * Создает превью слоя для отображения в панели слоев
 * @param imageData ImageData слоя
 * @param maxWidth Максимальная ширина превью
 * @param maxHeight Максимальная высота превью
 * @returns Canvas с превью слоя
 */
export function createLayerPreview(
  imageData: ImageData,
  maxWidth: number = 48,
  maxHeight: number = 48
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Не удалось создать контекст canvas');
  }
  
  // Вычисляем размеры превью с сохранением пропорций
  const aspectRatio = imageData.width / imageData.height;
  let previewWidth = maxWidth;
  let previewHeight = maxHeight;
  
  if (aspectRatio > 1) {
    previewHeight = maxWidth / aspectRatio;
  } else {
    previewWidth = maxHeight * aspectRatio;
  }
  
  canvas.width = Math.round(previewWidth);
  canvas.height = Math.round(previewHeight);
  
  // Создаем временный canvas с оригинальными данными
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (tempCtx) {
    tempCtx.putImageData(imageData, 0, 0);
    
    // Масштабируем на основной canvas
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
  }
  
  return canvas;
}