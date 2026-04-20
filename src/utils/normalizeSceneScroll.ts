import type { Scene, AspectRatio } from '../store/useStore'

function pxPerSec(scrollSpeed: number): number {
    return Math.max(10, scrollSpeed * 5)
}

function estimateMaxScrollFromScreenshots(screenshotCount: number, phoneInnerHeight: number): number {
    if (screenshotCount <= 0) return 0
    const phoneContentHeight = phoneInnerHeight * screenshotCount
    const viewportHeight = phoneInnerHeight
    return Math.max(0, phoneContentHeight - viewportHeight)
}

/**
 * Aligns `sceneScrollSecondsById` and `sceneMaxScrollPxById` per scene so Remotion scrolls the
 * same distance the timeline allows — fixes stale low measurements on scenes 1–5 while the
 * active scene (often last) was re-measured in the editor.
 *
 * When measurements are missing/stale, estimates scroll distance from screenshot count
 * assuming each screenshot fills the phone viewport, ensuring all scenes scroll fully.
 */
export function normalizeSceneScrollForExport(
    scenes: Scene[],
    scrollSec: Record<string, number>,
    maxPx: Record<string, number>,
    aspectRatio: AspectRatio = '1:1',
): { sceneScrollSecondsById: Record<string, number>; sceneMaxScrollPxById: Record<string, number> } {
    const outSec: Record<string, number> = { ...scrollSec }
    const outMax: Record<string, number> = { ...maxPx }

    const phoneInnerHeight = aspectRatio === '9:16' ? 584 : 584

    for (const scene of scenes) {
        if (scene.screenshots.length === 0) continue

        const id = scene.id
        const v = pxPerSec(scene.scrollSpeed)
        const totalSec = outSec[id] ?? 3
        const scrollOnlySec = Math.max(0, totalSec - 1)
        const fromTiming = scrollOnlySec * v
        const raw = outMax[id]
        const m = typeof raw === 'number' && !Number.isNaN(raw) ? raw : NaN

        let distance: number
        if (Number.isFinite(m) && m > 0) {
            const slack = Math.max(12, fromTiming * 0.03)
            if (fromTiming > 0 && m > fromTiming + slack) {
                distance = fromTiming
            } else {
                distance = Math.max(m, fromTiming)
            }
        } else {
            const estimatedFromScreenshots = estimateMaxScrollFromScreenshots(scene.screenshots.length, phoneInnerHeight)
            if (estimatedFromScreenshots > 0) {
                distance = estimatedFromScreenshots
            } else {
                distance = Math.max(0, fromTiming)
            }
        }

        if (distance <= 0) continue

        const scrollOnly = distance / v
        outSec[id] = scrollOnly + 1
        outMax[id] = distance
    }

    return { sceneScrollSecondsById: outSec, sceneMaxScrollPxById: outMax }
}
