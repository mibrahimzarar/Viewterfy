export const AUDIO_EDGE_FADE_SEC = 0.6

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value))
}

/**
 * Gain ramp for subtle start/end fades within a selected audio segment.
 */
export function getEdgeFadeGain(positionSec: number, segmentDurationSec: number, fadeSec = AUDIO_EDGE_FADE_SEC): number {
    if (!Number.isFinite(positionSec) || !Number.isFinite(segmentDurationSec) || segmentDurationSec <= 0) {
        return 1
    }

    const edgeFade = Math.max(0, Math.min(fadeSec, segmentDurationSec / 2))
    if (edgeFade <= 0) return 1

    const fromStart = clamp01(positionSec / edgeFade)
    const fromEnd = clamp01((segmentDurationSec - positionSec) / edgeFade)
    return Math.min(fromStart, fromEnd)
}
