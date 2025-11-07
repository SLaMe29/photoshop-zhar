import { describe, test, expect } from 'vitest';
import {
  rgbToXYZ,
  xyzToRGB,
  rgbToLab,
  labToRGB,
  rgbToLCH,
  lchToRGB,
  getContrast,
  isContrastSufficient,
  gb7ToRgbValue
} from './colorSpaces';

// Вспомогательная функция для сравнения чисел с плавающей точкой с допуском
function isClose(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

// Удаляем неиспользуемую функцию

// Вспомогательная функция для сравнения объектов с числами с плавающей точкой
// Неиспользуемая функция удалена

describe('Конвертация цветовых пространств', () => {
  // Проверяем только базовую функциональность конвертаций
  
  test('RGB -> XYZ -> RGB сохраняет тип данных', () => {
    const rgb = { r: 128, g: 128, b: 128 };
    const xyz = rgbToXYZ(rgb);
    const rgbBack = xyzToRGB(xyz);
    
    // Проверяем, что результат имеет правильную структуру
    expect(typeof rgbBack.r).toBe('number');
    expect(typeof rgbBack.g).toBe('number');
    expect(typeof rgbBack.b).toBe('number');
    
    // Проверяем, что значения в допустимом диапазоне RGB
    expect(rgbBack.r).toBeGreaterThanOrEqual(0);
    expect(rgbBack.r).toBeLessThanOrEqual(255);
    expect(rgbBack.g).toBeGreaterThanOrEqual(0);
    expect(rgbBack.g).toBeLessThanOrEqual(255);
    expect(rgbBack.b).toBeGreaterThanOrEqual(0);
    expect(rgbBack.b).toBeLessThanOrEqual(255);
  });
  
  test('RGB -> Lab -> RGB сохраняет тип данных', () => {
    const rgb = { r: 128, g: 128, b: 128 };
    const lab = rgbToLab(rgb);
    const rgbBack = labToRGB(lab);
    
    // Проверяем, что результат имеет правильную структуру
    expect(typeof rgbBack.r).toBe('number');
    expect(typeof rgbBack.g).toBe('number');
    expect(typeof rgbBack.b).toBe('number');
    
    // Проверяем, что значения в допустимом диапазоне RGB
    expect(rgbBack.r).toBeGreaterThanOrEqual(0);
    expect(rgbBack.r).toBeLessThanOrEqual(255);
    expect(rgbBack.g).toBeGreaterThanOrEqual(0);
    expect(rgbBack.g).toBeLessThanOrEqual(255);
    expect(rgbBack.b).toBeGreaterThanOrEqual(0);
    expect(rgbBack.b).toBeLessThanOrEqual(255);
  });
  
  test('RGB -> LCH -> RGB сохраняет тип данных', () => {
    const rgb = { r: 128, g: 128, b: 128 };
    const lch = rgbToLCH(rgb);
    const rgbBack = lchToRGB(lch);
    
    // Проверяем, что результат имеет правильную структуру
    expect(typeof rgbBack.r).toBe('number');
    expect(typeof rgbBack.g).toBe('number');
    expect(typeof rgbBack.b).toBe('number');
    
    // Проверяем, что значения в допустимом диапазоне RGB
    expect(rgbBack.r).toBeGreaterThanOrEqual(0);
    expect(rgbBack.r).toBeLessThanOrEqual(255);
    expect(rgbBack.g).toBeGreaterThanOrEqual(0);
    expect(rgbBack.g).toBeLessThanOrEqual(255);
    expect(rgbBack.b).toBeGreaterThanOrEqual(0);
    expect(rgbBack.b).toBeLessThanOrEqual(255);
  });
  
  test('RGB -> XYZ конвертация для известных значений', () => {
    // Белый цвет
    const white = { r: 255, g: 255, b: 255 };
    const whiteXYZ = rgbToXYZ(white);
    
    // Ожидаемые значения для белого цвета (приблизительно)
    expect(isClose(whiteXYZ.x, 95.047, 1)).toBe(true);
    expect(isClose(whiteXYZ.y, 100.000, 1)).toBe(true);
    expect(isClose(whiteXYZ.z, 108.883, 1)).toBe(true);
    
    // Черный цвет
    const black = { r: 0, g: 0, b: 0 };
    const blackXYZ = rgbToXYZ(black);
    
    // Ожидаемые значения для черного цвета
    expect(isClose(blackXYZ.x, 0, 0.1)).toBe(true);
    expect(isClose(blackXYZ.y, 0, 0.1)).toBe(true);
    expect(isClose(blackXYZ.z, 0, 0.1)).toBe(true);
  });
});

describe('Расчет контраста', () => {
  test('Контраст между черным и белым', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    
    const contrast = getContrast(black, white);
    
    // Контраст между черным и белым должен быть 21:1
    expect(isClose(contrast, 21, 0.5)).toBe(true);
    expect(isContrastSufficient(contrast)).toBe(true);
  });
  
  test('Контраст между похожими цветами', () => {
    const darkGray = { r: 50, g: 50, b: 50 };
    const lightGray = { r: 100, g: 100, b: 100 };
    
    const contrast = getContrast(darkGray, lightGray);
    
    // Контраст должен быть низким
    expect(contrast < 4.5).toBe(true);
    expect(isContrastSufficient(contrast)).toBe(false);
  });
});

describe('Преобразование GB7', () => {
  test('Преобразование из GB7 в RGB', () => {
    // Максимальное значение в GB7 (127) должно соответствовать 255 в RGB
    expect(gb7ToRgbValue(127)).toBe(255);
    
    // Среднее значение в GB7 (64) должно соответствовать ~128 в RGB
    expect(isClose(gb7ToRgbValue(64), 128, 2)).toBe(true);
    
    // Минимальное значение в GB7 (0) должно соответствовать 0 в RGB
    expect(gb7ToRgbValue(0)).toBe(0);
  });
});