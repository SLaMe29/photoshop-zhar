import React, { useState } from 'react';
import { useEditor } from '@/context/EditorContext';
import type { BlendMode } from '@/context/EditorContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, EyeOff, Trash2, ArrowUp, ArrowDown, Plus, Upload, Palette } from 'lucide-react';
import { FiltersMenu } from './FiltersMenu';

// Описания режимов наложения
const BLEND_MODE_DESCRIPTIONS: Record<BlendMode, string> = {
  normal: 'Обычный режим - пиксели верхнего слоя полностью заменяют нижние',
  multiply: 'Умножение - цвета умножаются, результат всегда темнее',
  screen: 'Экран - инвертированные цвета умножаются и инвертируются обратно, результат светлее',
  overlay: 'Наложение - комбинация умножения и экрана в зависимости от яркости нижнего слоя'
};

interface AddLayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImageLayer: () => void;
  onAddColorLayer: (color: string) => void;
}

function AddLayerModal({ isOpen, onClose, onAddImageLayer, onAddColorLayer }: AddLayerModalProps) {
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border rounded-lg p-6 w-80">
        <h3 className="text-lg font-semibold mb-4">Добавить слой</h3>
        
        <div className="space-y-4">
          <Button 
            onClick={onAddImageLayer}
            className="w-full justify-start"
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            Загрузить изображение
          </Button>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Заливка цветом:</label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Button 
                onClick={() => onAddColorLayer(selectedColor)}
                className="flex-1"
                variant="outline"
              >
                <Palette className="w-4 h-4 mr-2" />
                Создать
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <Button onClick={onClose} variant="outline">
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LayersPanel() {
  const {
    layers,
    activeLayerId,
    setActiveLayer,
    addLayer,
    updateLayer,
    deleteLayer,
    moveLayer,
    alphaChannels,
    updateAlphaChannel,
    deleteAlphaChannel
  } = useEditor();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Обработчик загрузки изображения для нового слоя
  const handleAddImageLayer = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.gb7';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          let url: string;
          
          // Проверяем, является ли файл .gb7
          if (file.name.toLowerCase().endsWith('.gb7')) {
            // Импортируем функцию parseGB7File
            const { parseGB7File } = await import('@/lib/parseGB7');
            const result = await parseGB7File(file);
            url = result.url;
          } else {
            url = URL.createObjectURL(file);
          }
          
          const img = new Image();
          img.onload = () => {
            // Создаем ImageData из загруженного изображения
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, img.width, img.height);
              
              // Если это не первый слой, центрируем его относительно первого слоя
              let finalImageData = imageData;
              if (layers.length > 0) {
                const firstLayer = layers[0];
                if (firstLayer.imageData) {
                  const baseWidth = firstLayer.imageData.width;
                  const baseHeight = firstLayer.imageData.height;
                  
                  // Создаем новый ImageData с размерами первого слоя
                  const centeredCanvas = document.createElement('canvas');
                  centeredCanvas.width = baseWidth;
                  centeredCanvas.height = baseHeight;
                  const centeredCtx = centeredCanvas.getContext('2d');
                  
                  if (centeredCtx) {
                    // Вычисляем позицию для центрирования
                    const offsetX = (baseWidth - img.width) / 2;
                    const offsetY = (baseHeight - img.height) / 2;
                    
                    // Рисуем изображение по центру
                    centeredCtx.drawImage(img, offsetX, offsetY);
                    finalImageData = centeredCtx.getImageData(0, 0, baseWidth, baseHeight);
                  }
                }
              }
              
              addLayer({
                name: `Слой ${layers.length + 1}`,
                visible: true,
                opacity: 100,
                blendMode: 'normal',
                imageData: finalImageData,
                imageUrl: url
              });
            }
          };
          
          img.onerror = () => {
            console.error('Не удалось загрузить изображение');
          };
          
          img.src = url;
        } catch (error) {
          console.error('Ошибка при обработке файла:', error);
        }
      }
    };
    input.click();
    setShowAddModal(false);
  };
  
  // Обработчик создания слоя с заливкой цветом
  const handleAddColorLayer = (color: string) => {
    // Определяем размеры на основе первого слоя или используем размеры по умолчанию
    let width = 800;
    let height = 600;
    
    if (layers.length > 0 && layers[0].imageData) {
      width = layers[0].imageData.width;
      height = layers[0].imageData.height;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      
      addLayer({
        name: `Слой ${layers.length + 1}`,
        visible: true,
        opacity: 100,
        blendMode: 'normal',
        imageData,
        imageUrl: canvas.toDataURL()
      });
    }
    
    setShowAddModal(false);
  };
  
  return (
    <div className="w-80 bg-background border-l flex flex-col h-full">
      {/* Заголовок панели */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Слои</h2>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            disabled={layers.length >= 2}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {layers.length >= 2 && (
          <p className="text-xs text-muted-foreground mt-1">
            Максимум 2 слоя
          </p>
        )}
      </div>
      
      {/* Список слоев */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-2">
          {layers.map((layer, index) => (
            <div
              key={layer.id}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                layer.id === activeLayerId 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setActiveLayer(layer.id)}
            >
              {/* Превью и основная информация */}
              <div className="flex items-center gap-3 mb-3">
                {/* Превью слоя */}
                <div className="w-12 h-12 border rounded bg-muted flex-shrink-0 overflow-hidden">
                  {layer.imageUrl && (
                    <img
                      src={layer.imageUrl}
                      alt={layer.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                
                {/* Название и кнопки */}
                <div className="flex-1 min-w-0">
                  <Input
                    value={layer.name}
                    onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                    className="text-sm h-8 mb-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex items-center gap-1">
                    {/* Видимость */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateLayer(layer.id, { visible: !layer.visible });
                      }}
                      className="h-6 w-6 p-0"
                    >
                      {layer.visible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </Button>
                    
                    {/* Перемещение вверх */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, 'up');
                      }}
                      disabled={index === layers.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    
                    {/* Перемещение вниз */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, 'down');
                      }}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    
                    {/* Удаление */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id);
                      }}
                      disabled={layer.isBackground}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Непрозрачность */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Непрозрачность:</label>
                  <span className="text-xs text-muted-foreground">{layer.opacity}%</span>
                </div>
                <Slider
                  value={[layer.opacity]}
                  onValueChange={([value]) => updateLayer(layer.id, { opacity: value })}
                  max={100}
                  step={1}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              {/* Режим наложения */}
              <div className="mt-3">
                <label className="text-xs font-medium mb-1 block">Режим наложения:</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={layer.blendMode}
                        onValueChange={(value: BlendMode) => updateLayer(layer.id, { blendMode: value })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Обычный</SelectItem>
                          <SelectItem value="multiply">Умножение</SelectItem>
                          <SelectItem value="screen">Экран</SelectItem>
                          <SelectItem value="overlay">Наложение</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      {BLEND_MODE_DESCRIPTIONS[layer.blendMode]}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
          
          {layers.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Нет слоев</p>
              <p className="text-xs mt-1">Нажмите + чтобы добавить слой</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Альфа-каналы */}
      {alphaChannels.length > 0 && (
        <div className="border-t">
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-3">Альфа-каналы</h3>
            <div className="space-y-2">
              {alphaChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center gap-2 p-2 border rounded"
                >
                  {/* Превью альфа-канала */}
                  <div className="w-8 h-8 border rounded bg-muted flex-shrink-0">
                    {/* Здесь можно добавить превью альфа-канала */}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {channel.width}×{channel.height}
                    </p>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateAlphaChannel(channel.id, { visible: !channel.visible })}
                      className="h-6 w-6 p-0"
                    >
                      {channel.visible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteAlphaChannel(channel.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Фильтры */}
      <div className="border-t p-4">
        <FiltersMenu onError={setError} />
        {error && (
          <div className="text-xs text-destructive mt-2 p-2 bg-destructive/10 rounded">
            {error}
          </div>
        )}
      </div>
      
      {/* Модальное окно добавления слоя */}
      <AddLayerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddImageLayer={handleAddImageLayer}
        onAddColorLayer={handleAddColorLayer}
      />
    </div>
  );
}