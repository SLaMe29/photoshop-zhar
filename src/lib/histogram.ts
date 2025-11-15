// Histogram calculation utilities for gradation transformations

export interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  alpha?: number[];
}

export interface CurvePoint {
  input: number;
  output: number;
}

/**
 * Calculate histogram data from ImageData
 */
export function calculateHistogram(imageData: ImageData, includeAlpha = false): HistogramData {
  const data = imageData.data;
  const red = new Array(256).fill(0);
  const green = new Array(256).fill(0);
  const blue = new Array(256).fill(0);
  const alpha = includeAlpha ? new Array(256).fill(0) : undefined;

  // Count pixel values
  for (let i = 0; i < data.length; i += 4) {
    red[data[i]]++;
    green[data[i + 1]]++;
    blue[data[i + 2]]++;
    if (includeAlpha && alpha) {
      alpha[data[i + 3]]++;
    }
  }

  return { red, green, blue, alpha };
}

/**
 * Create a look-up table from two curve points
 */
export function createLookupTable(point1: CurvePoint, point2: CurvePoint): Uint8Array {
  const lut = new Uint8Array(256);
  
  // Ensure points are ordered by input value
  const [p1, p2] = point1.input <= point2.input ? [point1, point2] : [point2, point1];
  
  const inputDelta = p2.input - p1.input;
  const slope = inputDelta === 0 ? 0 : (p2.output - p1.output) / inputDelta;
  
  for (let i = 0; i < 256; i++) {
    if (i <= p1.input) {
      // Left horizontal line
      lut[i] = Math.max(0, Math.min(255, p1.output));
    } else if (i >= p2.input) {
      // Right horizontal line
      lut[i] = Math.max(0, Math.min(255, p2.output));
    } else if (inputDelta === 0) {
      const averageOutput = Math.round((p1.output + p2.output) / 2);
      lut[i] = Math.max(0, Math.min(255, averageOutput));
    } else {
      // Linear interpolation between points
      const output = p1.output + slope * (i - p1.input);
      lut[i] = Math.max(0, Math.min(255, Math.round(output)));
    }
  }
  
  return lut;
}

/**
 * Apply look-up table to image data
 */
export function applyLookupTable(
  imageData: ImageData, 
  redLut: Uint8Array, 
  greenLut: Uint8Array, 
  blueLut: Uint8Array,
  alphaLut?: Uint8Array
): ImageData {
  const newImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  
  const data = newImageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = redLut[data[i]];         // Red
    data[i + 1] = greenLut[data[i + 1]]; // Green
    data[i + 2] = blueLut[data[i + 2]];  // Blue
    if (alphaLut) {
      data[i + 3] = alphaLut[data[i + 3]]; // Alpha
    }
  }
  
  return newImageData;
}

/**
 * Normalize histogram data for display (0-1 range)
 */
export function normalizeHistogram(histogram: number[]): number[] {
  const max = Math.max(...histogram);
  if (max === 0) return histogram;
  return histogram.map(value => value / max);
}

/**
 * Generate SVG path for histogram display
 */
export function generateHistogramPath(
  histogram: number[], 
  width: number, 
  height: number,
  normalize = true
): string {
  const data = normalize ? normalizeHistogram(histogram) : histogram;
  const stepX = width / (data.length - 1);
  
  let path = `M 0 ${height}`;
  
  for (let i = 0; i < data.length; i++) {
    const x = i * stepX;
    const y = height - (data[i] * height);
    path += ` L ${x} ${y}`;
  }
  
  path += ` L ${width} ${height} Z`;
  return path;
}