// GB7 формат энкодер
// Структура файла: заголовок + данные изображения

const GB7_SIGNATURE = new Uint8Array([0x47, 0x42, 0x37, 0x1d]);
const GB7_VERSION = 1;
const HEADER_SIZE = 12;
const MAX_DIMENSION = 0xffff;
const ALPHA_THRESHOLD = 128;

// Функция для кодирования ImageData в GB7 формат
export function encodeGB7(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const pixelCount = width * height;

  if (width === 0 || height === 0) {
    throw new Error('Размер изображения не может быть 0');
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error('Размеры изображения превышают допустимый предел формата GB7 (65535 × 65535)');
  }

  if (data.length !== pixelCount * 4) {
    throw new Error('Некорректные данные изображения для кодировщика GB7');
  }

  const grayscaleData = new Uint8Array(pixelCount);
  const alphaMask = new Uint8Array(pixelCount);

  let hasTransparentPixel = false;

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];

    const grayscale = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const grayscale7Bit = Math.max(0, Math.min(127, Math.round(grayscale * 127 / 255)));

    grayscaleData[i] = grayscale7Bit;

    const alphaBit = a >= ALPHA_THRESHOLD ? 1 : 0;
    alphaMask[i] = alphaBit;

    if (alphaBit === 0) {
      hasTransparentPixel = true;
    }
  }

  const hasMask = hasTransparentPixel;
  const buffer = new Uint8Array(HEADER_SIZE + pixelCount);

  buffer.set(GB7_SIGNATURE, 0);
  buffer[4] = GB7_VERSION;
  buffer[5] = hasMask ? 0x01 : 0x00;

  const headerView = new DataView(buffer.buffer);
  headerView.setUint16(6, width, false);
  headerView.setUint16(8, height, false);
  headerView.setUint16(10, 0, false);

  if (hasMask) {
    for (let i = 0; i < pixelCount; i++) {
      buffer[HEADER_SIZE + i] = (alphaMask[i] << 7) | grayscaleData[i];
    }
  } else {
    buffer.set(grayscaleData, HEADER_SIZE);
  }

  return buffer;
}

// Функция для создания Blob из GB7 данных
export function createGB7Blob(imageData: ImageData): Blob {
  const gb7Data = encodeGB7(imageData);
  return new Blob([gb7Data], { type: 'application/octet-stream' });
}

// Функция для скачивания GB7 файла
export function downloadGB7(imageData: ImageData, filename: string = 'image.gb7'): void {
  const blob = createGB7Blob(imageData);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Функция для скачивания изображения в различных форматах
export function downloadImage(
  imageData: ImageData, 
  format: 'png' | 'jpg' | 'gb7', 
  filename?: string,
  quality: number = 0.9
): void {
  if (format === 'gb7') {
    const name = filename || 'image.gb7';
    downloadGB7(imageData, name);
    return;
  }

  // Создаем canvas для конвертации в стандартные форматы
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Не удалось создать контекст canvas');
  }

  ctx.putImageData(imageData, 0, 0);

  // Определяем MIME тип и расширение
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'png':
      mimeType = 'image/png';
      extension = '.png';
      break;
    case 'jpg':
      mimeType = 'image/jpeg';
      extension = '.jpg';
      break;
    default:
      throw new Error(`Неподдерживаемый формат: ${format}`);
  }

  // Конвертируем в blob
  canvas.toBlob((blob) => {
    if (!blob) {
      throw new Error('Не удалось создать blob');
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `image${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, mimeType, format === 'jpg' ? quality : undefined);
}

// Функция для получения ImageData из активного слоя или композитного изображения
export function getImageDataForExport(
  layers: Array<{
    imageData: ImageData | null;
    visible: boolean;
    opacity: number;
    blendMode: string;
  }>,
  width: number,
  height: number
): ImageData | null {
  if (layers.length === 0) {
    return null;
  }

  // Создаем canvas для композитинга
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return null;
  }

  // Очищаем canvas (прозрачный фон)
  ctx.clearRect(0, 0, width, height);

  // Рендерим каждый видимый слой
  for (const layer of layers) {
    if (!layer.visible || !layer.imageData || layer.opacity === 0) {
      continue;
    }

    // Создаем временный canvas для слоя
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = layer.imageData.width;
    layerCanvas.height = layer.imageData.height;
    const layerCtx = layerCanvas.getContext('2d');
    
    if (!layerCtx) {
      continue;
    }

    layerCtx.putImageData(layer.imageData, 0, 0);

    // Применяем прозрачность
    ctx.globalAlpha = layer.opacity / 100;

    // Применяем режим наложения (упрощенная версия)
    switch (layer.blendMode) {
      case 'multiply':
        ctx.globalCompositeOperation = 'multiply';
        break;
      case 'screen':
        ctx.globalCompositeOperation = 'screen';
        break;
      case 'overlay':
        ctx.globalCompositeOperation = 'overlay';
        break;
      default:
        ctx.globalCompositeOperation = 'source-over';
    }

    // Рисуем слой
    ctx.drawImage(layerCanvas, 0, 0);
  }

  // Сбрасываем настройки
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  return ctx.getImageData(0, 0, width, height);
}