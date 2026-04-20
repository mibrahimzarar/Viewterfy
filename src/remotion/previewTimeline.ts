/**
 * Durations that drive full-cycle preview in `ControlPanel.tsx` and Remotion — keep in sync.
 * Adjusted for proper transitions matching preview.
 */
export const PREVIEW_INTRO_MS = 3000
export const PREVIEW_OUTRO_MS = 4000
/** Gap after intro before first scene scroll (setTimeout in ControlPanel). */
export const PREVIEW_INTRO_TO_FIRST_PLAY_DELAY_MS = 500
/**
 * Intro to first scene transition total time (includes hold + crossfade).
 */
export const PREVIEW_INTRO_HANDOFF_MS = 1500
export const PREVIEW_HOLD_MS_BEFORE_SCENE_SWITCH = 500
export const PREVIEW_MS_AFTER_SWITCH_TO_RESET = 500
export const PREVIEW_MS_AFTER_RESET_TO_PLAY = 150
/** Last scene → OUTRO: pause before outro crossfade (aligned with editor pacing). */
export const PREVIEW_OUTRO_ENTRY_DELAY_MS = 1200
export const PREVIEW_END_FADE_MS = 1000

export function previewBetweenScenesMs(): number {
    return (
        PREVIEW_HOLD_MS_BEFORE_SCENE_SWITCH +
        PREVIEW_MS_AFTER_SWITCH_TO_RESET +
        PREVIEW_MS_AFTER_RESET_TO_PLAY
    )
}

/** From scene switch until `setIsPlaying(true)` — scroll starts here in the editor. */
export function previewScrollDelayAfterSceneSwitchMs(): number {
    return PREVIEW_MS_AFTER_SWITCH_TO_RESET + PREVIEW_MS_AFTER_RESET_TO_PLAY
}

export function msToFrames(ms: number, fps: number): number {
    return Math.max(0, Math.round((ms / 1000) * fps))
}
