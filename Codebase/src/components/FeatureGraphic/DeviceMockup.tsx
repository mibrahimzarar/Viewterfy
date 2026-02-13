import { clsx } from 'clsx'
import { useFeatureGraphicStore, type DeviceColor, type DeviceType } from '../../store/useFeatureGraphicStore'

interface DeviceMockupProps {
    className?: string
    scale?: number
}

// Device frame styles for different colors
const frameColors: Record<DeviceColor, { border: string; highlight: string; shadow: string }> = {
    black: { border: '#1a1a1a', highlight: '#333', shadow: 'rgba(0,0,0,0.5)' },
    silver: { border: '#c0c0c0', highlight: '#fff', shadow: 'rgba(0,0,0,0.3)' },
    gold: { border: '#d4af37', highlight: '#f5d77a', shadow: 'rgba(0,0,0,0.3)' },
    blue: { border: '#1e3a5f', highlight: '#2d5a87', shadow: 'rgba(0,0,0,0.4)' },
    purple: { border: '#4a2c6a', highlight: '#6b3d8a', shadow: 'rgba(0,0,0,0.4)' },
}

// Device dimensions (relative units)
const deviceDimensions: Record<DeviceType, { width: number; height: number; borderRadius: number; borderWidth: number; notchType: 'dynamic-island' | 'notch' | 'camera' | 'none' }> = {
    'iphone': { width: 280, height: 580, borderRadius: 48, borderWidth: 8, notchType: 'dynamic-island' },
    'android': { width: 280, height: 560, borderRadius: 36, borderWidth: 6, notchType: 'none' },
    'ipad': { width: 420, height: 560, borderRadius: 20, borderWidth: 12, notchType: 'camera' },
}

export const DeviceMockup = ({ className, scale = 1 }: DeviceMockupProps) => {
    const { screenshot, deviceType, deviceColor } = useFeatureGraphicStore()

    const colors = frameColors[deviceColor]
    const dims = deviceDimensions[deviceType]

    const scaledWidth = dims.width * scale
    const scaledHeight = dims.height * scale
    const isIPad = deviceType === 'ipad'

    return (
        <div
            className={clsx("relative group", className)}
            style={{
                width: scaledWidth,
                height: scaledHeight,
            }}
        >
            {/* Device Frame */}
            <div
                className="absolute inset-0 overflow-hidden transition-all duration-500"
                style={{
                    borderRadius: dims.borderRadius * scale,
                    border: `${dims.borderWidth * scale}px solid ${colors.border}`,
                    background: '#000',
                    boxShadow: `
                        inset 0 0 0 ${1 * scale}px ${colors.highlight},
                        0 ${20 * scale}px ${50 * scale}px ${-10 * scale}px ${colors.shadow},
                        0 ${5 * scale}px ${15 * scale}px ${-3 * scale}px rgba(0,0,0,0.3)
                    `,
                }}
            >
                {/* Dynamic Island (iPhone) */}
                {dims.notchType === 'dynamic-island' && (
                    <div
                        className="absolute left-1/2 -translate-x-1/2 bg-black z-30 flex justify-center items-center"
                        style={{
                            top: 8 * scale,
                            height: 28 * scale,
                            width: 100 * scale,
                            borderRadius: 20 * scale,
                        }}
                    >
                        <div
                            className="bg-black/50 rounded-full"
                            style={{
                                width: 72 * scale,
                                height: 16 * scale,
                            }}
                        />
                    </div>
                )}

                {dims.notchType === 'notch' && (
                    <div
                        className="absolute left-1/2 -translate-x-1/2 top-0 bg-black z-30"
                        style={{
                            height: 24 * scale,
                            width: 140 * scale,
                            borderBottomLeftRadius: 16 * scale,
                            borderBottomRightRadius: 16 * scale,
                        }}
                    />
                )}

                {/* iPad Front Camera (small dot at top center) */}
                {dims.notchType === 'camera' && (
                    <div
                        className="absolute left-1/2 -translate-x-1/2 z-30 rounded-full"
                        style={{
                            top: 6 * scale,
                            width: 8 * scale,
                            height: 8 * scale,
                            background: 'radial-gradient(circle, #1a1a2e 40%, #0d0d1a 100%)',
                            boxShadow: `0 0 0 ${1.5 * scale}px rgba(50,50,80,0.6)`,
                        }}
                    />
                )}

                {/* Screen Content */}
                <div
                    className="w-full h-full relative overflow-hidden flex items-center justify-center"
                    style={{
                        borderRadius: (dims.borderRadius - dims.borderWidth) * scale,
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    }}
                >
                    {screenshot ? (
                        <img
                            src={screenshot}
                            alt="App Screenshot"
                            className="w-full h-full object-cover"
                            style={{
                                borderRadius: (dims.borderRadius - dims.borderWidth - 2) * scale,
                                objectPosition: 'center top',
                            }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-white/20 p-4 text-center space-y-3">
                            <div
                                className="flex items-center justify-center"
                                style={{
                                    width: 48 * scale,
                                    height: 48 * scale,
                                }}
                            >
                                <span style={{ fontSize: 24 * scale }}>📷</span>
                            </div>
                            <p style={{ fontSize: 12 * scale }}>No Screenshot</p>
                        </div>
                    )}
                </div>

                {/* iPad Home Indicator Bar */}
                {isIPad && (
                    <div
                        className="absolute left-1/2 -translate-x-1/2 rounded-full"
                        style={{
                            bottom: 6 * scale,
                            width: 100 * scale,
                            height: 4 * scale,
                            background: 'rgba(255,255,255,0.5)',
                            borderRadius: 3 * scale,
                            zIndex: 60,
                        }}
                    />
                )}

                {/* Glass Reflection Overlay */}
                <div
                    className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] via-transparent to-white/[0.08] pointer-events-none z-40"
                    style={{
                        borderRadius: (dims.borderRadius - dims.borderWidth) * scale,
                    }}
                />
            </div>

            {/* Ambient Glow */}
            <div
                className="absolute inset-0 blur-3xl opacity-30 -z-10 transition-colors duration-1000"
                style={{
                    background: deviceColor === 'blue' ? 'rgba(30, 58, 95, 0.5)'
                        : deviceColor === 'gold' ? 'rgba(212, 175, 55, 0.3)'
                            : deviceColor === 'purple' ? 'rgba(74, 44, 106, 0.5)'
                                : deviceColor === 'silver' ? 'rgba(192, 192, 192, 0.3)'
                                    : 'rgba(100, 100, 150, 0.3)',
                    borderRadius: dims.borderRadius * scale,
                }}
            />
        </div>
    )
}
