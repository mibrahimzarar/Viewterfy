import { create } from 'zustand'

// Device Types
export type DeviceType = 'iphone' | 'android' | 'ipad'
export type DeviceColor = 'black' | 'silver' | 'gold' | 'blue' | 'purple'
export type BackgroundType = 'gradient' | 'solid' | 'pattern' | 'image'
export type PatternType = 'dots' | 'grid' | 'waves' | 'circles'

// Preset Gradients
export const PRESET_GRADIENTS = [
    // Elegant Collection (Restored)
    { id: 'slate', name: 'Slate', value: 'linear-gradient(135deg, #475569 0%, #1e293b 50%, #000000 100%)' },
    { id: 'twilight', name: 'Twilight', value: 'linear-gradient(135deg, rgba(88, 28, 135, 0.8) 0%, #0f172a 50%, #000000 100%)' },
    { id: 'carbon', name: 'Carbon', value: 'linear-gradient(135deg, #404040 0%, #18181b 50%, #000000 100%)' },
    { id: 'forest', name: 'Forest', value: 'linear-gradient(135deg, #166534 0%, #064e3b 50%, #000000 100%)' },
    { id: 'gold', name: 'Gold', value: 'linear-gradient(135deg, rgba(202, 138, 4, 0.5) 0%, #111827 50%, #000000 100%)' },
    { id: 'velvet', name: 'Velvet', value: 'linear-gradient(225deg, rgba(185, 28, 28, 0.5) 0%, #111827 50%, #000000 100%)' },
    { id: 'cyber', name: 'Cyber', value: 'linear-gradient(45deg, rgba(8, 145, 178, 0.5) 0%, #111827 50%, rgba(147, 51, 234, 0.5) 100%)' },

    // Modern Collection (Filtered)
    { id: 'sunset', name: 'Sunset Glow', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' },
    // Removed: Ocean, Aurora, Fire
    { id: 'midnight', name: 'Midnight', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
    // Removed: Emerald
    { id: 'rose', name: 'Blush Onyx', value: 'linear-gradient(148deg, #0c090a 0%, #241a1f 34%, #4a3a42 62%, #7d6a72 88%, #c9bcc0 100%)' },
    { id: 'peach', name: 'Parchment Noir', value: 'linear-gradient(145deg, #0f0e0c 0%, #252019 38%, #433a30 64%, #6f6458 86%, #b5a89a 100%)' },
    { id: 'electric', name: 'Mercury Slate', value: 'linear-gradient(150deg, #060809 0%, #12181f 32%, #243040 58%, #3d4f5f 82%, #8a9aaa 100%)' },
    { id: 'nord', name: 'Nordic', value: 'linear-gradient(135deg, #2C3E50 0%, #4CA1AF 100%)' },
    { id: 'lavender', name: 'Lavender', value: 'linear-gradient(135deg, #E8CBC0 0%, #636FA4 100%)' },
    // Luxury / Refined Collection
    { id: 'obsidian', name: 'Obsidian Silk', value: 'linear-gradient(145deg, #0b0f14 0%, #1b2430 38%, #05070a 100%)' },
    { id: 'royal-noir', name: 'Royal Noir', value: 'linear-gradient(145deg, #0f1020 0%, #2a1f45 42%, #06070d 100%)' },
    { id: 'emerald-velour', name: 'Emerald Velour', value: 'linear-gradient(145deg, #081c15 0%, #1b4332 40%, #0b0f10 100%)' },
    { id: 'pearl-night', name: 'Pearl Night', value: 'linear-gradient(145deg, #edf2f4 0%, #8d99ae 35%, #1d3557 100%)' },
    { id: 'bronze-haze', name: 'Bronze Haze', value: 'linear-gradient(145deg, #2d1e17 0%, #8c5e3c 45%, #f1d2b3 100%)' },
    { id: 'sapphire-veil', name: 'Sapphire Veil', value: 'linear-gradient(145deg, #061a40 0%, #1b4965 42%, #cae9ff 100%)' },
    { id: 'amethyst-smoke', name: 'Amethyst Smoke', value: 'linear-gradient(145deg, #1b1028 0%, #5b4b8a 40%, #d6c6f5 100%)' },
    { id: 'auric-dusk', name: 'Auric Dusk', value: 'linear-gradient(145deg, #111827 0%, #6b5b2a 46%, #f7e7a1 100%)' },
    { id: 'velour-rose', name: 'Velour Rose', value: 'linear-gradient(145deg, #2a1118 0%, #8f4b62 40%, #f3d4dd 100%)' },
    { id: 'deep-lagoon', name: 'Deep Lagoon', value: 'linear-gradient(145deg, #031926 0%, #0a4f5c 42%, #9ee7d8 100%)' },
]

// Export Ratio Presets - Google Play & iOS App Store Requirements
export const EXPORT_PRESETS = [
    // Google Play Store
    { id: 'play-feature', name: 'Play Feature Graphic', width: 1024, height: 500, platform: 'android' },
    { id: 'play-phone', name: 'Play Phone Screenshot', width: 1080, height: 1920, platform: 'android' },
    { id: 'play-tablet-7', name: 'Play Tablet 7"', width: 1920, height: 1200, platform: 'android' },
    { id: 'play-tablet-10', name: 'Play Tablet 10"', width: 2560, height: 1600, platform: 'android' },
    // iOS App Store (Apple's exact requirements)
    { id: 'ios-65-portrait', name: 'iOS 6.5" Portrait', width: 1242, height: 2688, platform: 'ios' },
    { id: 'ios-65-landscape', name: 'iOS 6.5" Landscape', width: 2688, height: 1242, platform: 'ios' },
    { id: 'ios-67-portrait', name: 'iOS 6.7" Portrait', width: 1284, height: 2778, platform: 'ios' },
    { id: 'ios-67-landscape', name: 'iOS 6.7" Landscape', width: 2778, height: 1284, platform: 'ios' },
    { id: 'ios-ipad', name: 'iOS iPad Pro 12.9"', width: 2048, height: 2732, platform: 'ios' },
] as const

export type ExportPresetId = typeof EXPORT_PRESETS[number]['id']

// Store State Interface
interface FeatureGraphicState {
    // Screenshot
    screenshot: string | null
    setScreenshot: (url: string | null) => void

    // Device Settings
    deviceType: DeviceType
    deviceColor: DeviceColor
    deviceScale: number
    setDeviceType: (type: DeviceType) => void
    setDeviceColor: (color: DeviceColor) => void
    setDeviceScale: (scale: number) => void

    // Background Settings
    backgroundType: BackgroundType
    backgroundColor: string
    backgroundGradient: string
    backgroundPattern: PatternType
    backgroundImage: string | null
    setBackgroundType: (type: BackgroundType) => void
    setBackgroundColor: (color: string) => void
    setBackgroundGradient: (gradient: string) => void
    setBackgroundPattern: (pattern: PatternType) => void
    setBackgroundImage: (url: string | null) => void

    // Text Overlay
    headline: string
    headlineColor: string
    headlineSize: 'sm' | 'md' | 'lg' | 'xl'
    headlineScale: number
    setHeadline: (text: string) => void
    setHeadlineColor: (color: string) => void
    setHeadlineSize: (size: 'sm' | 'md' | 'lg' | 'xl') => void
    setHeadlineScale: (scale: number) => void

    // Export Settings
    selectedPreset: ExportPresetId
    setSelectedPreset: (preset: ExportPresetId) => void

    // Canvas Reference for Export
    isExporting: boolean
    setIsExporting: (exporting: boolean) => void

    // Reset
    reset: () => void
}

const initialState = {
    screenshot: null,
    deviceType: 'iphone' as DeviceType,
    deviceColor: 'black' as DeviceColor,
    deviceScale: 1.0,
    backgroundType: 'gradient' as BackgroundType,
    backgroundColor: '#1a1a2e',
    backgroundGradient: PRESET_GRADIENTS[PRESET_GRADIENTS.length - 1].value,
    backgroundPattern: 'dots' as PatternType,
    backgroundImage: null,
    headline: '',
    headlineColor: '#ffffff',
    headlineSize: 'lg' as const,
    headlineScale: 1,
    selectedPreset: 'play-feature' as ExportPresetId,
    isExporting: false,
}

export const useFeatureGraphicStore = create<FeatureGraphicState>((set) => ({
    ...initialState,

    // Screenshot Actions
    setScreenshot: (url) => set({ screenshot: url }),

    // Device Actions
    setDeviceType: (deviceType) => set({ deviceType }),
    setDeviceColor: (deviceColor) => set({ deviceColor }),
    setDeviceScale: (deviceScale) => set({ deviceScale }),

    // Background Actions
    setBackgroundType: (backgroundType) => set({ backgroundType }),
    setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
    setBackgroundGradient: (backgroundGradient) => set({ backgroundGradient }),
    setBackgroundPattern: (backgroundPattern) => set({ backgroundPattern }),
    setBackgroundImage: (backgroundImage) => set({ backgroundImage }),

    // Text Actions
    setHeadline: (headline) => set({ headline }),
    setHeadlineColor: (headlineColor) => set({ headlineColor }),
    setHeadlineSize: (headlineSize) => set({ headlineSize }),
    setHeadlineScale: (headlineScale) => set({ headlineScale }),

    // Export Actions
    setSelectedPreset: (selectedPreset) => set({ selectedPreset }),
    setIsExporting: (isExporting) => set({ isExporting }),

    // Reset
    reset: () => set(initialState),
}))
