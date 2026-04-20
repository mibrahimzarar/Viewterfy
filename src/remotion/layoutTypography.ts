/**
 * Mirrors `Layout.tsx` heading/subtitle `calc(clamp(..., Nvw, ...) * scale)` using the **browser
 * viewport** width (vw is % of full window, not stage width) — same as CSS in the preview.
 */
export function sceneHeadingFontPx(viewportWidth: number, aspectRatio: '1:1' | '9:16', headlineScale: number): number {
    const vw = viewportWidth / 100
    if (aspectRatio === '1:1') {
        const v = Math.min(Math.max(16, 3 * vw), 32)
        return v * headlineScale
    }
    const v = Math.min(Math.max(16, 2.4 * vw), 24)
    return v * headlineScale
}

export function sceneSubtitleFontPx(viewportWidth: number, aspectRatio: '1:1' | '9:16', subtitleScale: number): number {
    const vw = viewportWidth / 100
    if (aspectRatio === '1:1') {
        const v = Math.min(Math.max(10.4, 1.8 * vw), 16)
        return v * subtitleScale
    }
    const v = Math.min(Math.max(11.2, 1.5 * vw), 14.4)
    return v * subtitleScale
}

export function effectiveMockupScale(
    aspectRatio: '1:1' | '9:16',
    hasText: boolean,
    mockupScale: number,
): number {
    const base = aspectRatio === '1:1' ? (hasText ? 0.7 : 0.85) : 0.55
    return base * mockupScale
}

/** 9:16 scene block vertical nudge: `-translate-y-12` / `md:-translate-y-16` from Layout. */
export function sceneVerticalContentOffsetY(_viewportWidth: number, hasText: boolean, aspectRatio: '1:1' | '9:16'): number {
    if (aspectRatio !== '9:16' || !hasText) return 0
    // Keep 9:16 centered when global Remotion zoom is high.
    return 0
}
