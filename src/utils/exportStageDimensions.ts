import type { AspectRatio } from '../store/useStore'

/** Same math as the former ControlPanel export stage — matches `#canvas-stage` with `lockedDimensions`. */
export function getExportStageDimensions(
    viewportWidth: number,
    viewportHeight: number,
    aspectRatio: AspectRatio,
): { width: number; height: number } {
    const padding = 0
    const maxWidth = Math.max(320, viewportWidth - padding * 2)
    const maxHeight = Math.max(320, viewportHeight - padding * 2)

    if (aspectRatio === '1:1') {
        const size = Math.floor(Math.min(maxWidth, maxHeight))
        return { width: size, height: size }
    }

    const ratio = 9 / 16
    let width = Math.floor(maxHeight * ratio)
    let height = Math.floor(maxHeight)

    if (width > maxWidth) {
        width = Math.floor(maxWidth)
        height = Math.floor(width / ratio)
    }

    return { width, height }
}
