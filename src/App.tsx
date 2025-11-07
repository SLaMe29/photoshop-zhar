import { useState, useRef, useEffect } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { isGB7File } from '@/lib/utils'
import { parseGB7File } from '@/lib/parseGB7'
import { LayeredCanvas } from '@/components/LayeredCanvas'
import { ImageInfo } from '@/components/ImageInfo'
import { EditorProvider } from '@/context/EditorContext'
import { ToolBar } from '@/components/ToolBar'
import { ColorPicker } from '@/components/ColorPicker'
import { LayersPanel } from '@/components/LayersPanel'
import { ResizeHandler } from '@/components/ResizeHandler'
import { CurvesHandler } from '@/components/CurvesHandler'
import { FilterHandler } from '@/components/FilterHandler'
import { ExportHandler } from '@/components/ExportHandler'
import { useEditor } from '@/context/EditorContext'

const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg']
const CUSTOM_FORMAT_EXTENSION = '.gb7'

function AppContent() {
  const [error, setError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [resizeModalOpen, setResizeModalOpen] = useState(false)
  const [curvesModalOpen, setCurvesModalOpen] = useState(false)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Получаем информацию о слоях и активный инструмент
  const { layers, addLayer, activeTool, setActiveTool } = useEditor()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    setError(null)

    if (!files || files.length === 0) {
      return
    }

    const file = files[0]
    
    const isGB7Format = isGB7File(file)
    const isSupportedFormat = SUPPORTED_FORMATS.includes(file.type)
    
    if (!isSupportedFormat && !isGB7Format) {
      setError(`Неподдерживаемый формат файла. Пожалуйста, загрузите PNG, JPG или ${CUSTOM_FORMAT_EXTENSION} файлы.`)
      return
    }

    // Создаем слой напрямую через addLayer
    const createLayerFromImage = (url: string) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, img.width, img.height)
          
          addLayer({
            name: layers.length === 0 ? 'Фон' : `Слой ${layers.length + 1}`,
            visible: true,
            opacity: 100,
            blendMode: 'normal',
            imageData,
            imageUrl: url,
            isBackground: layers.length === 0
          })
        }
      }
      img.onerror = () => setError('Не удалось загрузить изображение')
      img.src = url
    }

    if (isGB7Format) {
      parseGB7File(file)
        .then(({ url }) => createLayerFromImage(url))
        .catch(err => {
          console.error('Ошибка при обработке GB7 файла:', err)
          setError(`Не удалось обработать ${CUSTOM_FORMAT_EXTENSION} файл: ${err.message}`)
        })
    } else {
      const fileUrl = URL.createObjectURL(file)
      createLayerFromImage(fileUrl)
    }
  }

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Handle zoom level change
  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom)
  }

  // Handle curves tool activation
  useEffect(() => {
    if (activeTool === 'curves' && layers.length > 0) {
      setCurvesModalOpen(true)
      setActiveTool('hand') // Reset to hand tool after opening curves
    }
  }, [activeTool, layers.length, setActiveTool])

  // Handle filter tool activation
  useEffect(() => {
    if (activeTool === 'filter' && layers.length > 0) {
      setFilterModalOpen(true)
      setActiveTool('hand') // Reset to hand tool after opening filter
    }
  }, [activeTool, layers.length, setActiveTool])



  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <ToolBar />
        
        <div className="flex flex-col flex-1 min-w-0">
          <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
            <h1 className="text-2xl font-bold">Фоторедактор</h1>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleUploadClick}
                variant="secondary"
              >
                Загрузить изображение
              </Button>
              
              <Button
                onClick={() => setResizeModalOpen(true)}
                variant="outline"
                disabled={layers.length === 0}
              >
                Изменить размер
              </Button>
              
              <ExportHandler onError={setError} />
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept={`.png,.jpg,.jpeg,${CUSTOM_FORMAT_EXTENSION}`}
              className="hidden"
            />
          </header>
          
          <main
            ref={containerRef}
            className="flex-1 flex flex-col items-center justify-center overflow-hidden relative min-h-0"
          >
            {error && (
              <div className="text-destructive mb-4 absolute top-4 z-10">
                {error}
              </div>
            )}
            
            <LayeredCanvas
              zoomLevel={zoomLevel}
              onZoomChange={handleZoomChange}
            />
          </main>
          
          <ImageInfo
            zoomLevel={zoomLevel}
            onZoomChange={handleZoomChange}
          />
        </div>
        
        {/* Панель слоев - показываем всегда для управления слоями */}
        <LayersPanel />
        
        {/* Модальные окна и дополнительные панели */}
        <ColorPicker />
        
        <ResizeHandler
          open={resizeModalOpen}
          onOpenChange={setResizeModalOpen}
          onError={setError}
        />
        
        <CurvesHandler
          open={curvesModalOpen}
          onOpenChange={setCurvesModalOpen}
          onError={setError}
        />
        
        <FilterHandler
          open={filterModalOpen}
          onOpenChange={setFilterModalOpen}
          onError={setError}
        />
      </div>
    </TooltipProvider>
  )
}

function App() {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  )
}

export default App
