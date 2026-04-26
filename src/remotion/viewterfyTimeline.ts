import type { ViewterfyProps } from './viewterfyProps'
import {
    PREVIEW_END_FADE_MS,
    PREVIEW_INTRO_HANDOFF_MS,
    PREVIEW_OUTRO_ENTRY_DELAY_MS,
    PREVIEW_OUTRO_MS,
    msToFrames,
    previewIntroMsByMode,
    previewBetweenScenesMs,
} from './previewTimeline'

const DEFAULT_SCENE_SEC = 3

/** Sum of every `Series.Sequence` segment — must stay in sync with `ViewterfyComposition`. */
export function computeSeriesTotalFrames(p: ViewterfyProps): number {
    const { fps, scenes, showIntro, showOutro, sceneScrollSecondsById } = p
    let f = 0
    if (showIntro) {
        f += msToFrames(previewIntroMsByMode(p.introMode), fps)
        if (scenes.length > 0) f += msToFrames(PREVIEW_INTRO_HANDOFF_MS, fps)
    }
    scenes.forEach((scene, i) => {
        f += Math.round((sceneScrollSecondsById[scene.id] ?? DEFAULT_SCENE_SEC) * fps)
        if (i < scenes.length - 1) f += msToFrames(previewBetweenScenesMs(), fps)
    })
    if (showOutro) {
        if (scenes.length > 0) f += msToFrames(PREVIEW_OUTRO_ENTRY_DELAY_MS, fps)
        f += msToFrames(PREVIEW_OUTRO_MS, fps)
    }
    f += msToFrames(PREVIEW_END_FADE_MS, fps)
    return Math.max(1, f)
}
