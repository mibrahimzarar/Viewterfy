import { z } from 'zod'
import { PRESET_GRADIENTS } from '../store/useFeatureGraphicStore'
import { getExportStageDimensions } from '../utils/exportStageDimensions'

/** Match `buildRemotionJob` viewport so studio preview and CLI renders use the same stage math. */
const DEFAULT_VW = 1920
const DEFAULT_VH = 1080
const DEFAULT_STAGE = getExportStageDimensions(DEFAULT_VW, DEFAULT_VH, '1:1')

const backgroundSchema = z.object({
    backgroundType: z.enum(['gradient', 'solid', 'pattern', 'image']),
    backgroundColor: z.string(),
    backgroundGradient: z.string(),
    backgroundPattern: z.enum(['dots', 'grid', 'waves', 'circles']),
    backgroundImage: z.string().nullable(),
})

const sceneSchema = z.object({
    id: z.string(),
    screenshots: z.array(z.string()),
    headline: z.string(),
    subtitle: z.string(),
    headlineScale: z.number(),
    subtitleScale: z.number(),
    mockupScale: z.number(),
    phoneColor: z.enum(['black', 'silver', 'gold', 'blue']),
    backgroundType: z.enum(['gradient', 'solid', 'pattern', 'image']),
    backgroundColor: z.string(),
    backgroundGradient: z.string(),
    backgroundPattern: z.enum(['dots', 'grid', 'waves', 'circles']),
    backgroundImage: z.string().nullable(),
    scrollSpeed: z.number(),
})

export const viewterfyPropsSchema = z.object({
    fps: z.number(),
    /** Composition = preview `#canvas-stage` pixel size (matches locked export dimensions). */
    width: z.number(),
    height: z.number(),
    /** Browser inner dimensions when the job was built — `vw` in Layout uses full window width. */
    viewportWidth: z.number().default(DEFAULT_VW),
    viewportHeight: z.number().default(DEFAULT_VH),
    aspectRatio: z.enum(['1:1', '9:16']),
    showIntro: z.boolean(),
    introMode: z.enum(['logo', 'text-hook', 'text-then-logo']).default('logo'),
    introLogo: z.string().nullable(),
    introHookText: z.string().default(''),
    introTitle: z.string(),
    introSubtitle: z.string(),
    introBackground: backgroundSchema,
    showOutro: z.boolean(),
    outroQrCode: z.string().nullable(),
    outroBackground: backgroundSchema,
    scenes: z.array(sceneSchema),
    sceneScrollSecondsById: z.record(z.string(), z.number()),
    sceneMaxScrollPxById: z.record(z.string(), z.number()).optional(),
    audioDataUrl: z.string().nullable().optional(),
    audioVolume: z.number().optional(),
    /** Seconds to skip from the start of the uploaded audio (matches editor trim start). */
    audioTrimStartSec: z.number().optional(),
})

export type ViewterfyProps = z.infer<typeof viewterfyPropsSchema>

const defaultGradient = PRESET_GRADIENTS[PRESET_GRADIENTS.length - 1].value

export const defaultViewterfyProps: ViewterfyProps = {
    fps: 30,
    width: DEFAULT_STAGE.width,
    height: DEFAULT_STAGE.height,
    viewportWidth: DEFAULT_VW,
    viewportHeight: DEFAULT_VH,
    aspectRatio: '1:1',
    showIntro: false,
    introMode: 'logo',
    introLogo: null,
    introHookText: 'Transform your daily habits in 30 seconds.',
    introTitle: 'Welcome',
    introSubtitle: 'Discover the amazing features',
    introBackground: {
        backgroundType: 'gradient',
        backgroundColor: '#1a1a2e',
        backgroundGradient: defaultGradient,
        backgroundPattern: 'dots',
        backgroundImage: null,
    },
    showOutro: false,
    outroQrCode: null,
    outroBackground: {
        backgroundType: 'gradient',
        backgroundColor: '#1a1a2e',
        backgroundGradient: defaultGradient,
        backgroundPattern: 'dots',
        backgroundImage: null,
    },
    scenes: [
        {
            id: 'default',
            screenshots: [],
            headline: 'Experience the Future',
            subtitle: 'Seamless, elegant, and powerful.',
            headlineScale: 1,
            subtitleScale: 1,
            mockupScale: 1,
            phoneColor: 'black',
            backgroundType: 'gradient',
            backgroundColor: '#1a1a2e',
            backgroundGradient: defaultGradient,
            backgroundPattern: 'dots',
            backgroundImage: null,
            scrollSpeed: 20,
        },
    ],
    sceneScrollSecondsById: { default: 3 },
    sceneMaxScrollPxById: {},
    audioDataUrl: null,
    audioVolume: 0.5,
    audioTrimStartSec: 0,
}

export function secondsToFrames(sec: number, fps: number): number {
    return Math.max(1, Math.round(sec * fps))
}
