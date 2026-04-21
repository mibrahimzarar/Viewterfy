import type { ViewterfyProps } from '../remotion/viewterfyProps'
import { viewterfyPropsSchema } from '../remotion/viewterfyProps'
import type { AspectRatio, Scene } from '../store/useStore'
import { normalizeSceneScrollForExport } from './normalizeSceneScroll'

async function ensureDataUrl(url: string | null): Promise<string | null> {
    if (!url) return null
    if (url.startsWith('data:')) return url
    if (url.startsWith('blob:')) {
        const res = await fetch(url)
        const blob = await res.blob()
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    }
    return url
}

type PlainSnapshot = Record<string, unknown>

const DEFAULT_FPS = 30

const DEFAULT_VW = 1920
const DEFAULT_VH = 1080
const HD_EXPORT = {
    square: { width: 1080, height: 1080 },
    vertical: { width: 1080, height: 1920 },
} as const

/**
 * Build validated Remotion input props from editor state (blob URLs → data URLs for CLI render).
 * `width`/`height` match the live preview `#canvas-stage` (same as export locked dimensions).
 * Uses consistent defaults for viewport dimensions to match preview exactly.
 */
export async function buildViewterfyRemotionProps(snapshot: PlainSnapshot): Promise<ViewterfyProps> {
    const aspectRatio: AspectRatio = snapshot.aspectRatio === '9:16' ? '9:16' : '1:1'
    const fps = DEFAULT_FPS
    const viewportWidth = DEFAULT_VW
    const viewportHeight = DEFAULT_VH
    const { width, height } = aspectRatio === '9:16' ? HD_EXPORT.vertical : HD_EXPORT.square

    const scenesRaw = snapshot.scenes as Scene[]
    const scenes: Scene[] = await Promise.all(
        scenesRaw.map(async (s) => ({
            ...s,
            screenshots: await Promise.all(s.screenshots.map((u) => ensureDataUrl(u) as Promise<string>)),
            backgroundImage: await ensureDataUrl(s.backgroundImage),
        })),
    )

    const ib = snapshot.introBackground as ViewterfyProps['introBackground']
    const ob = snapshot.outroBackground as ViewterfyProps['outroBackground']

    const introBackground: ViewterfyProps['introBackground'] = {
        ...ib,
        backgroundImage: await ensureDataUrl(ib.backgroundImage),
    }

    const outroBackground: ViewterfyProps['outroBackground'] = {
        ...ob,
        backgroundImage: await ensureDataUrl(ob.backgroundImage),
    }

    const scrollRaw = (snapshot.sceneScrollSecondsById as Record<string, number>) ?? {}
    const maxRaw = (snapshot.sceneMaxScrollPxById as Record<string, number> | undefined) ?? {}
    const { sceneScrollSecondsById, sceneMaxScrollPxById } = normalizeSceneScrollForExport(scenes, scrollRaw, maxRaw, aspectRatio)

    const raw: ViewterfyProps = {
        fps,
        width,
        height,
        viewportWidth,
        viewportHeight,
        aspectRatio,
        showIntro: Boolean(snapshot.showIntro),
        introLogo: await ensureDataUrl((snapshot.introLogo as string | null) ?? null),
        introTitle: String(snapshot.introTitle ?? ''),
        introSubtitle: String(snapshot.introSubtitle ?? ''),
        introBackground,
        showOutro: Boolean(snapshot.showOutro),
        outroQrCode: await ensureDataUrl((snapshot.outroQrCode as string | null) ?? null),
        outroBackground,
        scenes,
        sceneScrollSecondsById,
        sceneMaxScrollPxById,
        audioDataUrl: await ensureDataUrl((snapshot.audioFile as string | null) ?? null),
        audioVolume: Number(snapshot.audioVolume ?? 0.5),
        audioTrimStartSec: Number((snapshot.audioTrim as { start?: number } | undefined)?.start ?? 0),
    }

    return viewterfyPropsSchema.parse(raw)
}

export function downloadJson(filename: string, data: unknown): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    a.click()
    URL.revokeObjectURL(url)
}
