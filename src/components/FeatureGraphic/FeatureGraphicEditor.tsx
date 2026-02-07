import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Smartphone, Tablet, Type, Palette } from 'lucide-react'
import { useFeatureGraphicStore, EXPORT_PRESETS, type DeviceType, type DeviceColor } from '../../store/useFeatureGraphicStore'
import { DeviceMockup } from './DeviceMockup'
import { BackgroundPicker, getBackgroundStyle } from './BackgroundPicker'
import { ExportPanel } from './ExportPanel'

// Device options
const deviceOptions: { id: DeviceType; label: string; icon: typeof Smartphone }[] = [
    { id: 'iphone', label: 'iPhone', icon: Smartphone },
    { id: 'android', label: 'Android', icon: Smartphone },
    { id: 'ipad', label: 'iPad', icon: Tablet },
    { id: 'android-tablet', label: 'Android Tablet', icon: Tablet },
]

const colorOptions: { id: DeviceColor; label: string; color: string }[] = [
    { id: 'black', label: 'Black', color: '#1a1a1a' },
    { id: 'silver', label: 'Silver', color: '#c0c0c0' },
    { id: 'gold', label: 'Gold', color: '#d4af37' },
    { id: 'blue', label: 'Blue', color: '#1e3a5f' },
    { id: 'purple', label: 'Purple', color: '#4a2c6a' },
]

export const FeatureGraphicEditor = () => {
    const store = useFeatureGraphicStore()
    const {
        screenshot,
        deviceType,
        deviceColor,
        headline,
        headlineColor,
        selectedPreset,
        setScreenshot,
        setDeviceType,
        setDeviceColor,
        setHeadline,
        setHeadlineColor,
    } = store

    const selectedPresetData = EXPORT_PRESETS.find(p => p.id === selectedPreset)
    const aspectRatio = selectedPresetData
        ? selectedPresetData.width / selectedPresetData.height
        : 2

    // Dropzone for screenshot
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
                setScreenshot(event.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }, [setScreenshot])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
        maxFiles: 1,
    })

    // Get background style
    const bgStyle = getBackgroundStyle(store)

    // Calculate device scale based on canvas size
    const getDeviceScale = () => {
        if (deviceType === 'android-tablet') return 0.6  // Bigger Android tablet
        if (deviceType === 'ipad') return 0.55
        if (aspectRatio > 1.5) return 0.6 // Landscape (feature graphic)
        return 0.55
    }

    return (
        <div className="h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex overflow-hidden">
            {/* Canvas Preview Area - Fixed */}
            <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
                {/* Ambient Background Glow - Elegant Light Colors */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-violet-400/20 rounded-full blur-[150px] opacity-70" />
                    <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-rose-300/15 rounded-full blur-[120px] opacity-60" />
                    <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-sky-300/15 rounded-full blur-[100px] opacity-50" />
                </div>
                <div
                    className="relative overflow-hidden rounded-2xl shadow-2xl"
                    style={{
                        aspectRatio: `${selectedPresetData?.width || 1024} / ${selectedPresetData?.height || 500}`,
                        // For landscape (aspect > 1), constrain by width
                        // For portrait (aspect < 1), constrain by height
                        ...(aspectRatio > 1
                            ? { width: 'min(85%, 900px)', maxHeight: '75vh' }
                            : { height: 'min(85vh, 700px)', maxWidth: '90%' }
                        ),
                    }}
                >
                    {/* Export Canvas */}
                    <div
                        id="feature-graphic-canvas"
                        className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
                        style={bgStyle}
                    >
                        {/* Headline */}
                        <AnimatePresence>
                            {headline && (
                                <motion.h1
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="absolute text-center font-bold z-10 px-8"
                                    style={{
                                        top: '8%',
                                        color: headlineColor,
                                        fontSize: aspectRatio > 1.5 ? 'clamp(1.5rem, 4vw, 3rem)' : 'clamp(1.2rem, 3vw, 2rem)',
                                        textShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                        maxWidth: '90%',
                                    }}
                                >
                                    {headline}
                                </motion.h1>
                            )}
                        </AnimatePresence>

                        {/* Device Mockup */}
                        <div
                            className="relative z-20"
                            style={{
                                transform: headline ? 'translateY(8%)' : 'translateY(0)',
                                transition: 'transform 0.3s ease',
                            }}
                        >
                            <DeviceMockup scale={getDeviceScale()} />
                        </div>
                    </div>


                </div>
            </div>

            {/* Control Panel */}
            <div className="w-[380px] bg-black/30 backdrop-blur-xl border-l border-white/10 overflow-y-auto">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div>
                        <h2 className="text-xl font-bold text-white">Feature Graphic</h2>
                        <p className="text-sm text-white/50">Create stunning app store graphics</p>
                    </div>

                    {/* Screenshot Upload */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                            <Upload size={16} />
                            Screenshot
                        </h3>
                        <div
                            {...getRootProps()}
                            className={clsx(
                                "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
                                isDragActive
                                    ? "border-violet-500 bg-violet-500/10"
                                    : "border-white/20 hover:border-white/40"
                            )}
                        >
                            <input {...getInputProps()} />
                            {screenshot ? (
                                <div className="relative">
                                    <img src={screenshot} alt="Screenshot" className="w-full h-24 object-cover rounded-lg" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setScreenshot(null) }}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-400 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-white/40 py-2">
                                    <Upload className="mx-auto mb-1" size={20} />
                                    <p className="text-xs">Drop or click to upload</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Device Selection */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                            <Smartphone size={16} />
                            Device
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {deviceOptions.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setDeviceType(id)}
                                    className={clsx(
                                        "p-2.5 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 transition-all",
                                        deviceType === id
                                            ? "bg-white/15 text-white ring-2 ring-white/30"
                                            : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                                    )}
                                >
                                    <Icon size={18} />
                                    <span className="truncate">{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Color Selection */}
                        <div className="flex gap-2 pt-2">
                            {colorOptions.map(({ id, label, color }) => (
                                <button
                                    key={id}
                                    onClick={() => setDeviceColor(id)}
                                    className={clsx(
                                        "w-8 h-8 rounded-full transition-all hover:scale-110",
                                        deviceColor === id ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900" : ""
                                    )}
                                    style={{ background: color }}
                                    title={label}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Background */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                            <Palette size={16} />
                            Background
                        </h3>
                        <BackgroundPicker />
                    </section>

                    {/* Text Overlay */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                            <Type size={16} />
                            Headline
                        </h3>
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={headline}
                                onChange={(e) => setHeadline(e.target.value)}
                                placeholder="Enter headline text..."
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-white/50">Color:</span>
                                <input
                                    type="color"
                                    value={headlineColor}
                                    onChange={(e) => setHeadlineColor(e.target.value)}
                                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                                />
                                <input
                                    type="text"
                                    value={headlineColor}
                                    onChange={(e) => setHeadlineColor(e.target.value)}
                                    className="flex-1 bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Export */}
                    <section>
                        <ExportPanel />
                    </section>
                </div>
            </div>
        </div>
    )
}
