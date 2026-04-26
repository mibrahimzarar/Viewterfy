import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import {
    PREVIEW_INTRO_HOOK_END_HOLD_MS,
    PREVIEW_INTRO_HOOK_MS,
    PREVIEW_INTRO_LOGO_SHORT_MS,
} from '../remotion/previewTimeline'

export const IntroScreen = () => {
    const { introMode, introLogo, introHookText, introTitle, introSubtitle, aspectRatio } = useStore()

    const isVertical = aspectRatio === '9:16'
    const [typedChars, setTypedChars] = useState(0)
    const [elapsedMs, setElapsedMs] = useState(0)
    const hookText = useMemo(
        () => (introHookText.trim().length > 0 ? introHookText.trim() : 'Transform your daily habits in 30 seconds.'),
        [introHookText],
    )
    const hookThenLogo = introMode === 'text-then-logo'
    const HOOK_PHASE_MS = PREVIEW_INTRO_HOOK_MS
    const HOOK_END_HOLD_MS = PREVIEW_INTRO_HOOK_END_HOLD_MS
    const TOTAL_THEN_LOGO_MS = HOOK_PHASE_MS + HOOK_END_HOLD_MS + PREVIEW_INTRO_LOGO_SHORT_MS

    useEffect(() => {
        if (introMode !== 'text-hook' && introMode !== 'text-then-logo') return
        setTypedChars(0)
        const totalChars = hookText.length
        const typingWindow = introMode === 'text-then-logo' ? Math.round(HOOK_PHASE_MS * 1.2) : 2300
        const tickMs = Math.max(18, Math.round(typingWindow / Math.max(1, totalChars)))
        const id = window.setInterval(() => {
            setTypedChars((prev) => {
                if (prev >= totalChars) {
                    window.clearInterval(id)
                    return prev
                }
                return prev + 1
            })
        }, tickMs)
        return () => window.clearInterval(id)
    }, [introMode, hookText])

    useEffect(() => {
        if (!hookThenLogo) return
        setElapsedMs(0)
        const start = performance.now()
        const id = window.setInterval(() => {
            const ms = performance.now() - start
            setElapsedMs(ms)
            if (ms >= TOTAL_THEN_LOGO_MS) {
                window.clearInterval(id)
            }
        }, 33)
        return () => window.clearInterval(id)
    }, [hookThenLogo, hookText])

    if (introMode === 'text-hook' || (hookThenLogo && elapsedMs < HOOK_PHASE_MS + HOOK_END_HOLD_MS)) {
        const visible = hookText.slice(0, typedChars)
        const showCursor = typedChars < hookText.length
        return (
            <div className="w-full h-full min-w-0 flex items-center justify-center p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.38)_100%)] pointer-events-none" />
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className={`${isVertical ? 'max-w-[78%]' : 'max-w-[70%]'} z-10 w-full min-w-0`}
                >
                    <p className={`${isVertical ? 'text-[2rem] leading-[1.28]' : 'text-4xl md:text-5xl leading-[1.22]'} font-bold tracking-tight text-white break-words drop-shadow-[0_6px_26px_rgba(0,0,0,0.45)]`}>
                        {visible}
                        {showCursor ? <span className="inline-block animate-pulse text-white/85 ml-1">|</span> : null}
                    </p>
                </motion.div>
            </div>
        )
    }

    return (
        <div
            className="w-full h-full flex flex-col items-center justify-center p-8 text-center relative overflow-hidden"
        >
            {/* Animated Particles/Glow (Optional - borrowing from Layout ambient feel) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                    duration: 1,
                    ease: [0.22, 1, 0.36, 1],
                    opacity: { duration: 0.8 },
                    scale: { duration: 1.1, ease: [0.22, 1, 0.36, 1] }
                }}
                className={`z-10 flex flex-col items-center overflow-visible ${isVertical ? 'gap-5 justify-center h-full py-4' : 'gap-6 py-2'}`}
            >
                {/* Logo Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{
                        delay: 0.3,
                        duration: 1,
                        ease: [0.22, 1, 0.36, 1]
                    }}
                    className="relative group"
                >
                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-1000" />
                    <div className={`rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center overflow-hidden ring-1 ring-white/10 ${isVertical ? 'w-32 h-32' : 'w-28 h-28 md:w-36 md:h-36'}`}>
                        {introLogo ? (
                            <img src={introLogo} alt="App Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-4xl font-bold bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
                                {introTitle.charAt(0)}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Text Content */}
                <div className="space-y-2 max-w-md overflow-visible">
                    <motion.h1
                        initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{
                            delay: 0.6,
                            duration: 0.8,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className={`${isVertical ? 'text-3xl mt-1 px-5 leading-[1.15]' : 'text-4xl md:text-5xl leading-[1.12]'} font-bold tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent drop-shadow-sm`}
                    >
                        {introTitle}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{
                            delay: 0.9,
                            duration: 0.8,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className={`${isVertical ? 'text-xs px-8' : 'text-base md:text-lg'} text-white/80 font-medium drop-shadow-md`}
                    >
                        {introSubtitle}
                    </motion.p>
                </div>
            </motion.div>
        </div>
    )
}
