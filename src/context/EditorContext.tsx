import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { getAllColorSpaces, getContrast, isContrastSufficient } from '@/lib/colorSpaces';
import type { RGB } from '@/lib/colorSpaces';

// Типы инструментов
export type Tool = 'hand' | 'eyedropper' | 'curves' | 'filter';

// Тип для координат
export interface Coordinates {
  x: number;
  y: number;
}

// Тип для информации о цвете
export interface ColorInfo {
  rgb: RGB;
  coordinates: Coordinates;
  hex: string;
  allSpaces: ReturnType<typeof getAllColorSpaces>;
}

// Режимы наложения слоев
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

// Тип слоя
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0-100
  blendMode: BlendMode;
  imageData: ImageData | null;
  imageUrl: string | null;
  isBackground?: boolean;
}

// Тип альфа-канала
export interface AlphaChannel {
  id: string;
  name: string;
  visible: boolean;
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

// Тип для контекста редактора
interface EditorContextType {
  // Текущий активный инструмент
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  
  // Позиция изображения (для инструмента руки)
  imagePosition: Coordinates;
  setImagePosition: (position: Coordinates) => void;
  
  // Выбранные цвета (для пипетки)
  primaryColor: ColorInfo | null;
  setPrimaryColor: (color: ColorInfo | null) => void;
  secondaryColor: ColorInfo | null;
  setSecondaryColor: (color: ColorInfo | null) => void;
  
  // Контраст между выбранными цветами
  getColorContrast: () => { value: number; isSufficient: boolean } | null;
  
  // Слои
  layers: Layer[];
  activeLayerId: string | null;
  setActiveLayer: (layerId: string) => void;
  addLayer: (layer: Omit<Layer, 'id'>) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  deleteLayer: (layerId: string) => void;
  moveLayer: (layerId: string, direction: 'up' | 'down') => void;
  
  // Альфа-каналы
  alphaChannels: AlphaChannel[];
  addAlphaChannel: (channel: Omit<AlphaChannel, 'id'>) => void;
  updateAlphaChannel: (channelId: string, updates: Partial<AlphaChannel>) => void;
  deleteAlphaChannel: (channelId: string) => void;
}

// Создаем контекст
const EditorContext = createContext<EditorContextType | undefined>(undefined);

// Провайдер контекста
export function EditorProvider({ children }: { children: ReactNode }) {
  // Состояние активного инструмента
  const [activeTool, setActiveTool] = useState<Tool>('hand');
  
  // Состояние позиции изображения
  const [imagePosition, setImagePosition] = useState<Coordinates>({ x: 0, y: 0 });
  
  // Состояние выбранных цветов
  const [primaryColor, setPrimaryColor] = useState<ColorInfo | null>(null);
  const [secondaryColor, setSecondaryColor] = useState<ColorInfo | null>(null);
  
  // Состояние слоев
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  
  // Состояние альфа-каналов
  const [alphaChannels, setAlphaChannels] = useState<AlphaChannel[]>([]);
  
  // Функция для получения контраста между выбранными цветами
  const getColorContrast = () => {
    if (!primaryColor || !secondaryColor) return null;
    
    const contrastValue = getContrast(primaryColor.rgb, secondaryColor.rgb);
    return {
      value: contrastValue,
      isSufficient: isContrastSufficient(contrastValue)
    };
  };
  
  // Функции для работы со слоями
  const setActiveLayer = (layerId: string) => {
    setActiveLayerId(layerId);
  };
  
  const addLayer = (layer: Omit<Layer, 'id'>) => {
    const newLayer: Layer = {
      ...layer,
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  };
  
  const updateLayer = (layerId: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
  };
  
  const deleteLayer = (layerId: string) => {
    setLayers(prev => {
      const filtered = prev.filter(layer => layer.id !== layerId);
      // Если удаляем активный слой, выбираем другой
      if (layerId === activeLayerId) {
        const newActiveLayer = filtered.length > 0 ? filtered[filtered.length - 1] : null;
        setActiveLayerId(newActiveLayer?.id || null);
      }
      return filtered;
    });
  };
  
  const moveLayer = (layerId: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const index = prev.findIndex(layer => layer.id === layerId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newLayers = [...prev];
      [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];
      return newLayers;
    });
  };
  
  // Функции для работы с альфа-каналами
  const addAlphaChannel = (channel: Omit<AlphaChannel, 'id'>) => {
    const newChannel: AlphaChannel = {
      ...channel,
      id: `alpha-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setAlphaChannels(prev => [...prev, newChannel]);
  };
  
  const updateAlphaChannel = (channelId: string, updates: Partial<AlphaChannel>) => {
    setAlphaChannels(prev => prev.map(channel =>
      channel.id === channelId ? { ...channel, ...updates } : channel
    ));
  };
  
  const deleteAlphaChannel = (channelId: string) => {
    setAlphaChannels(prev => prev.filter(channel => channel.id !== channelId));
  };
  
  const value = {
    activeTool,
    setActiveTool,
    imagePosition,
    setImagePosition,
    primaryColor,
    setPrimaryColor,
    secondaryColor,
    setSecondaryColor,
    getColorContrast,
    layers,
    activeLayerId,
    setActiveLayer,
    addLayer,
    updateLayer,
    deleteLayer,
    moveLayer,
    alphaChannels,
    addAlphaChannel,
    updateAlphaChannel,
    deleteAlphaChannel
  };
  
  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

// Хук для использования контекста
export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}