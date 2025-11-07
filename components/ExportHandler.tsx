import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useEditor } from '@/context/EditorContext';
import { downloadImage, getImageDataForExport } from '@/lib/encodeGB7';

interface ExportHandlerProps {
  onError: (error: string) => void;
}

export function ExportHandler({ onError }: ExportHandlerProps) {
  const { layers } = useEditor();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'png' | 'jpg' | 'gb7'>('png');
  const [filename, setFilename] = useState('image');
  const [quality, setQuality] = useState([90]);

  const handleExport = () => {
    if (layers.length === 0) {
      onError('Нет слоев для экспорта');
      return;
    }

    try {
      // Получаем размеры из первого слоя с данными
      const firstLayerWithData = layers.find(layer => layer.imageData);
      if (!firstLayerWithData || !firstLayerWithData.imageData) {
        onError('Нет данных изображения для экспорта');
        return;
      }

      const { width, height } = firstLayerWithData.imageData;

      // Получаем композитное изображение
      const imageData = getImageDataForExport(layers, width, height);
      if (!imageData) {
        onError('Не удалось создать композитное изображение');
        return;
      }

      // Определяем имя файла с расширением
      const extension = format === 'jpg' ? '.jpg' : format === 'png' ? '.png' : '.gb7';
      const fullFilename = filename.endsWith(extension) ? filename : filename + extension;

      // Экспортируем изображение
      downloadImage(imageData, format, fullFilename, quality[0] / 100);
      
      setOpen(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Ошибка экспорта изображения');
    }
  };

  const getFileExtension = () => {
    switch (format) {
      case 'png': return '.png';
      case 'jpg': return '.jpg';
      case 'gb7': return '.gb7';
      default: return '.png';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={layers.length === 0}>
          Экспорт изображения
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Экспорт изображения</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Выбор формата */}
          <div className="space-y-2">
            <Label>Формат файла</Label>
            <Select value={format} onValueChange={(value: 'png' | 'jpg' | 'gb7') => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG (без потерь)</SelectItem>
                <SelectItem value="jpg">JPEG (с сжатием)</SelectItem>
                <SelectItem value="gb7">GB7 (пользовательский формат)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Имя файла */}
          <div className="space-y-2">
            <Label htmlFor="filename">Имя файла</Label>
            <div className="flex">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="image"
                className="flex-1"
              />
              <span className="flex items-center px-3 text-sm text-muted-foreground border border-l-0 rounded-r-md bg-muted">
                {getFileExtension()}
              </span>
            </div>
          </div>

          {/* Качество для JPEG */}
          {format === 'jpg' && (
            <div className="space-y-2">
              <Label>Качество JPEG: {quality[0]}%</Label>
              <Slider
                value={quality}
                onValueChange={setQuality}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          )}

          {/* Информация о формате */}
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
            {format === 'png' && (
              <p>PNG - формат без потерь, поддерживает прозрачность. Подходит для изображений с четкими границами.</p>
            )}
            {format === 'jpg' && (
              <p>JPEG - формат с сжатием, не поддерживает прозрачность. Подходит для фотографий.</p>
            )}
            {format === 'gb7' && (
              <p>GB7 - пользовательский формат без сжатия, поддерживает прозрачность. Может быть открыт только в этом редакторе.</p>
            )}
          </div>

          {/* Кнопки */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleExport}>
              Экспортировать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}