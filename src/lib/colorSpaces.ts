/**
 * Утилиты для работы с цветовыми пространствами
 */

// Информация о цветовых пространствах для тултипов
export const colorSpaceInfo = {
  RGB: {
    description: "Аддитивная цветовая модель, описывающая способ кодирования цвета для цветовоспроизведения.",
    axes: [
      { name: "R", description: "Красный", range: "0-255" },
      { name: "G", description: "Зелёный", range: "0-255" },
      { name: "B", description: "Синий", range: "0-255" }
    ]
  },
  XYZ: {
    description: "Стандартизированная цветовая модель, основанная на восприятии цвета человеческим глазом.",
    axes: [
      { name: "X", description: "Смесь кривых отклика колбочек", range: "0-95.047" },
      { name: "Y", description: "Яркость (luminance)", range: "0-100.000" },
      { name: "Z", description: "Близко к синему стимулу", range: "0-108.883" }
    ]
  },
  Lab: {
    description: "Цветовое пространство, разработанное для приближения к человеческому зрению.",
    axes: [
      { name: "L", description: "Светлота", range: "0-100" },
      { name: "a", description: "Зелёный-красный", range: "-128 до +127" },
      { name: "b", description: "Синий-жёлтый", range: "-128 до +127" }
    ]
  },
  LCH: {
    description: "Цилиндрическая версия Lab, где цвет представлен как светлота, насыщенность и оттенок.",
    axes: [
      { name: "L", description: "Светлота", range: "0-100" },
      { name: "C", description: "Насыщенность (chroma)", range: "0-132" },
      { name: "H", description: "Оттенок (hue)", range: "0-360°" }
    ]
  },
  OKLch: {
    description: "Улучшенная версия LCH с более равномерным восприятием и лучшей работой с насыщенными цветами.",
    axes: [
      { name: "L", description: "Светлота", range: "0-1" },
      { name: "C", description: "Насыщенность (chroma)", range: "0-0.4" },
      { name: "h", description: "Оттенок (hue)", range: "0-360°" }
    ]
  }
};

// Типы для цветовых пространств
export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface Lab {
  l: number;
  a: number;
  b: number;
}

export interface LCH {
  l: number;
  c: number;
  h: number;
}

export interface OKLch {
  l: number;
  c: number;
  h: number;
}

// Функции конвертации между цветовыми пространствами

/**
 * Конвертирует RGB в XYZ
 * @param rgb RGB цвет (0-255)
 * @returns XYZ цвет
 */
export function rgbToXYZ(rgb: RGB): XYZ {
  // Нормализация RGB значений
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // Применение гамма-коррекции (sRGB)
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Масштабирование
  r *= 100;
  g *= 100;
  b *= 100;

  // Применение матрицы преобразования
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

  return { x, y, z };
}

/**
 * Конвертирует XYZ в RGB
 * @param xyz XYZ цвет
 * @returns RGB цвет (0-255)
 */
export function xyzToRGB(xyz: XYZ): RGB {
  // Применение обратной матрицы преобразования
  let r = xyz.x * 0.032404542 + xyz.y * -0.015371385 + xyz.z * -0.004985314;
  let g = xyz.x * -0.009692660 + xyz.y * 0.018760108 + xyz.z * 0.000041952;
  let b = xyz.x * 0.000556434 + xyz.y * -0.002040259 + xyz.z * 0.010572252;

  // Обратное масштабирование
  r /= 100;
  g /= 100;
  b /= 100;

  // Обратная гамма-коррекция (sRGB)
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

  // Нормализация и округление
  r = Math.max(0, Math.min(1, r)) * 255;
  g = Math.max(0, Math.min(1, g)) * 255;
  b = Math.max(0, Math.min(1, b)) * 255;

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b)
  };
}

/**
 * Конвертирует XYZ в Lab
 * @param xyz XYZ цвет
 * @returns Lab цвет
 */
export function xyzToLab(xyz: XYZ): Lab {
  // Референсные значения для D65
  const xRef = 95.047;
  const yRef = 100.000;
  const zRef = 108.883;

  let x = xyz.x / xRef;
  let y = xyz.y / yRef;
  let z = xyz.z / zRef;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

  const l = (116 * y) - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);

  return { l, a, b };
}

/**
 * Конвертирует Lab в XYZ
 * @param lab Lab цвет
 * @returns XYZ цвет
 */
export function labToXYZ(lab: Lab): XYZ {
  // Референсные значения для D65
  const xRef = 95.047;
  const yRef = 100.000;
  const zRef = 108.883;

  const yTemp = (lab.l + 16) / 116;
  const xTemp = lab.a / 500 + yTemp;
  const zTemp = yTemp - lab.b / 200;

  const y3 = Math.pow(yTemp, 3);
  const x3 = Math.pow(xTemp, 3);
  const z3 = Math.pow(zTemp, 3);

  const xr = x3 > 0.008856 ? x3 : (xTemp - 16 / 116) / 7.787;
  const yr = y3 > 0.008856 ? y3 : (yTemp - 16 / 116) / 7.787;
  const zr = z3 > 0.008856 ? z3 : (zTemp - 16 / 116) / 7.787;

  return {
    x: xr * xRef,
    y: yr * yRef,
    z: zr * zRef
  };
}

/**
 * Конвертирует Lab в LCH
 * @param lab Lab цвет
 * @returns LCH цвет
 */
export function labToLCH(lab: Lab): LCH {
  const l = lab.l;
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = Math.atan2(lab.b, lab.a) * (180 / Math.PI);
  
  if (h < 0) {
    h += 360;
  }

  return { l, c, h };
}

/**
 * Конвертирует LCH в Lab
 * @param lch LCH цвет
 * @returns Lab цвет
 */
export function lchToLab(lch: LCH): Lab {
  const l = lch.l;
  const a = lch.c * Math.cos(lch.h * (Math.PI / 180));
  const b = lch.c * Math.sin(lch.h * (Math.PI / 180));

  return { l, a, b };
}

/**
 * Конвертирует RGB в Lab
 * @param rgb RGB цвет (0-255)
 * @returns Lab цвет
 */
export function rgbToLab(rgb: RGB): Lab {
  const xyz = rgbToXYZ(rgb);
  return xyzToLab(xyz);
}

/**
 * Конвертирует Lab в RGB
 * @param lab Lab цвет
 * @returns RGB цвет (0-255)
 */
export function labToRGB(lab: Lab): RGB {
  const xyz = labToXYZ(lab);
  return xyzToRGB(xyz);
}

/**
 * Конвертирует RGB в LCH
 * @param rgb RGB цвет (0-255)
 * @returns LCH цвет
 */
export function rgbToLCH(rgb: RGB): LCH {
  const lab = rgbToLab(rgb);
  return labToLCH(lab);
}

/**
 * Конвертирует LCH в RGB
 * @param lch LCH цвет
 * @returns RGB цвет (0-255)
 */
export function lchToRGB(lch: LCH): RGB {
  const lab = lchToLab(lch);
  return labToRGB(lab);
}

/**
 * Конвертирует RGB в OKLch (приблизительно)
 * @param rgb RGB цвет (0-255)
 * @returns OKLch цвет
 */
export function rgbToOKLch(rgb: RGB): OKLch {
  // Это упрощенная версия, для точной конвертации нужна более сложная реализация
  const lch = rgbToLCH(rgb);
  
  // Приблизительное преобразование из LCH в OKLch
  return {
    l: lch.l / 100, // Нормализация до 0-1
    c: lch.c / 130 * 0.4, // Приблизительное масштабирование
    h: lch.h
  };
}

/**
 * Конвертирует OKLch в RGB (приблизительно)
 * @param oklch OKLch цвет
 * @returns RGB цвет (0-255)
 */
export function oklchToRGB(oklch: OKLch): RGB {
  // Это упрощенная версия, для точной конвертации нужна более сложная реализация
  const lch: LCH = {
    l: oklch.l * 100, // Денормализация до 0-100
    c: oklch.c / 0.4 * 130, // Приблизительное масштабирование
    h: oklch.h
  };
  
  return lchToRGB(lch);
}

/**
 * Получает все представления цвета в разных цветовых пространствах
 * @param rgb RGB цвет (0-255)
 * @returns Объект с представлениями цвета в разных пространствах
 */
export function getAllColorSpaces(rgb: RGB) {
  const xyz = rgbToXYZ(rgb);
  const lab = xyzToLab(xyz);
  const lch = labToLCH(lab);
  const oklch = rgbToOKLch(rgb);
  
  return { rgb, xyz, lab, lch, oklch };
}

/**
 * Форматирует RGB цвет в строку
 * @param rgb RGB цвет
 * @returns Строковое представление RGB цвета
 */
export function formatRGB(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/**
 * Форматирует RGB цвет в HEX строку
 * @param rgb RGB цвет
 * @returns HEX строка
 */
export function rgbToHex(rgb: RGB): string {
  const r = rgb.r.toString(16).padStart(2, '0');
  const g = rgb.g.toString(16).padStart(2, '0');
  const b = rgb.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Рассчитывает относительную яркость цвета по WCAG 2.0
 * @param rgb RGB цвет
 * @returns Относительная яркость (0-1)
 */
export function getLuminance(rgb: RGB): number {
  // Нормализация RGB значений
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // Применение гамма-коррекции (sRGB)
  r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Расчет яркости по формуле WCAG 2.0
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Рассчитывает контраст между двумя цветами по WCAG 2.0
 * @param rgb1 Первый RGB цвет
 * @param rgb2 Второй RGB цвет
 * @returns Контраст (1-21)
 */
export function getContrast(rgb1: RGB, rgb2: RGB): number {
  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  
  // Используем более светлый цвет как L1
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Проверяет, достаточен ли контраст для текста по WCAG 2.0
 * @param contrast Значение контраста
 * @returns true, если контраст достаточен для обычного текста (4.5:1)
 */
export function isContrastSufficient(contrast: number): boolean {
  return contrast >= 4.5;
}

/**
 * Преобразует значение из GB7 (0-127) в стандартное RGB (0-255)
 * @param value Значение в GB7 (0-127)
 * @returns Значение в RGB (0-255)
 */
export function gb7ToRgbValue(value: number): number {
  return Math.round((value / 127) * 255);
}

/**
 * Преобразует RGB цвет из GB7 в стандартный RGB
 * @param gb7 RGB цвет в GB7 формате (0-127)
 * @returns Стандартный RGB цвет (0-255)
 */
export function gb7ToRgb(gb7: RGB): RGB {
  return {
    r: gb7ToRgbValue(gb7.r),
    g: gb7ToRgbValue(gb7.g),
    b: gb7ToRgbValue(gb7.b),
    a: gb7.a
  };
}