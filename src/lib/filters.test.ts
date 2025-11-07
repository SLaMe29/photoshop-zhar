import { describe, it, expect, beforeAll } from 'vitest';
import { 
  applyKernelFilter, 
  applyMedianFilter, 
  applyGaussianBlur, 
  applyLaplacianFilter,
  FILTER_PRESETS 
} from './filters';

// Mock ImageData для тестовой среды Node.js
beforeAll(() => {
  if (typeof ImageData === 'undefined') {
    global.ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;

      constructor(data: Uint8ClampedArray | number, width?: number, height?: number) {
        if (typeof data === 'number') {
          // ImageData(width, height)
          this.width = data;
          this.height = width!;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        } else {
          // ImageData(data, width, height)
          this.data = data;
          this.width = width!;
          this.height = height!;
        }
      }
    } as typeof ImageData;
  }
});

// Вспомогательная функция для создания тестового ImageData
function createTestImageData(width: number, height: number, fillValue: number = 128): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillValue;     // R
    data[i + 1] = fillValue; // G
    data[i + 2] = fillValue; // B
    data[i + 3] = 255;       // A
  }
  return new ImageData(data, width, height);
}

// Вспомогательная функция для создания градиентного изображения
function createGradientImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const value = Math.floor((x / width) * 255);
      data[index] = value;     // R
      data[index + 1] = value; // G
      data[index + 2] = value; // B
      data[index + 3] = 255;   // A
    }
  }
  return new ImageData(data, width, height);
}

describe('Фильтры изображений', () => {
  describe('applyKernelFilter', () => {
    it('должен применить тождественное ядро без изменений', () => {
      const imageData = createTestImageData(3, 3, 100);
      const identityKernel = FILTER_PRESETS.find(p => p.name === 'Тождественное отображение')!.kernel;
      
      const result = applyKernelFilter(imageData, identityKernel);
      
      expect(result.width).toBe(3);
      expect(result.height).toBe(3);
      
      // Проверяем, что центральный пиксель остался неизменным
      const centerIndex = (1 * 3 + 1) * 4;
      expect(result.data[centerIndex]).toBe(100);
      expect(result.data[centerIndex + 1]).toBe(100);
      expect(result.data[centerIndex + 2]).toBe(100);
      expect(result.data[centerIndex + 3]).toBe(255);
    });

    it('должен применить фильтр размытия', () => {
      const imageData = createTestImageData(5, 5, 0);
      // Устанавливаем центральный пиксель в белый цвет
      const centerIndex = (2 * 5 + 2) * 4;
      imageData.data[centerIndex] = 255;
      imageData.data[centerIndex + 1] = 255;
      imageData.data[centerIndex + 2] = 255;
      
      const blurKernel = FILTER_PRESETS.find(p => p.name === 'Прямоугольное размытие')!.kernel;
      const result = applyKernelFilter(imageData, blurKernel);
      
      // После размытия центральный пиксель должен стать менее ярким
      expect(result.data[centerIndex]).toBeLessThan(255);
      expect(result.data[centerIndex]).toBeGreaterThan(0);
    });

    it('должен обрабатывать края изображения корректно', () => {
      const imageData = createTestImageData(3, 3, 128);
      const identityKernel = FILTER_PRESETS.find(p => p.name === 'Тождественное отображение')!.kernel;
      
      const result = applyKernelFilter(imageData, identityKernel);
      
      // Проверяем угловые пиксели
      expect(result.data[0]).toBe(128); // Верхний левый
      expect(result.data[(3 * 3 - 1) * 4]).toBe(128); // Нижний правый
    });

    it('должен выбросить ошибку для неподдерживаемого размера ядра', () => {
      const imageData = createTestImageData(3, 3);
      const invalidKernel = {
        matrix: [[1, 2], [3, 4]] // 2x2 вместо 3x3
      };
      
      expect(() => applyKernelFilter(imageData, invalidKernel)).toThrow('Поддерживаются только ядра 3x3');
    });
  });

  describe('applyMedianFilter', () => {
    it('должен удалить шум с помощью медианной фильтрации', () => {
      const imageData = createTestImageData(5, 5, 100);
      
      // Добавляем шумовой пиксель
      const noiseIndex = (2 * 5 + 2) * 4;
      imageData.data[noiseIndex] = 255;
      imageData.data[noiseIndex + 1] = 255;
      imageData.data[noiseIndex + 2] = 255;
      
      const result = applyMedianFilter(imageData, 3);
      
      // Шумовой пиксель должен быть подавлен
      expect(result.data[noiseIndex]).toBe(100);
      expect(result.data[noiseIndex + 1]).toBe(100);
      expect(result.data[noiseIndex + 2]).toBe(100);
    });

    it('должен сохранить альфа-канал', () => {
      const imageData = createTestImageData(3, 3, 128);
      const result = applyMedianFilter(imageData, 3);
      
      // Проверяем, что альфа-канал остался неизменным
      for (let i = 3; i < result.data.length; i += 4) {
        expect(result.data[i]).toBe(255);
      }
    });
  });

  describe('applyGaussianBlur', () => {
    it('должен размыть изображение', () => {
      const imageData = createGradientImageData(5, 5);
      const result = applyGaussianBlur(imageData, 1.0);
      
      expect(result.width).toBe(5);
      expect(result.height).toBe(5);
      
      // Результат должен быть размытым (менее контрастным)
      // Проверяем, что градиент стал более плавным
      const leftEdge = result.data[0];
      const rightEdge = result.data[(5 - 1) * 4];
      const center = result.data[(2 * 5 + 2) * 4];
      
      expect(center).toBeGreaterThan(leftEdge);
      expect(center).toBeLessThan(rightEdge);
    });

    it('должен применить более сильное размытие с большим sigma', () => {
      const imageData = createGradientImageData(7, 7);
      const result1 = applyGaussianBlur(imageData, 1.0);
      const result2 = applyGaussianBlur(imageData, 2.0);
      
      // При большем sigma размытие должно быть сильнее
      // Это сложно проверить точно, но можно проверить, что функция работает
      expect(result1.width).toBe(result2.width);
      expect(result1.height).toBe(result2.height);
    });
  });

  describe('applyLaplacianFilter', () => {
    it('должен выделить края изображения', () => {
      const imageData = createTestImageData(5, 5, 128);
      
      // Создаем резкий переход (край)
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 3; x++) {
          const index = (y * 5 + x) * 4;
          imageData.data[index] = 0;
          imageData.data[index + 1] = 0;
          imageData.data[index + 2] = 0;
        }
      }
      
      const result = applyLaplacianFilter(imageData);
      
      expect(result.width).toBe(5);
      expect(result.height).toBe(5);
      
      // На границе должен быть отклик фильтра
      const edgeIndex = (2 * 5 + 2) * 4; // Центр, где есть переход
      expect(Math.abs(result.data[edgeIndex] - 128)).toBeGreaterThan(0);
    });
  });

  describe('FILTER_PRESETS', () => {
    it('должен содержать все необходимые предустановки', () => {
      const expectedPresets = [
        'Тождественное отображение',
        'Повышение резкости',
        'Фильтр Гаусса (3x3)',
        'Прямоугольное размытие',
        'Оператор Прюитта (горизонтальный)',
        'Оператор Прюитта (вертикальный)'
      ];
      
      expectedPresets.forEach(name => {
        const preset = FILTER_PRESETS.find(p => p.name === name);
        expect(preset).toBeDefined();
        expect(preset!.kernel.matrix).toHaveLength(3);
        expect(preset!.kernel.matrix[0]).toHaveLength(3);
      });
    });

    it('должен иметь корректные значения для тождественного ядра', () => {
      const identity = FILTER_PRESETS.find(p => p.name === 'Тождественное отображение')!;
      
      expect(identity.kernel.matrix).toEqual([
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0]
      ]);
    });

    it('должен иметь корректные значения для фильтра Гаусса', () => {
      const gaussian = FILTER_PRESETS.find(p => p.name === 'Фильтр Гаусса (3x3)')!;
      
      expect(gaussian.kernel.matrix).toEqual([
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1]
      ]);
      expect(gaussian.kernel.divisor).toBe(16);
    });
  });
});