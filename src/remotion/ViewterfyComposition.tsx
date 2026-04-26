import type { FC } from 'react'
import { AUDIO_EDGE_FADE_SEC, getEdgeFadeGain } from '../audio/fade'
import type { ViewterfyProps } from './viewterfyProps'
import {
    msToFrames,
    PREVIEW_END_FADE_MS,
    PREVIEW_HOLD_MS_BEFORE_SCENE_SWITCH,
    PREVIEW_INTRO_HOOK_END_HOLD_MS,
    PREVIEW_INTRO_HOOK_MS,
    PREVIEW_INTRO_HANDOFF_MS,
    PREVIEW_INTRO_LOGO_SHORT_MS,
    PREVIEW_OUTRO_ENTRY_DELAY_MS,
    PREVIEW_OUTRO_MS,
    previewIntroMsByMode,
    previewBetweenScenesMs,
} from './previewTimeline'
import {
    AbsoluteFill,
    Audio,
    Easing,
    Img,
    interpolate,
    Series,
    staticFile,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion'
import { getBackgroundStyle } from './lib/backgroundStyle'
import {
    effectiveMockupScale,
    sceneHeadingFontPx,
    sceneSubtitleFontPx,
    sceneVerticalContentOffsetY,
} from './layoutTypography'
import type { Scene } from '../store/useStore'

const ease = Easing.bezier(0.22, 1, 0.36, 1)

/** Uniform zoom for all Remotion visuals (intro, scenes, bridges, outro, end fade). Preview unchanged. */
const REMOTION_CONTENT_ZOOM = 1.50
/** Extra whole-frame zoom for 9:16 exports. */
const REMOTION_VERTICAL_CONTENT_ZOOM = 1.9
/** Whole-frame nudge down (px) for 9:16 only — centers stacked content after vertical zoom. */
const REMOTION_VERTICAL_FRAME_OFFSET_Y = 32
/** Bring 9:16 scene zoom closer to square framing without affecting square. */
const REMOTION_VERTICAL_PHONE_SCALE_MULTIPLIER = 1.45
/** Extra zoom applied only to intro content block. */
const INTRO_CONTENT_ZOOM = 1.28
/** Extra zoom applied only to outro content block. */
const OUTRO_CONTENT_ZOOM = 1.18

const frameColors = {
    black: {
        border: '#17191d',
        frameBg: 'linear-gradient(160deg, #3c434b 0%, #1f2329 18%, #0d0f12 52%, #262b31 100%)',
        highlight: 'rgba(255,255,255,0.12)',
        edge: 'rgba(90,98,110,0.38)',
        shadow: 'rgba(0,0,0,0.58)',
    },
    silver: {
        border: '#b9c0c8',
        frameBg: 'linear-gradient(160deg, #f2f4f6 0%, #cfd5db 22%, #9ea6af 55%, #e4e8ec 100%)',
        highlight: 'rgba(255,255,255,0.72)',
        edge: 'rgba(118,128,140,0.28)',
        shadow: 'rgba(60,72,88,0.28)',
    },
    gold: {
        border: '#b99663',
        frameBg: 'linear-gradient(160deg, #f2dfbe 0%, #d8bc8c 22%, #aa814e 58%, #ead5b2 100%)',
        highlight: 'rgba(255,248,220,0.42)',
        edge: 'rgba(126,92,48,0.24)',
        shadow: 'rgba(86,62,28,0.28)',
    },
    blue: {
        border: '#43566b',
        frameBg: 'linear-gradient(160deg, #8395a9 0%, #5f7185 20%, #314050 56%, #74879c 100%)',
        highlight: 'rgba(220,232,244,0.24)',
        edge: 'rgba(52,66,84,0.28)',
        shadow: 'rgba(18,28,41,0.34)',
    },
} as const

/** Outer phone chrome (matches `PhoneMockup`). */
const PHONE_OUTER_W = 300
const PHONE_OUTER_H = 600
const PHONE_BORDER_PX = 8
/** Inner viewport for screenshots — `w-full` inside 8px border on 300px wide device. */
const PHONE_INNER_W = PHONE_OUTER_W - 2 * PHONE_BORDER_PX

function pxPerSecFromScrollSpeed(scrollSpeed: number): number {
    return Math.max(10, scrollSpeed * 5)
}

/**
 * Max scroll distance: prefer browser-measured `sceneMaxScrollPxById` (content − viewport).
 * If measurement is missing, calculate from screenshot count assuming each fills the viewport.
 * This ensures all scenes scroll fully, matching preview exactly.
 */
const PHONE_INNER_H = 584

function effectiveMaxScrollPx(scene: Scene, p: ViewterfyProps): number {
    if (scene.screenshots.length === 0) return 0

    const raw = p.sceneMaxScrollPxById?.[scene.id]
    const measured = typeof raw === 'number' && !Number.isNaN(raw) ? raw : NaN

    if (Number.isFinite(measured) && measured > 0) {
        return measured
    }

    const screenshotBased = (scene.screenshots.length - 1) * PHONE_INNER_H
    if (screenshotBased > 0) {
        return screenshotBased
    }

    const totalSec = p.sceneScrollSecondsById[scene.id] ?? 3
    const scrollOnlySec = Math.max(0, totalSec - 1)
    if (scrollOnlySec < 1e-9) return 0

    const pxPerSec = pxPerSecFromScrollSpeed(scene.scrollSpeed)
    return Math.max(0, scrollOnlySec * pxPerSec)
}

/** Matches PhoneMockup: calculate scroll frames from scroll distance and scroll speed. */
function scrollGeometry(scene: Scene, p: ViewterfyProps, fps: number): { scrollFrames: number; maxScroll: number } {
    const maxScroll = effectiveMaxScrollPx(scene, p)
    if (maxScroll <= 0) {
        return { scrollFrames: 0, maxScroll: 0 }
    }
    const pxPerSec = pxPerSecFromScrollSpeed(scene.scrollSpeed)
    const scrollOnlySec = maxScroll / pxPerSec
    const scrollFrames = Math.max(1, Math.round(scrollOnlySec * fps))
    return { scrollFrames, maxScroll }
}

/** Layout `motion.div` intro exit: opacity 0, scale 1.02, blur 8px over 0.7s, ease [0.22,1,0.36,1]. */
function introExitStyle(t: number): { opacity: number; scale: number; blur: number } {
    const opacity = interpolate(t, [0, 1], [1, 0], { easing: ease, extrapolateRight: 'clamp' })
    const scale = interpolate(t, [0, 1], [1, 1.02], { easing: ease, extrapolateRight: 'clamp' })
    const blur = interpolate(t, [0, 1], [0, 8], { extrapolateRight: 'clamp' })
    return { opacity, scale, blur }
}

function IntroInner({ p, exitProgress, settled }: { p: ViewterfyProps; exitProgress?: number; settled?: boolean }) {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()
    const isVertical = p.aspectRatio === '9:16'
    const isMd = p.viewportWidth >= 768

    const hookText = (p.introHookText ?? '').trim().length > 0 ? p.introHookText.trim() : 'Transform your daily habits in 30 seconds.'
    const hookThenLogo = p.introMode === 'text-then-logo'
    const hookPhaseFrames = Math.max(1, msToFrames(PREVIEW_INTRO_HOOK_MS, fps))
    const hookEndHoldFrames = Math.max(1, msToFrames(PREVIEW_INTRO_HOOK_END_HOLD_MS, fps))
    const hookTotalFrames = hookPhaseFrames + hookEndHoldFrames
    const hookBlendFrames = Math.max(1, msToFrames(350, fps))
    /** End state used when intro is held/frozen during handoff. */
    const introSettleFrame = hookThenLogo
        ? Math.max(0, hookTotalFrames + Math.round(msToFrames(PREVIEW_INTRO_LOGO_SHORT_MS, fps) * 0.85))
        : Math.max(0, msToFrames(previewIntroMsByMode(p.introMode), fps) - 1)
    const animFrame = settled ? introSettleFrame : frame
    const logoAnimFrame = hookThenLogo ? Math.max(0, animFrame - hookTotalFrames) : animFrame

    const mainOpacity = interpolate(logoAnimFrame, [0, fps * 0.8], [0, 1], { easing: ease, extrapolateRight: 'clamp' })
    const mainScale = interpolate(logoAnimFrame, [0, fps * 1.1], [0.92, 1], { easing: ease, extrapolateRight: 'clamp' })
    const mainY = interpolate(logoAnimFrame, [0, fps * 1.0], [30, 0], { easing: ease, extrapolateRight: 'clamp' })

    const logoOpacity = interpolate(logoAnimFrame, [fps * 0.3, fps * 1.0], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const logoBlur = interpolate(logoAnimFrame, [fps * 0.3, fps * 0.85], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const logoScale = interpolate(logoAnimFrame, [fps * 0.3, fps * 1.0], [0.8, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

    const titleOpacity = interpolate(logoAnimFrame, [fps * 0.6, fps * 1.4], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const titleY = interpolate(logoAnimFrame, [fps * 0.6, fps * 1.4], [30, 0], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const titleBlur = interpolate(logoAnimFrame, [fps * 0.6, fps * 1.2], [8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

    const subOpacity = interpolate(logoAnimFrame, [fps * 0.9, fps * 1.7], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const subY = interpolate(logoAnimFrame, [fps * 0.9, fps * 1.7], [20, 0], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const subBlur = interpolate(logoAnimFrame, [fps * 0.9, fps * 1.5], [4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

    const logoBox = isVertical ? 148 : isMd ? 144 : 112
    const titleSize = isVertical ? 36 : isMd ? 48 : 36
    const subSize = isVertical ? 14 : isMd ? 18 : 16
    const hookTypingFrame = hookThenLogo ? Math.min(animFrame, hookTotalFrames) : animFrame
    const hookTypedChars = Math.max(1, Math.round(interpolate(hookTypingFrame, [0, Math.round(fps * 1.8)], [0, hookText.length], { extrapolateRight: 'clamp', easing: ease })))
    const hookVisible = hookText.slice(0, hookTypedChars)
    const hookShowCursor = hookTypedChars < hookText.length
    const hookOpacity = interpolate(animFrame, [0, fps * 0.8], [0, 1], { easing: ease, extrapolateRight: 'clamp' })
    const hookFadeOut = hookThenLogo
        ? interpolate(animFrame, [Math.max(0, hookTotalFrames - hookBlendFrames), hookTotalFrames], [1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: ease,
          })
        : 1

    if (p.introMode === 'text-hook' || (hookThenLogo && animFrame < hookTotalFrames)) {
        if (typeof exitProgress === 'number') {
            const ex = introExitStyle(exitProgress)
            return (
                <AbsoluteFill style={{ ...getBackgroundStyle(p.introBackground), overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.38) 100%)', pointerEvents: 'none' }} />
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            minWidth: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: isVertical ? 44 : 56,
                            textAlign: 'center',
                            opacity: ex.opacity,
                            transform: `scale(${ex.scale * INTRO_CONTENT_ZOOM})`,
                            filter: `blur(${ex.blur}px)`,
                        }}
                    >
                        <p
                            style={{
                                fontSize: isVertical ? 36 : isMd ? 42 : 34,
                                lineHeight: isVertical ? 1.26 : 1.22,
                                fontWeight: 800,
                                letterSpacing: '-0.02em',
                                maxWidth: isVertical ? '56%' : '62%',
                                width: isVertical ? '56%' : undefined,
                                minWidth: 0,
                                boxSizing: 'border-box',
                                overflowWrap: 'break-word',
                                wordBreak: 'break-word',
                                paddingLeft: isVertical ? 12 : 18,
                                paddingRight: isVertical ? 12 : 18,
                                margin: 0,
                                color: '#fff',
                                textShadow: '0 10px 30px rgba(0,0,0,0.45)',
                            }}
                        >
                            {hookText}
                        </p>
                    </div>
                </AbsoluteFill>
            )
        }

        return (
            <AbsoluteFill style={{ ...getBackgroundStyle(p.introBackground), overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.38) 100%)', pointerEvents: 'none' }} />
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: isVertical ? 44 : 56,
                        textAlign: 'center',
                        opacity: hookOpacity * hookFadeOut,
                        transform: `translateY(${mainY}px) scale(${mainScale * INTRO_CONTENT_ZOOM})`,
                    }}
                >
                    <p
                        style={{
                            fontSize: isVertical ? 36 : isMd ? 42 : 34,
                            lineHeight: isVertical ? 1.26 : 1.22,
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            maxWidth: isVertical ? '56%' : '62%',
                            width: isVertical ? '56%' : undefined,
                            minWidth: 0,
                            boxSizing: 'border-box',
                            overflowWrap: 'break-word',
                            wordBreak: 'break-word',
                            paddingLeft: isVertical ? 12 : 18,
                            paddingRight: isVertical ? 12 : 18,
                            margin: 0,
                            color: '#fff',
                            textShadow: '0 10px 30px rgba(0,0,0,0.45)',
                        }}
                    >
                        {hookVisible}
                        {hookShowCursor ? <span style={{ opacity: 0.85, marginLeft: 6 }}>|</span> : null}
                    </p>
                </div>
            </AbsoluteFill>
        )
    }

    if (typeof exitProgress === 'number') {
        const ex = introExitStyle(exitProgress)
        return (
            <AbsoluteFill style={{ ...getBackgroundStyle(p.introBackground), overflow: 'hidden' }}>
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 32,
                        textAlign: 'center',
                        opacity: ex.opacity,
                        transform: `scale(${ex.scale * INTRO_CONTENT_ZOOM})`,
                        filter: `blur(${ex.blur}px)`,
                        gap: isVertical ? 20 : 24,
                    }}
                >
                    <div style={{ opacity: 1, transform: 'scale(1)' }}>
                        <div
                            style={{
                                width: logoBox,
                                height: logoBox,
                                borderRadius: 32,
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                margin: '0 auto',
                                boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
                            }}
                        >
                            {p.introLogo ? (
                                <Img src={p.introLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span
                                    style={{
                                        fontSize: 36,
                                        fontWeight: 800,
                                        background: 'linear-gradient(to bottom right, #fff, rgba(255,255,255,0.5))',
                                        WebkitBackgroundClip: 'text',
                                        color: 'transparent',
                                    }}
                                >
                                    {p.introTitle.charAt(0)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ maxWidth: 448, marginTop: 4 }}>
                        <h1
                            style={{
                                fontSize: titleSize,
                                fontWeight: 800,
                                margin: 0,
                                lineHeight: 1.15,
                                paddingLeft: isVertical ? 20 : 0,
                                paddingRight: isVertical ? 20 : 0,
                                background: 'linear-gradient(to bottom, #fff, rgba(255,255,255,0.7))',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent',
                            }}
                        >
                            {p.introTitle}
                        </h1>
                        <p
                            style={{
                                fontSize: subSize,
                                color: 'rgba(255,255,255,0.8)',
                                marginTop: 8,
                                fontWeight: 600,
                                paddingLeft: isVertical ? 32 : 0,
                                paddingRight: isVertical ? 32 : 0,
                            }}
                        >
                            {p.introSubtitle}
                        </p>
                    </div>
                </div>
            </AbsoluteFill>
        )
    }

    return (
        <AbsoluteFill style={{ ...getBackgroundStyle(p.introBackground), overflow: 'hidden' }}>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
                    pointerEvents: 'none',
                }}
            />
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 32,
                    textAlign: 'center',
                    opacity: mainOpacity,
                    transform: `translateY(${mainY}px) scale(${mainScale * INTRO_CONTENT_ZOOM})`,
                    gap: isVertical ? 20 : 24,
                }}
            >
                <div
                    style={{
                        opacity: logoOpacity,
                        transform: `scale(${logoScale})`,
                        filter: `blur(${logoBlur}px)`,
                    }}
                >
                    <div
                        style={{
                            width: logoBox,
                            height: logoBox,
                            borderRadius: 32,
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            margin: '0 auto',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
                        }}
                    >
                        {p.introLogo ? (
                            <Img src={p.introLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span
                                style={{
                                    fontSize: 36,
                                    fontWeight: 800,
                                    background: 'linear-gradient(to bottom right, #fff, rgba(255,255,255,0.5))',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent',
                                }}
                            >
                                {p.introTitle.charAt(0)}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ maxWidth: 448, marginTop: 4 }}>
                    <h1
                        style={{
                            opacity: titleOpacity,
                            transform: `translateY(${titleY}px)`,
                            filter: `blur(${titleBlur}px)`,
                            fontSize: titleSize,
                            fontWeight: 800,
                            margin: 0,
                            lineHeight: 1.15,
                            paddingLeft: isVertical ? 20 : 0,
                            paddingRight: isVertical ? 20 : 0,
                            background: 'linear-gradient(to bottom, #fff, rgba(255,255,255,0.7))',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent',
                        }}
                    >
                        {p.introTitle}
                    </h1>
                    <p
                        style={{
                            opacity: subOpacity,
                            transform: `translateY(${subY}px)`,
                            filter: `blur(${subBlur}px)`,
                            fontSize: subSize,
                            color: 'rgba(255,255,255,0.8)',
                            marginTop: 8,
                            fontWeight: 600,
                            paddingLeft: isVertical ? 32 : 0,
                            paddingRight: isVertical ? 32 : 0,
                        }}
                    >
                        {p.introSubtitle}
                    </p>
                </div>
            </div>
        </AbsoluteFill>
    )
}

function OutroInner({ p, enterScrubT, resumeAfterTransition }: { p: ViewterfyProps; enterScrubT?: number; resumeAfterTransition?: boolean }) {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()
    const isVertical = p.aspectRatio === '9:16'
    const isSquare = p.aspectRatio === '1:1'
    const isMd = p.viewportWidth >= 768

    const f =
        typeof enterScrubT === 'number'
            ? Math.round(enterScrubT * fps * 2.5)
            : resumeAfterTransition
              ? Math.round(fps * 2.5)
              : frame

    const groupOpacity = interpolate(f, [0, fps * 0.6], [0, 1], { easing: ease, extrapolateRight: 'clamp' })
    const groupY = interpolate(f, [0, fps * 0.6], [20, 0], { easing: ease, extrapolateRight: 'clamp' })

    const h2Opacity = interpolate(f, [fps * 0.4, fps * 1.2], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const h2Y = interpolate(f, [fps * 0.4, fps * 1.2], [20, 0], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const h2Blur = interpolate(f, [fps * 0.4, fps * 1.0], [8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

    const pOpacity = interpolate(f, [fps * 0.6, fps * 1.4], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const pY = interpolate(f, [fps * 0.6, fps * 1.4], [15, 0], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const pBlur = interpolate(f, [fps * 0.6, fps * 1.2], [4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

    const qrOpacity = interpolate(f, [fps * 0.2, fps * 0.7], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const qrScale = interpolate(f, [fps * 0.2, fps * 0.7], [0.9, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

    const h2Size = isVertical ? 30 : isMd ? 36 : 30
    const pSize = isVertical ? 16 : 18
    const qr = isVertical ? 192 : isSquare ? 160 : isMd ? 224 : 192
    const badgeH = isSquare ? 40 : isMd ? 56 : 40

    return (
        <AbsoluteFill style={{ ...getBackgroundStyle(p.outroBackground), overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', pointerEvents: 'none' }} />
            <div
                style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 32,
                    textAlign: 'center',
                    opacity: groupOpacity,
                    transform: `translateY(${groupY}px) scale(${OUTRO_CONTENT_ZOOM})`,
                    maxWidth: 512,
                    margin: '0 auto',
                    gap: isVertical ? 24 : isSquare ? 24 : 32,
                }}
            >
                <div style={{ marginBottom: 4 }}>
                    <h2
                        style={{
                            opacity: h2Opacity,
                            transform: `translateY(${h2Y}px)`,
                            filter: `blur(${h2Blur}px)`,
                            fontSize: h2Size,
                            fontWeight: 800,
                            color: '#fff',
                            margin: 0,
                        }}
                    >
                        Download Now
                    </h2>
                    <p
                        style={{
                            opacity: pOpacity,
                            transform: `translateY(${pY}px)`,
                            filter: `blur(${pBlur}px)`,
                            fontSize: pSize,
                            color: 'rgba(255,255,255,0.8)',
                            marginTop: 8,
                            fontWeight: 600,
                        }}
                    >
                        Available on iOS and Android
                    </p>
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: isSquare ? 'row' : 'column',
                        alignItems: 'center',
                        gap: isVertical ? 16 : 24,
                        marginTop: isSquare ? 8 : 0,
                    }}
                >
                    <div
                        style={{
                            opacity: qrOpacity,
                            transform: `scale(${qrScale})`,
                            padding: 6,
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: 16,
                            border: '1px solid rgba(255,255,255,0.2)',
                        }}
                    >
                        <div
                            style={{
                                width: qr,
                                height: qr,
                                background: '#fff',
                                borderRadius: 12,
                                overflow: 'hidden',
                            }}
                        >
                            {p.outroQrCode ? (
                                <Img src={p.outroQrCode} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 10 }}>
                                    SCAN QR
                                </div>
                            )}
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: isVertical ? 8 : 12,
                            transform: undefined,
                            alignItems: 'center',
                        }}
                    >
                        <Img src={staticFile('images/IOS Icon.jpeg')} style={{ height: badgeH, borderRadius: 8 }} />
                        <Img src={staticFile('images/Android Icon.jpeg')} style={{ height: badgeH, borderRadius: 8 }} />
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    )
}

function clampScrollY(scrollY: number, maxScroll: number): number {
    if (maxScroll <= 0) return 0
    const lo = -maxScroll
    return Math.max(lo, Math.min(0, scrollY))
}

function PhoneScrollAtY({ scene, scrollY, maxScroll }: { scene: Scene; scrollY: number; maxScroll: number }) {
    const fc = frameColors[scene.phoneColor]
    const y = clampScrollY(scrollY, maxScroll)

    return (
        <div style={{ width: PHONE_OUTER_W, height: PHONE_OUTER_H, position: 'relative' }}>
            <div
                style={{
                    width: PHONE_OUTER_W,
                    height: PHONE_OUTER_H,
                    borderRadius: 48,
                    border: `8px solid ${fc.border}`,
                    background: fc.frameBg,
                    boxShadow: `inset 0 0 0 1px ${fc.highlight}, inset 0 0 0 2px ${fc.edge}, 0 20px 50px -10px ${fc.shadow}`,
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        top: 8,
                        height: 28,
                        width: 100,
                        borderRadius: 20,
                        background: '#000',
                        zIndex: 30,
                    }}
                />
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        background: '#1f2937',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    {scene.screenshots.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
                            No screenshots
                        </div>
                    ) : (
                        <div style={{ width: '100%', transform: `translateY(${y}px)` }}>
                            {scene.screenshots.map((src, i) => (
                                <Img
                                    key={i}
                                    src={src}
                                    style={{
                                        width: '100%',
                                        maxWidth: PHONE_INNER_W,
                                        height: 'auto',
                                        display: 'block',
                                        objectFit: 'cover',
                                        objectPosition: 'center top',
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top right, rgba(255,255,255,0.05), transparent)',
                        pointerEvents: 'none',
                        zIndex: 40,
                        borderRadius: 40,
                    }}
                />
            </div>
        </div>
    )
}

function sceneEnterInterpolations(effFrame: number, fps: number) {
    const enterEnd = Math.max(1, Math.round(0.7 * fps))
    const blockOpacity = interpolate(effFrame, [0, enterEnd], [0, 1], { easing: ease, extrapolateRight: 'clamp' })
    const blockScale = interpolate(effFrame, [0, enterEnd], [0.95, 1], { easing: ease, extrapolateRight: 'clamp' })
    const blockBlur = interpolate(effFrame, [0, Math.round(0.5 * fps)], [4, 0], { extrapolateRight: 'clamp' })
    const headStart = Math.round(0.5 * fps)
    const headDur = Math.round(0.8 * fps)
    const headOpacity = interpolate(effFrame, [headStart, headStart + headDur], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const headY = interpolate(effFrame, [headStart, headStart + headDur], [20, 0], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const headBlur = interpolate(effFrame, [headStart, headStart + headDur], [8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const subStart = Math.round(0.7 * fps)
    const subDur = Math.round(0.8 * fps)
    const subOpacity = interpolate(effFrame, [subStart, subStart + subDur], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const subY = interpolate(effFrame, [subStart, subStart + subDur], [15, 0], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const subBlur = interpolate(effFrame, [subStart, subStart + subDur], [4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    return {
        enterEnd,
        blockOpacity,
        blockScale,
        blockBlur,
        headOpacity,
        headY,
        headBlur,
        subOpacity,
        subY,
        subBlur,
    }
}

type SceneInnerMode = 'live' | 'frozenEnd' | 'enterScrub' | 'exiting'

function SceneInner({
    scene,
    p,
    mode = 'live',
    scrubT = 0,
    exitT = 0,
    resumeAfterTransition = false,
}: {
    scene: Scene
    p: ViewterfyProps
    mode?: SceneInnerMode
    scrubT?: number
    exitT?: number
    /** After intro/between crossfade, skip replaying enter so scroll is visible from frame 0. */
    resumeAfterTransition?: boolean
}) {
    const frame = useCurrentFrame()
    const { fps, width: stageW } = useVideoConfig()
    const hasText = scene.headline.trim().length > 0 || scene.subtitle.trim().length > 0
    const isVertical = p.aspectRatio === '9:16'
    const isMd = p.viewportWidth >= 768

    const headingPx = sceneHeadingFontPx(p.viewportWidth, p.aspectRatio, scene.headlineScale)
    const subtitlePx = sceneSubtitleFontPx(p.viewportWidth, p.aspectRatio, scene.subtitleScale)
    const nudgeY = sceneVerticalContentOffsetY(p.viewportWidth, hasText, p.aspectRatio)

    const enterEnd = Math.max(1, Math.round(0.7 * fps))
    const settleFrame = enterEnd + Math.round(0.8 * fps) + Math.round(0.8 * fps) + 2

    let effFrame: number
    if (mode === 'frozenEnd' || mode === 'exiting') {
        effFrame = settleFrame
    } else if (mode === 'enterScrub') {
        const t = Math.min(1, Math.max(0, scrubT))
        effFrame = Math.round(interpolate(t, [0, 1], [0, settleFrame]))
    } else {
        effFrame = frame
    }

    const enterAnimFrame = mode === 'live' && resumeAfterTransition ? settleFrame : effFrame
    const s = sceneEnterInterpolations(enterAnimFrame, fps)

    const exitOpacity = mode === 'exiting' ? interpolate(exitT, [0, 1], [1, 0], { easing: ease, extrapolateRight: 'clamp' }) : 1
    const exitScale = mode === 'exiting' ? interpolate(exitT, [0, 1], [1, 0.98], { easing: ease, extrapolateRight: 'clamp' }) : 1
    const exitBlur = mode === 'exiting' ? interpolate(exitT, [0, 1], [0, 4], { extrapolateRight: 'clamp' }) : 0

    const { scrollFrames, maxScroll } = scrollGeometry(scene, p, fps)
    let scrollY = 0
    if (mode === 'frozenEnd' || mode === 'exiting') {
        scrollY = maxScroll > 0 ? -maxScroll : 0
    } else if (mode === 'enterScrub') {
        scrollY = 0
    } else if (scrollFrames > 0) {
        const endFrame = Math.max(0, scrollFrames - 1)
        if (endFrame === 0) {
            scrollY = -maxScroll
        } else {
            scrollY = interpolate(frame, [0, endFrame], [0, -maxScroll], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.linear,
            })
        }
    }

    const blurPx = Math.max(s.blockBlur, exitBlur)

    const flexDir: 'row' | 'column' =
        isVertical ? 'column' : isMd ? 'row' : 'column'
    const padH = isVertical ? (isMd ? 16 : 12) : isMd ? 48 : 16
    const padV = isVertical ? 32 : isMd ? 32 : 12
    const gap = isVertical ? (hasText ? (isMd ? 16 : 12) : 0) : isMd ? 24 : 16
    const verticalStackLift = isVertical ? (isMd ? -38 : -29) : 0

    const textMaxW = isVertical ? (isMd ? 0.56 * stageW : 0.58 * stageW) : 290
    const headingFontSize = isVertical ? headingPx * 1.16 : headingPx
    const subtitleFontSize = isVertical ? subtitlePx * 1.24 : subtitlePx
    const phoneScale =
        effectiveMockupScale(p.aspectRatio, hasText, scene.mockupScale) *
        (isVertical ? REMOTION_VERTICAL_PHONE_SCALE_MULTIPLIER : 1)

    const textOrder = isVertical ? 2 : isMd ? 1 : 2
    const phoneOrder = isVertical ? 1 : isMd ? 2 : 1

    return (
        <AbsoluteFill style={{ ...getBackgroundStyle(scene), overflow: 'hidden' }}>
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: flexDir,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingLeft: padH,
                    paddingRight: padH,
                    paddingTop: padV,
                    paddingBottom: padV,
                    gap,
                    opacity: s.blockOpacity * exitOpacity,
                    transform: `translateY(${nudgeY + verticalStackLift}px) scale(${s.blockScale * exitScale})`,
                    filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
                }}
            >
                {hasText ? (
                    <div
                        style={{
                            order: textOrder,
                            textAlign: isVertical ? 'center' : isMd ? 'left' : 'center',
                            maxWidth: textMaxW,
                            zIndex: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: isVertical ? 'center' : isMd ? 'flex-start' : 'center',
                            width: isVertical ? '86%' : isMd ? 290 : '100%',
                            ...(isVertical
                                ? {
                                      // Nudge headline/subtitle slightly lower under the mockup (9:16 Remotion only).
                                      marginTop: isMd ? 38 : 31,
                                      paddingLeft: 18,
                                      paddingRight: 18,
                                  }
                                : null),
                        }}
                    >
                        {scene.headline ? (
                            <h1
                                style={{
                                    opacity: s.headOpacity,
                                    transform: `translateY(${s.headY}px)`,
                                    filter: `blur(${s.headBlur}px)`,
                                    fontSize: headingFontSize,
                                    fontWeight: 800,
                                    color: '#fff',
                                    margin: 0,
                                    lineHeight: 1.15,
                                    letterSpacing: '-0.02em',
                                    textShadow: '0 2px 20px rgba(0,0,0,0.35)',
                                }}
                            >
                                {scene.headline}
                            </h1>
                        ) : null}
                        {scene.subtitle ? (
                            <p
                                style={{
                                    opacity: s.subOpacity,
                                    transform: `translateY(${s.subY}px)`,
                                    filter: `blur(${s.subBlur}px)`,
                                    fontSize: subtitleFontSize,
                                    color: 'rgba(255,255,255,0.8)',
                                    marginTop: 10,
                                    fontWeight: 600,
                                    paddingLeft: isVertical ? 34 : 0,
                                    paddingRight: isVertical ? 34 : 0,
                                    textShadow: '0 1px 12px rgba(0,0,0,0.3)',
                                }}
                            >
                                {scene.subtitle}
                            </p>
                        ) : null}
                    </div>
                ) : null}
                <div
                    style={{
                        order: phoneOrder,
                        flex: isVertical ? '0 0 auto' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `scale(${phoneScale})`,
                        transformOrigin: 'center center',
                    }}
                >
                    <PhoneScrollAtY scene={scene} scrollY={scrollY} maxScroll={maxScroll} />
                </div>
            </div>
        </AbsoluteFill>
    )
}

function IntroFirstSceneHandoff({ p }: { p: ViewterfyProps }) {
    const f = useCurrentFrame()
    const { fps } = useVideoConfig()
    const handoffFrames = msToFrames(PREVIEW_INTRO_HANDOFF_MS, fps)
    const hold = msToFrames(PREVIEW_HOLD_MS_BEFORE_SCENE_SWITCH, fps)
    const transLen = Math.max(1, handoffFrames - hold)
    const scene = p.scenes[0]

    if (f < hold) {
        return (
            <AbsoluteFill style={{ background: '#000' }}>
                <IntroInner p={p} settled />
            </AbsoluteFill>
        )
    }
    const rel = f - hold
    const fadeEnd = Math.max(0, transLen - 1)
    const t = fadeEnd <= 0 ? 1 : interpolate(rel, [0, fadeEnd], [0, 1], { extrapolateRight: 'clamp', easing: ease })
    const introOut = {
        opacity: interpolate(t, [0, 1], [1, 0], { extrapolateRight: 'clamp' }),
        scale: interpolate(t, [0, 1], [1, 1.02], { extrapolateRight: 'clamp' }),
        blur: interpolate(t, [0, 1], [0, 8], { extrapolateRight: 'clamp' }),
    }
    const sceneIn = {
        opacity: interpolate(t, [0, 0.2, 1], [0, 0.35, 1], { extrapolateRight: 'clamp' }),
        scale: interpolate(t, [0, 1], [0.97, 1], { extrapolateRight: 'clamp' }),
        y: interpolate(t, [0, 1], [14, 0], { extrapolateRight: 'clamp' }),
        blur: interpolate(t, [0, 1], [10, 0], { extrapolateRight: 'clamp' }),
    }
    return (
        <AbsoluteFill style={{ background: '#000' }}>
            <AbsoluteFill
                style={{
                    opacity: sceneIn.opacity,
                    zIndex: 1,
                    transform: `translateY(${sceneIn.y}px) scale(${sceneIn.scale})`,
                    filter: `blur(${sceneIn.blur}px)`,
                }}
            >
                <SceneInner scene={scene} p={p} mode="enterScrub" scrubT={1} />
            </AbsoluteFill>
            <AbsoluteFill
                style={{
                    opacity: introOut.opacity,
                    zIndex: 2,
                    pointerEvents: 'none',
                    transform: `scale(${introOut.scale})`,
                    filter: `blur(${introOut.blur}px)`,
                }}
            >
                <IntroInner p={p} settled />
            </AbsoluteFill>
        </AbsoluteFill>
    )
}

function BetweenScenesBridge({ prev, next, p }: { prev: Scene; next: Scene; p: ViewterfyProps }) {
    const f = useCurrentFrame()
    const { fps } = useVideoConfig()
    const total = msToFrames(previewBetweenScenesMs(), fps)
    const hold = msToFrames(PREVIEW_HOLD_MS_BEFORE_SCENE_SWITCH, fps)
    const transLen = Math.max(1, total - hold)

    if (f < hold) {
        return (
            <AbsoluteFill style={{ background: '#000' }}>
                <SceneInner scene={prev} p={p} mode="frozenEnd" />
            </AbsoluteFill>
        )
    }
    const rel = f - hold
    const fadeEnd = Math.max(0, transLen - 1)
    const t = fadeEnd <= 0 ? 1 : interpolate(rel, [0, fadeEnd], [0, 1], { extrapolateRight: 'clamp', easing: ease })
    const prevOut = {
        opacity: interpolate(t, [0, 1], [1, 0], { extrapolateRight: 'clamp' }),
        scale: interpolate(t, [0, 1], [1, 1.018], { extrapolateRight: 'clamp' }),
        y: interpolate(t, [0, 1], [0, -8], { extrapolateRight: 'clamp' }),
        blur: interpolate(t, [0, 1], [0, 7], { extrapolateRight: 'clamp' }),
    }
    const nextIn = {
        opacity: interpolate(t, [0, 0.18, 1], [0, 0.3, 1], { extrapolateRight: 'clamp' }),
        scale: interpolate(t, [0, 1], [0.982, 1], { extrapolateRight: 'clamp' }),
        y: interpolate(t, [0, 1], [10, 0], { extrapolateRight: 'clamp' }),
        blur: interpolate(t, [0, 1], [8, 0], { extrapolateRight: 'clamp' }),
    }
    return (
        <AbsoluteFill style={{ background: '#000' }}>
            <AbsoluteFill
                style={{
                    opacity: prevOut.opacity,
                    transform: `translateY(${prevOut.y}px) scale(${prevOut.scale})`,
                    filter: `blur(${prevOut.blur}px)`,
                }}
            >
                <SceneInner scene={prev} p={p} mode="frozenEnd" />
            </AbsoluteFill>
            <AbsoluteFill
                style={{
                    opacity: nextIn.opacity,
                    transform: `translateY(${nextIn.y}px) scale(${nextIn.scale})`,
                    filter: `blur(${nextIn.blur}px)`,
                }}
            >
                <SceneInner scene={next} p={p} mode="enterScrub" scrubT={1} />
            </AbsoluteFill>
        </AbsoluteFill>
    )
}

function OutroEntryBridge({ p, lastScene }: { p: ViewterfyProps; lastScene: Scene }) {
    const f = useCurrentFrame()
    const { fps } = useVideoConfig()
    const total = Math.max(1, msToFrames(PREVIEW_OUTRO_ENTRY_DELAY_MS, fps))
    const fadeEnd = Math.max(0, total - 1)
    const t = fadeEnd <= 0 ? 1 : interpolate(f, [0, fadeEnd], [0, 1], { extrapolateRight: 'clamp', easing: ease })
    const sceneOut = {
        opacity: interpolate(t, [0, 1], [1, 0], { extrapolateRight: 'clamp' }),
        scale: interpolate(t, [0, 1], [1, 1.02], { extrapolateRight: 'clamp' }),
        y: interpolate(t, [0, 1], [0, -10], { extrapolateRight: 'clamp' }),
        blur: interpolate(t, [0, 1], [0, 8], { extrapolateRight: 'clamp' }),
    }
    const outroIn = {
        opacity: interpolate(t, [0, 0.22, 1], [0, 0.32, 1], { extrapolateRight: 'clamp' }),
        scale: interpolate(t, [0, 1], [0.975, 1], { extrapolateRight: 'clamp' }),
        y: interpolate(t, [0, 1], [12, 0], { extrapolateRight: 'clamp' }),
        blur: interpolate(t, [0, 1], [10, 0], { extrapolateRight: 'clamp' }),
    }
    return (
        <AbsoluteFill style={{ background: '#000' }}>
            <AbsoluteFill
                style={{
                    opacity: sceneOut.opacity,
                    transform: `translateY(${sceneOut.y}px) scale(${sceneOut.scale})`,
                    filter: `blur(${sceneOut.blur}px)`,
                }}
            >
                <SceneInner scene={lastScene} p={p} mode="frozenEnd" />
            </AbsoluteFill>
            <AbsoluteFill
                style={{
                    opacity: outroIn.opacity,
                    transform: `translateY(${outroIn.y}px) scale(${outroIn.scale})`,
                    filter: `blur(${outroIn.blur}px)`,
                }}
            >
                <OutroInner p={p} enterScrubT={1} />
            </AbsoluteFill>
        </AbsoluteFill>
    )
}

function EndFade() {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()
    const dur = Math.max(1, msToFrames(PREVIEW_END_FADE_MS, fps) - 1)
    const opacity = interpolate(frame, [0, dur], [0, 1], { easing: ease, extrapolateRight: 'clamp' })
    return <AbsoluteFill style={{ background: '#000', opacity }} />
}

function TimelineAudio({ p }: { p: ViewterfyProps }) {
    const frame = useCurrentFrame()
    const { fps, durationInFrames } = useVideoConfig()
    if (!p.audioDataUrl) return null
    const trimBefore = Math.round((p.audioTrimStartSec ?? 0) * fps)
    const currentSec = frame / fps
    const totalSec = durationInFrames / fps
    const fadeGain = getEdgeFadeGain(currentSec, totalSec, AUDIO_EDGE_FADE_SEC)
    return <Audio src={p.audioDataUrl} trimBefore={trimBefore} volume={(p.audioVolume ?? 0.5) * fadeGain} />
}

export const ViewterfyComposition: FC<ViewterfyProps> = (p) => {
    const { fps } = useVideoConfig()
    const introF = msToFrames(previewIntroMsByMode(p.introMode), fps)
    const handoffF = msToFrames(PREVIEW_INTRO_HANDOFF_MS, fps)
    const betweenF = msToFrames(previewBetweenScenesMs(), fps)
    const outroEntryF = msToFrames(PREVIEW_OUTRO_ENTRY_DELAY_MS, fps)
    const outroF = msToFrames(PREVIEW_OUTRO_MS, fps)
    const endFadeF = msToFrames(PREVIEW_END_FADE_MS, fps)
    const contentZoom = p.aspectRatio === '9:16' ? REMOTION_VERTICAL_CONTENT_ZOOM : REMOTION_CONTENT_ZOOM

    const sceneBlocks = p.scenes.flatMap((scene, i) => {
        const { scrollFrames } = scrollGeometry(scene, p, fps)
        const dur = scrollFrames + Math.round(1 * fps)
        const seq = (
            <Series.Sequence key={scene.id} durationInFrames={dur}>
                <SceneInner scene={scene} p={p} resumeAfterTransition />
            </Series.Sequence>
        )
        if (i < p.scenes.length - 1) {
            const next = p.scenes[i + 1]
            return [
                seq,
                <Series.Sequence key={`between-${scene.id}`} durationInFrames={betweenF}>
                    <BetweenScenesBridge prev={scene} next={next} p={p} />
                </Series.Sequence>,
            ]
        }
        return [seq]
    })

    const lastScene = p.scenes[p.scenes.length - 1]

    const verticalFrameOffsetY = p.aspectRatio === '9:16' ? REMOTION_VERTICAL_FRAME_OFFSET_Y : 0

    return (
        <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
            <AbsoluteFill
                style={
                    verticalFrameOffsetY !== 0
                        ? { transform: `translateY(${verticalFrameOffsetY}px)` }
                        : undefined
                }
            >
                <AbsoluteFill
                    style={{
                        transform: `scale(${contentZoom})`,
                        transformOrigin: 'center center',
                    }}
                >
                    <Series>
                        {p.showIntro ? (
                            <Series.Sequence durationInFrames={introF}>
                                <IntroInner p={p} />
                            </Series.Sequence>
                        ) : null}
                        {p.showIntro && p.scenes.length > 0 ? (
                            <Series.Sequence durationInFrames={handoffF}>
                                <IntroFirstSceneHandoff p={p} />
                            </Series.Sequence>
                        ) : null}
                        {sceneBlocks}
                        {p.showOutro && p.scenes.length > 0 ? (
                            <Series.Sequence durationInFrames={outroEntryF}>
                                <OutroEntryBridge p={p} lastScene={lastScene} />
                            </Series.Sequence>
                        ) : null}
                        {p.showOutro ? (
                            <Series.Sequence durationInFrames={outroF}>
                                <OutroInner p={p} resumeAfterTransition={p.scenes.length > 0} />
                            </Series.Sequence>
                        ) : null}
                        <Series.Sequence durationInFrames={endFadeF}>
                            <EndFade />
                        </Series.Sequence>
                    </Series>
                </AbsoluteFill>
            </AbsoluteFill>
            <TimelineAudio p={p} />
        </AbsoluteFill>
    )
}
