// Типы для фильтрации
export interface Kernel {
  matrix: number[][];
  divisor?: number;
  offset?: number;
}

export interface FilterPreset {
  name: string;
  kernel: Kernel;
}

// Предустановленные ядра фильтров
export const FILTER_PRESETS: FilterPreset[] = [
  {
    name: 'Тождественное отображение',
    kernel: {
      matrix: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0]
      ]
    }
  },
  {
    name: 'Повышение резкости',
    kernel: {
      matrix: [
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0]
      ]
    }
  },
  {
    name: 'Фильтр Гаусса (3x3)',
    kernel: {
      matrix: [
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1]
      ],
      divisor: 16
    }
  },
  {
    name: 'Прямоугольное размытие',
    kernel: {
      matrix: [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
      ],
      divisor: 9
    }
  },
  {
    name: 'Оператор Прюитта (горизонтальный)',
    kernel: {
      matrix: [
        [-1, 0, 1],
        [-1, 0, 1],
        [-1, 0, 1]
      ]
    }
  },
  {
    name: 'Оператор Прюитта (вертикальный)',
    kernel: {
      matrix: [
        [-1, -1, -1],
        [0, 0, 0],
        [1, 1, 1]
      ]
    }
  }
];

// Функция для расширения изображения (edge padding)
function padImageData(imageData: ImageData, padSize: number = 1): ImageData {
  const { width, height, data } = imageData;
  const paddedWidth = width + 2 * padSize;
  const paddedHeight = height + 2 * padSize;
  const paddedData = new Uint8ClampedArray(paddedWidth * paddedHeight * 4);

  // Копируем исходные данные в центр расширенного изображения
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4;
      const dstIndex = ((y + padSize) * paddedWidth + (x + padSize)) * 4;
      
      paddedData[dstIndex] = data[srcIndex];     // R
      paddedData[dstIndex + 1] = data[srcIndex + 1]; // G
      paddedData[dstIndex + 2] = data[srcIndex + 2]; // B
      paddedData[dstIndex + 3] = data[srcIndex + 3]; // A
    }
  }

  // Расширяем края копированием ближайших пикселей
  // Верхний и нижний края
  for (let y = 0; y < padSize; y++) {
    for (let x = padSize; x < paddedWidth - padSize; x++) {
      // Верхний край
      const topSrcIndex = (padSize * paddedWidth + x) * 4;
      const topDstIndex = (y * paddedWidth + x) * 4;
      
      // Нижний край
      const bottomSrcIndex = ((paddedHeight - padSize - 1) * paddedWidth + x) * 4;
      const bottomDstIndex = ((paddedHeight - 1 - y) * paddedWidth + x) * 4;
      
      for (let c = 0; c < 4; c++) {
        paddedData[topDstIndex + c] = paddedData[topSrcIndex + c];
        paddedData[bottomDstIndex + c] = paddedData[bottomSrcIndex + c];
      }
    }
  }

  // Левый и правый края
  for (let y = 0; y < paddedHeight; y++) {
    for (let x = 0; x < padSize; x++) {
      // Левый край
      const leftSrcIndex = (y * paddedWidth + padSize) * 4;
      const leftDstIndex = (y * paddedWidth + x) * 4;
      
      // Правый край
      const rightSrcIndex = (y * paddedWidth + (paddedWidth - padSize - 1)) * 4;
      const rightDstIndex = (y * paddedWidth + (paddedWidth - 1 - x)) * 4;
      
      for (let c = 0; c < 4; c++) {
        paddedData[leftDstIndex + c] = paddedData[leftSrcIndex + c];
        paddedData[rightDstIndex + c] = paddedData[rightSrcIndex + c];
      }
    }
  }

  return new ImageData(paddedData, paddedWidth, paddedHeight);
}

// Функция применения свертки с ядром
export function applyKernelFilter(imageData: ImageData, kernel: Kernel): ImageData {
  const { width, height } = imageData;
  const { matrix, divisor = 1, offset = 0 } = kernel;
  
  // Проверяем, что ядро 3x3
  if (matrix.length !== 3 || matrix[0].length !== 3) {
    throw new Error('Поддерживаются только ядра 3x3');
  }

  // Расширяем изображение
  const paddedImageData = padImageData(imageData, 1);
  const paddedData = paddedImageData.data;
  const paddedWidth = paddedImageData.width;

  // Создаем результирующее изображение
  const resultData = new Uint8ClampedArray(width * height * 4);

  // Применяем свертку
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const resultIndex = (y * width + x) * 4;

      // Применяем ядро для каждого канала (RGB, альфа-канал не изменяем)
      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;

        // Проходим по ядру 3x3
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const paddedX = x + kx;
            const paddedY = y + ky;
            const paddedIndex = (paddedY * paddedWidth + paddedX) * 4;
            
            sum += paddedData[paddedIndex + channel] * matrix[ky][kx];
          }
        }

        // Применяем делитель и смещение
        let result = Math.round(sum / divisor + offset);
        
        // Ограничиваем значения в диапазоне [0, 255]
        result = Math.max(0, Math.min(255, result));
        
        resultData[resultIndex + channel] = result;
      }

      // Копируем альфа-канал без изменений
      const originalIndex = (y * width + x) * 4;
      resultData[resultIndex + 3] = imageData.data[originalIndex + 3];
    }
  }

  return new ImageData(resultData, width, height);
}

// Медианная фильтрация
export function applyMedianFilter(imageData: ImageData, kernelSize: number = 3): ImageData {
  const { width, height, data } = imageData;
  const resultData = new Uint8ClampedArray(data.length);
  const halfKernel = Math.floor(kernelSize / 2);

  // Расширяем изображение
  const paddedImageData = padImageData(imageData, halfKernel);
  const paddedData = paddedImageData.data;
  const paddedWidth = paddedImageData.width;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const resultIndex = (y * width + x) * 4;

      // Применяем медианную фильтрацию для каждого канала (RGB)
      for (let channel = 0; channel < 3; channel++) {
        const values: number[] = [];

        // Собираем значения в окрестности
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const paddedX = x + kx;
            const paddedY = y + ky;
            const paddedIndex = (paddedY * paddedWidth + paddedX) * 4;
            values.push(paddedData[paddedIndex + channel]);
          }
        }

        // Сортируем и берем медиану
        values.sort((a, b) => a - b);
        const median = values[Math.floor(values.length / 2)];
        
        resultData[resultIndex + channel] = median;
      }

      // Копируем альфа-канал без изменений
      resultData[resultIndex + 3] = data[(y * width + x) * 4 + 3];
    }
  }

  return new ImageData(resultData, width, height);
}

// Лапласиан (оператор Лапласа)
export function applyLaplacianFilter(imageData: ImageData): ImageData {
  const laplacianKernel: Kernel = {
    matrix: [
      [0, -1, 0],
      [-1, 4, -1],
      [0, -1, 0]
    ]
  };

  return applyKernelFilter(imageData, laplacianKernel);
}

// Размытие по Гауссу (5x5 для лучшего качества)
export function applyGaussianBlur(imageData: ImageData, sigma: number = 1.0): ImageData {
  // Для простоты используем приближение Гаусса через несколько проходов 3x3
  const gaussianKernel: Kernel = {
    matrix: [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ],
    divisor: 16
  };

  let result = imageData;
  
  // Применяем фильтр несколько раз для лучшего приближения к Гауссу
  const passes = Math.max(1, Math.round(sigma));
  for (let i = 0; i < passes; i++) {
    result = applyKernelFilter(result, gaussianKernel);
  }

  return result;
}

// Функция для работы с Web Worker (будет использоваться позже)
export function createFilterWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }

  const workerCode = `
    // Код для Web Worker будет добавлен позже
    self.onmessage = function(e) {
      const { imageData, filterType, params } = e.data;
      
      // Здесь будет логика фильтрации в отдельном потоке
      // Пока возвращаем исходные данные
      self.postMessage({ imageData });
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}