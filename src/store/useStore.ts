import { create } from 'zustand'
import { PRESET_GRADIENTS } from './useFeatureGraphicStore'

export type PhoneColor = 'black' | 'silver' | 'gold' | 'blue'
export type AspectRatio = '1:1' | '9:16'
export type TextAnimation = 'fade' | 'slide' | 'none'
export type IntroMode = 'logo' | 'text-hook' | 'text-then-logo'

// Scene Definition
export interface Scene {
    id: string
    screenshots: string[]
    headline: string
    subtitle: string
    headlineScale: number
    subtitleScale: number
    mockupScale: number
    // Per-Scene Settings
    phoneColor: PhoneColor
    // Background
    backgroundType: 'gradient' | 'solid' | 'pattern' | 'image'
    backgroundColor: string
    backgroundGradient: string
    backgroundPattern: 'dots' | 'grid' | 'waves' | 'circles'
    backgroundImage: string | null
    scrollSpeed: number
}

export interface BackgroundSettings {
    backgroundType: 'gradient' | 'solid' | 'pattern' | 'image'
    backgroundColor: string
    backgroundGradient: string
    backgroundPattern: 'dots' | 'grid' | 'waves' | 'circles'
    backgroundImage: string | null
}

interface AppState {
    // Scene Management
    scenes: Scene[]
    activeSceneId: string
    addScene: () => void
    removeScene: (id: string) => void
    setActiveScene: (id: string) => void

    // Active Scene Actions (Proxies)
    addScreenshots: (urls: string[]) => void
    removeScreenshot: (index: number) => void
    reorderScreenshots: (newOrder: string[]) => void
    updateHeadline: (text: string) => void
    updateSubtitle: (text: string) => void
    setHeadlineScale: (scale: number) => void
    setSubtitleScale: (scale: number) => void
    setMockupScale: (scale: number) => void

    // Per-Scene Setters (Proxy to Active Scene)
    setPhoneColor: (color: PhoneColor) => void
    // Background Setters
    setBackgroundType: (type: 'gradient' | 'solid' | 'pattern' | 'image') => void
    setBackgroundColor: (color: string) => void
    setBackgroundGradient: (gradient: string) => void
    setBackgroundPattern: (pattern: 'dots' | 'grid' | 'waves' | 'circles') => void
    setBackgroundImage: (image: string | null) => void
    setScrollSpeed: (speed: number) => void

    // Animation State (Global)
    isPlaying: boolean
    setIsPlaying: (playing: boolean) => void
    videoDuration: number
    setVideoDuration: (duration: number) => void

    // Export Settings (Global)
    aspectRatio: AspectRatio
    setAspectRatio: (ratio: AspectRatio) => void
    isExporting: boolean
    setIsExporting: (exporting: boolean) => void
    /** Full intro → scenes → outro preview in the stage (no recording). */
    isFullCyclePreview: boolean
    setIsFullCyclePreview: (preview: boolean) => void
    /** Measured scroll segment + tail hold per scene id (updated from PhoneMockup). */
    sceneScrollSecondsById: Record<string, number>
    setSceneScrollSecondsById: (sceneId: string, seconds: number) => void
    /** Measured max scroll pixels per scene (for Remotion frame-accurate scroll). */
    sceneMaxScrollPxById: Record<string, number>
    setSceneMaxScrollPxById: (sceneId: string, px: number) => void
    animationFinished: boolean
    setAnimationFinished: (finished: boolean) => void

    lockedDimensions: { width: number, height: number } | null
    setLockedDimensions: (dims: { width: number, height: number } | null) => void

    resetScrollSignal: number
    triggerReset: () => void

    // Fade Effects
    fadeEffect: 'none' | 'fadeIn' | 'fadeOut'
    setFadeEffect: (effect: 'none' | 'fadeIn' | 'fadeOut') => void

    // Intro Settings
    showIntro: boolean
    introMode: IntroMode
    introLogo: string | null
    introHookText: string
    introTitle: string
    introSubtitle: string
    introBackground: BackgroundSettings
    setShowIntro: (show: boolean) => void
    setIntroMode: (mode: IntroMode) => void
    setIntroLogo: (logo: string | null) => void
    setIntroHookText: (text: string) => void
    setIntroTitle: (text: string) => void
    setIntroSubtitle: (text: string) => void

    // Outro Settings
    showOutro: boolean
    outroQrCode: string | null
    outroBackground: BackgroundSettings
    setShowOutro: (show: boolean) => void
    setOutroQrCode: (qr: string | null) => void

    // Audio Settings
    audioFile: string | null
    audioName: string | null
    audioVolume: number
    audioTrim: { start: number, end: number }
    setAudioFile: (file: string | null) => void
    setAudioName: (name: string | null) => void
    setAudioVolume: (volume: number) => void
    setAudioTrim: (trim: { start: number, end: number }) => void
}

export const useStore = create<AppState>((set) => ({
    // Scenes
    scenes: [{
        id: 'default',
        screenshots: [],
        headline: "Experience the Future",
        subtitle: "Seamless, elegant, and powerful.",
        headlineScale: 1,
        subtitleScale: 1,
        mockupScale: 1,
        phoneColor: 'black',
        backgroundType: 'gradient',
        backgroundColor: '#1a1a2e',
        backgroundGradient: PRESET_GRADIENTS[PRESET_GRADIENTS.length - 1].value,
        backgroundPattern: 'dots',
        backgroundImage: null,
        scrollSpeed: 20
    }],
    activeSceneId: 'default',

    // Intro Settings Initial State
    showIntro: false,
    introMode: 'logo',
    introLogo: null,
    introHookText: 'Transform your daily habits in 30 seconds.',
    introTitle: "Welcome",
    introSubtitle: "Discover the amazing features",
    introBackground: {
        backgroundType: 'gradient',
        backgroundColor: '#1a1a2e',
        backgroundGradient: PRESET_GRADIENTS[PRESET_GRADIENTS.length - 1].value,
        backgroundPattern: 'dots',
        backgroundImage: null,
    },

    // Outro Settings Initial State
    showOutro: false,
    outroQrCode: null,
    outroBackground: {
        backgroundType: 'gradient',
        backgroundColor: '#1a1a2e',
        backgroundGradient: PRESET_GRADIENTS[PRESET_GRADIENTS.length - 1].value,
        backgroundPattern: 'dots',
        backgroundImage: null,
    },

    // Audio Initial State
    audioFile: null,
    audioName: null,
    audioVolume: 0.5,
    audioTrim: { start: 0, end: 0 },

    addScene: () => set((state) => {
        const newId = crypto.randomUUID()
        // Clone the last scene's settings for convenience
        const lastScene = state.scenes[state.scenes.length - 1]
        return {
            scenes: [...state.scenes, {
                id: newId,
                screenshots: [],
                headline: "New Scene",
                subtitle: "Describe this scene...",
                headlineScale: lastScene.headlineScale,
                subtitleScale: lastScene.subtitleScale,
                mockupScale: lastScene.mockupScale,
                phoneColor: lastScene.phoneColor,
                backgroundType: lastScene.backgroundType,
                backgroundColor: lastScene.backgroundColor,
                backgroundGradient: lastScene.backgroundGradient,
                backgroundPattern: lastScene.backgroundPattern,
                backgroundImage: lastScene.backgroundImage,
                scrollSpeed: lastScene.scrollSpeed
            }],
            activeSceneId: newId
        }
    }),

    removeScene: (id) => set((state) => {
        if (state.scenes.length <= 1) return state // Don't delete last scene
        const newScenes = state.scenes.filter(s => s.id !== id)
        return {
            scenes: newScenes,
            activeSceneId: newScenes[0].id // Fallback to first
        }
    }),

    setActiveScene: (activeSceneId) => set({ activeSceneId }),

    // Helper to resolve target scene ID
    // INTRO -> First Scene
    // OUTRO -> Last Scene
    // Scene ID -> Scene ID

    // Proxy Actions -- modify the ACTIVE scene (or mapped scene)
    addScreenshots: (urls) => set((state) => {
        const targetId = state.activeSceneId === 'INTRO' ? state.scenes[0].id : state.activeSceneId === 'OUTRO' ? state.scenes[state.scenes.length - 1].id : state.activeSceneId
        return {
            scenes: state.scenes.map(s => s.id === targetId
                ? { ...s, screenshots: [...s.screenshots, ...urls] }
                : s
            )
        }
    }),

    removeScreenshot: (index) => set((state) => {
        const targetId = state.activeSceneId === 'INTRO' ? state.scenes[0].id : state.activeSceneId === 'OUTRO' ? state.scenes[state.scenes.length - 1].id : state.activeSceneId
        return {
            scenes: state.scenes.map(s => s.id === targetId
                ? { ...s, screenshots: s.screenshots.filter((_, i) => i !== index) }
                : s
            )
        }
    }),

    reorderScreenshots: (newOrder) => set((state) => {
        const targetId = state.activeSceneId === 'INTRO' ? state.scenes[0].id : state.activeSceneId === 'OUTRO' ? state.scenes[state.scenes.length - 1].id : state.activeSceneId
        return {
            scenes: state.scenes.map(s => s.id === targetId ? { ...s, screenshots: newOrder } : s)
        }
    }),

    updateHeadline: (headline) => set((state) => {
        const targetId = state.activeSceneId === 'INTRO' ? state.scenes[0].id : state.activeSceneId === 'OUTRO' ? state.scenes[state.scenes.length - 1].id : state.activeSceneId
        return {
            scenes: state.scenes.map(s => s.id === targetId ? { ...s, headline } : s)
        }
    }),

    updateSubtitle: (subtitle) => set((state) => {
        const targetId = state.activeSceneId === 'INTRO' ? state.scenes[0].id : state.activeSceneId === 'OUTRO' ? state.scenes[state.scenes.length - 1].id : state.activeSceneId
        return {
            scenes: state.scenes.map(s => s.id === targetId ? { ...s, subtitle } : s)
        }
    }),
    setHeadlineScale: (headlineScale) => set((state) => {
        const targetId = state.activeSceneId === 'INTRO' ? state.scenes[0].id : state.activeSceneId === 'OUTRO' ? state.scenes[state.scenes.length - 1].id : state.activeSceneId
        return {
            scenes: state.scenes.map(s => s.id === targetId ? { ...s, headlineScale } : s)
        }
    }),
    setSubtitleScale: (subtitleScale) => set((state) => {
        const targetId = state.activeSceneId === 'INTRO' ? state.scenes[0].id : state.activeSceneId === 'OUTRO' ? state.scenes[state.scenes.length - 1].id : state.activeSceneId
        return {
            scenes: state.scenes.map(s => s.id === targetId ? { ...s, subtitleScale } : s)
        }
    }),
    setMockupScale: (mockupScale) => set((state) => {
        const targetId = state.activeSceneId === 'INTRO' ? state.scenes[0].id : state.activeSceneId === 'OUTRO' ? state.scenes[state.scenes.length - 1].id : state.activeSceneId
        return {
            scenes: state.scenes.map(s => s.id === targetId ? { ...s, mockupScale } : s)
        }
    }),

    setPhoneColor: (phoneColor) => set((state) => {
        const targetId = state.activeSceneId === 'INTRO' ? state.scenes[0].id : state.activeSceneId === 'OUTRO' ? state.scenes[state.scenes.length - 1].id : state.activeSceneId
        return {
            scenes: state.scenes.map(s => s.id === targetId ? { ...s, phoneColor } : s)
        }
    }),

    setBackgroundType: (type) => set((state) => {
        if (state.activeSceneId === 'INTRO') {
            return { introBackground: { ...state.introBackground, backgroundType: type } }
        }
        if (state.activeSceneId === 'OUTRO') {
            return { outroBackground: { ...state.outroBackground, backgroundType: type } }
        }
        return { scenes: state.scenes.map(s => s.id === state.activeSceneId ? { ...s, backgroundType: type } : s) }
    }),
    setBackgroundColor: (color) => set((state) => {
        if (state.activeSceneId === 'INTRO') {
            return { introBackground: { ...state.introBackground, backgroundColor: color } }
        }
        if (state.activeSceneId === 'OUTRO') {
            return { outroBackground: { ...state.outroBackground, backgroundColor: color } }
        }
        return { scenes: state.scenes.map(s => s.id === state.activeSceneId ? { ...s, backgroundColor: color } : s) }
    }),
    setBackgroundGradient: (gradient) => set((state) => {
        if (state.activeSceneId === 'INTRO') {
            return { introBackground: { ...state.introBackground, backgroundGradient: gradient } }
        }
        if (state.activeSceneId === 'OUTRO') {
            return { outroBackground: { ...state.outroBackground, backgroundGradient: gradient } }
        }
        return { scenes: state.scenes.map(s => s.id === state.activeSceneId ? { ...s, backgroundGradient: gradient } : s) }
    }),
    setBackgroundPattern: (pattern) => set((state) => {
        if (state.activeSceneId === 'INTRO') {
            return { introBackground: { ...state.introBackground, backgroundPattern: pattern } }
        }
        if (state.activeSceneId === 'OUTRO') {
            return { outroBackground: { ...state.outroBackground, backgroundPattern: pattern } }
        }
        return { scenes: state.scenes.map(s => s.id === state.activeSceneId ? { ...s, backgroundPattern: pattern } : s) }
    }),
    setBackgroundImage: (image) => set((state) => {
        if (state.activeSceneId === 'INTRO') {
            return { introBackground: { ...state.introBackground, backgroundImage: image } }
        }
        if (state.activeSceneId === 'OUTRO') {
            return { outroBackground: { ...state.outroBackground, backgroundImage: image } }
        }
        return { scenes: state.scenes.map(s => s.id === state.activeSceneId ? { ...s, backgroundImage: image } : s) }
    }),

    setScrollSpeed: (scrollSpeed) => set((state) => {
        const targetId = state.activeSceneId === 'INTRO' ? state.scenes[0].id : state.activeSceneId === 'OUTRO' ? state.scenes[state.scenes.length - 1].id : state.activeSceneId
        return {
            scenes: state.scenes.map(s => s.id === targetId ? { ...s, scrollSpeed } : s)
        }
    }),

    // Animation
    isPlaying: false,
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    videoDuration: 0,
    setVideoDuration: (duration) => set({ videoDuration: duration }),

    // Export State
    aspectRatio: '1:1',
    setAspectRatio: (aspectRatio) => set({ aspectRatio }),

    isExporting: false,
    setIsExporting: (isExporting) => set({ isExporting }),
    isFullCyclePreview: false,
    setIsFullCyclePreview: (isFullCyclePreview) => set({ isFullCyclePreview }),
    sceneScrollSecondsById: {},
    setSceneScrollSecondsById: (sceneId, seconds) =>
        set((state) => ({
            sceneScrollSecondsById: { ...state.sceneScrollSecondsById, [sceneId]: seconds },
        })),
    sceneMaxScrollPxById: {},
    setSceneMaxScrollPxById: (sceneId, px) =>
        set((state) => ({
            sceneMaxScrollPxById: { ...state.sceneMaxScrollPxById, [sceneId]: px },
        })),
    animationFinished: false,
    setAnimationFinished: (animationFinished) => set({ animationFinished }),

    lockedDimensions: null,
    setLockedDimensions: (lockedDimensions) => set({ lockedDimensions }),

    resetScrollSignal: 0,
    triggerReset: () => set((state) => ({ resetScrollSignal: state.resetScrollSignal + 1 })),

    // Fade Initial State
    fadeEffect: 'none',
    setFadeEffect: (fadeEffect) => set({ fadeEffect }),

    // Intro Actions
    setShowIntro: (show) => set({ showIntro: show }),
    setIntroMode: (mode) => set({ introMode: mode }),
    setIntroLogo: (logo) => set({ introLogo: logo }),
    setIntroHookText: (text) => set({ introHookText: text }),
    setIntroTitle: (text) => set({ introTitle: text }),
    setIntroSubtitle: (text) => set({ introSubtitle: text }),

    // Outro Actions
    setShowOutro: (show) => set({ showOutro: show }),
    setOutroQrCode: (qr) => set({ outroQrCode: qr }),

    // Audio Actions
    setAudioFile: (file) => set({ audioFile: file }),
    setAudioName: (name) => set({ audioName: name }),
    setAudioVolume: (volume) => set({ audioVolume: volume }),
    setAudioTrim: (trim) => set({ audioTrim: trim }),
}))
