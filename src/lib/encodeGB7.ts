// GB7 формат энкодер
// Структура файла: заголовок + данные изображения

interface GB7Header {
  signature: string; // 'GB7'
  version: number;   // версия формата
  width: number;     // ширина изображения
  height: number;    // высота изображения
  channels: number;  // количество каналов (обычно 4 для RGBA)
  compression: number; // тип сжатия (0 = без сжатия)
}

// Функция для кодирования ImageData в GB7 формат
export function encodeGB7(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  
  // Создаем заголовок
  const header: GB7Header = {
    signature: 'GB7',
    version: 1,
    width,
    height,
    channels: 4, // RGBA
    compression: 0 // без сжатия
  };

  // Вычисляем размер заголовка
  const headerSize = 3 + 1 + 4 + 4 + 1 + 1; // signature(3) + version(1) + width(4) + height(4) + channels(1) + compression(1)
  const dataSize = data.length;
  const totalSize = headerSize + dataSize;

  // Создаем буфер для всего файла
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  let offset = 0;

  // Записываем заголовок
  // Signature (3 байта)
  uint8View[offset++] = header.signature.charCodeAt(0); // 'G'
  uint8View[offset++] = header.signature.charCodeAt(1); // 'B'
  uint8View[offset++] = header.signature.charCodeAt(2); // '7'

  // Version (1 байт)
  view.setUint8(offset++, header.version);

  // Width (4 байта, little-endian)
  view.setUint32(offset, header.width, true);
  offset += 4;

  // Height (4 байта, little-endian)
  view.setUint32(offset, header.height, true);
  offset += 4;

  // Channels (1 байт)
  view.setUint8(offset++, header.channels);

  // Compression (1 байт)
  view.setUint8(offset++, header.compression);

  // Записываем данные изображения
  uint8View.set(data, offset);

  return new Uint8Array(buffer);
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