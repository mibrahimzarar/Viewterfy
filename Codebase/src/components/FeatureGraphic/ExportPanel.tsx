import { useCallback, useState } from 'react'
import { clsx } from 'clsx'
import { Download, Loader2, AlertCircle } from 'lucide-react'
import { domToPng } from 'modern-screenshot'
import { useFeatureGraphicStore, EXPORT_PRESETS } from '../../store/useFeatureGraphicStore'

export const ExportPanel = () => {
    const { selectedPreset, setSelectedPreset, isExporting, setIsExporting } = useFeatureGraphicStore()
    const [error, setError] = useState<string | null>(null)

    const selectedPresetData = EXPORT_PRESETS.find(p => p.id === selectedPreset)

    const handleExport = useCallback(async () => {
        const preset = EXPORT_PRESETS.find(p => p.id === selectedPreset)
        if (!preset) return

        setIsExporting(true)
        setError(null)

        try {
            // Get the preview canvas element
            const canvasElement = document.getElementById('feature-graphic-canvas') as HTMLElement
            if (!canvasElement) {
                throw new Error('Canvas element not found')
            }

            // Get current display dimensions
            const rect = canvasElement.getBoundingClientRect()
            const displayWidth = rect.width
            const displayHeight = rect.height

            // Calculate scale factor to go from display size to export size
            const scaleX = preset.width / displayWidth
            const scaleY = preset.height / displayHeight
            const scale = Math.max(scaleX, scaleY)

            console.log('Export settings:', {
                displayWidth,
                displayHeight,
                targetWidth: preset.width,
                targetHeight: preset.height,
                scale
            })

            // Use modern-screenshot with high scale factor
            // This will render the content at a higher resolution maintaining proportions
            const dataUrl = await domToPng(canvasElement, {
                scale: scale,
                quality: 1,
                backgroundColor: '#000000',
            })

            // Create a canvas to resize to exact dimensions
            const img = new Image()
            img.onload = () => {
                const outputCanvas = document.createElement('canvas')
                outputCanvas.width = preset.width
                outputCanvas.height = preset.height
                const ctx = outputCanvas.getContext('2d')

                if (ctx) {
                    // Draw the captured image centered and scaled to fill
                    const capturedAspect = img.width / img.height
                    const targetAspect = preset.width / preset.height

                    let drawWidth = preset.width
                    let drawHeight = preset.height
                    let drawX = 0
                    let drawY = 0

                    if (capturedAspect > targetAspect) {
                        // Captured is wider, fit by height
                        drawHeight = preset.height
                        drawWidth = img.width * (preset.height / img.height)
                        drawX = (preset.width - drawWidth) / 2
                    } else {
                        // Captured is taller, fit by width
                        drawWidth = preset.width
                        drawHeight = img.height * (preset.width / img.width)
                        drawY = (preset.height - drawHeight) / 2
                    }

                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

                    // Download
                    const finalDataUrl = outputCanvas.toDataURL('image/png', 1.0)
                    const link = document.createElement('a')
                    link.download = `feature-graphic-${preset.id}-${preset.width}x${preset.height}.png`
                    link.href = finalDataUrl
                    link.click()

                    console.log('Download triggered successfully')
                }

                setIsExporting(false)
            }

            img.onerror = () => {
                setError('Failed to process image')
                setIsExporting(false)
            }

            img.src = dataUrl

        } catch (err) {
            console.error('Export failed:', err)
            setError(err instanceof Error ? err.message : 'Export failed')
            setIsExporting(false)
        }
    }, [selectedPreset, setIsExporting])

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Download size={16} />
                Export Size
            </h3>

            {/* Platform Tabs */}
            <div className="space-y-3">
                {/* Android Presets */}
                <div className="space-y-2">
                    <span className="text-xs text-green-400 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        Google Play
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                        {EXPORT_PRESETS.filter(p => p.platform === 'android').map((preset) => (
                            <ExportPresetButton
                                key={preset.id}
                                preset={preset}
                                isSelected={selectedPreset === preset.id}
                                onClick={() => setSelectedPreset(preset.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* iOS Presets */}
                <div className="space-y-2">
                    <span className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        App Store
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                        {EXPORT_PRESETS.filter(p => p.platform === 'ios').map((preset) => (
                            <ExportPresetButton
                                key={preset.id}
                                preset={preset}
                                isSelected={selectedPreset === preset.id}
                                onClick={() => setSelectedPreset(preset.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Current Selection Info */}
            {selectedPresetData && (
                <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-sm text-white/80 font-medium">{selectedPresetData.name}</p>
                    <p className="text-xs text-white/50">{selectedPresetData.width} × {selectedPresetData.height} px</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400">
                    <AlertCircle size={16} />
                    <p className="text-xs">{error}</p>
                </div>
            )}

            {/* Export Button */}
            <button
                onClick={handleExport}
                disabled={isExporting}
                className={clsx(
                    "w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2",
                    isExporting
                        ? "bg-white/10 text-white/50 cursor-not-allowed"
                        : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 shadow-lg hover:shadow-violet-500/25"
                )}
            >
                {isExporting ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Exporting...
                    </>
                ) : (
                    <>
                        <Download size={18} />
                        Download PNG
                    </>
                )}
            </button>
        </div>
    )
}

interface ExportPresetButtonProps {
    preset: typeof EXPORT_PRESETS[number]
    isSelected: boolean
    onClick: () => void
}

const ExportPresetButton = ({ preset, isSelected, onClick }: ExportPresetButtonProps) => (
    <button
        onClick={onClick}
        className={clsx(
            "p-2 rounded-lg text-left transition-all duration-200",
            isSelected
                ? "bg-white/15 ring-2 ring-white/30"
                : "bg-white/5 hover:bg-white/10"
        )}
    >
        <p className="text-xs font-medium text-white/90 truncate">{preset.name}</p>
        <p className="text-[10px] text-white/50">{preset.width}×{preset.height}</p>
    </button>
)
