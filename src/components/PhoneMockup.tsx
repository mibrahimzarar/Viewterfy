import { motion, useAnimation, useMotionValue } from 'framer-motion'
import { clsx } from 'clsx'
import { useStore, type Scene } from '../store/useStore'
import { useEffect, useRef, useState } from 'react'

const frameColors = {
    black: {
        border: '#17191d',
        frameBg: 'linear-gradient(160deg, #3c434b 0%, #1f2329 18%, #0d0f12 52%, #262b31 100%)',
        highlight: 'rgba(255,255,255,0.12)',
        edge: 'rgba(90,98,110,0.38)',
        shadow: 'rgba(0,0,0,0.58)',
        glow: 'rgba(70,80,95,0.22)',
    },
    silver: {
        border: '#b9c0c8',
        frameBg: 'linear-gradient(160deg, #f2f4f6 0%, #cfd5db 22%, #9ea6af 55%, #e4e8ec 100%)',
        highlight: 'rgba(255,255,255,0.72)',
        edge: 'rgba(118,128,140,0.28)',
        shadow: 'rgba(60,72,88,0.28)',
        glow: 'rgba(210,218,228,0.24)',
    },
    gold: {
        border: '#b99663',
        frameBg: 'linear-gradient(160deg, #f2dfbe 0%, #d8bc8c 22%, #aa814e 58%, #ead5b2 100%)',
        highlight: 'rgba(255,248,220,0.42)',
        edge: 'rgba(126,92,48,0.24)',
        shadow: 'rgba(86,62,28,0.28)',
        glow: 'rgba(201,166,110,0.22)',
    },
    blue: {
        border: '#43566b',
        frameBg: 'linear-gradient(160deg, #8395a9 0%, #5f7185 20%, #314050 56%, #74879c 100%)',
        highlight: 'rgba(220,232,244,0.24)',
        edge: 'rgba(52,66,84,0.28)',
        shadow: 'rgba(18,28,41,0.34)',
        glow: 'rgba(92,116,145,0.22)',
    },
} as const

interface PhoneMockupProps {
    scene: Scene
    sceneId: string
}

export const PhoneMockup = ({ scene, sceneId }: PhoneMockupProps) => {
    const { isPlaying, aspectRatio, isExporting, setAnimationFinished, resetScrollSignal } = useStore()
    const { screenshots, phoneColor, scrollSpeed } = scene
    const frame = frameColors[phoneColor]
    const containerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const [maxScroll, setMaxScroll] = useState(0)
    const exportCompletionTimeoutRef = useRef<number | null>(null)

    const clearExportCompletionTimeout = () => {
        if (exportCompletionTimeoutRef.current !== null) {
            window.clearTimeout(exportCompletionTimeoutRef.current)
            exportCompletionTimeoutRef.current = null
        }
    }

    // Measure scroll distance
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current && contentRef.current) {
                const containerHeight = containerRef.current.offsetHeight
                const contentHeight = contentRef.current.offsetHeight
                // Only scroll if content is taller than container
                setMaxScroll(Math.max(0, contentHeight - containerHeight))
            }
        }

        // Wait for images to load ideally, but a timeout helps for now
        const timer = setTimeout(updateHeight, 100)

        // Also observe resizes
        const observer = new ResizeObserver(updateHeight)
        if (contentRef.current) observer.observe(contentRef.current)

        return () => {
            clearTimeout(timer)
            observer.disconnect()
        }
    }, [screenshots, aspectRatio]) // Recalculate if aspect ratio changes (layout changes)

    const controls = useAnimation()
    const y = useMotionValue(0)

    // Recalculate duration when scroll parameters change (even if not playing)
    useEffect(() => {
        if (maxScroll <= 0) return

        const pxPerSec = Math.max(10, scrollSpeed * 5)
        const duration = pxPerSec > 0 ? maxScroll / pxPerSec : 0

        // Total Sequence = Intro (3s) + Scroll (duration) + Outro (4s)
        // We'll just store the Scroll duration here, or the total?
        // Let's store TOTAL to make it easy for AudioPanel.
        // We need to know if Intro/Outro are enabled.
        const state = useStore.getState()
        const totalDuration = (state.showIntro ? 3 : 0) + duration + 1 + (state.showOutro ? 4 : 0) // +1 for buffers

        if (Math.abs(totalDuration - state.videoDuration) > 0.1) {
            state.setVideoDuration(totalDuration)
        }
    }, [maxScroll, scrollSpeed, sceneId, useStore.getState().showIntro, useStore.getState().showOutro])

    // Handle Play/Pause and Auto-Scroll
    useEffect(() => {
        clearExportCompletionTimeout()

        if (maxScroll <= 0) {
            if (isPlaying && isExporting) {
                // If a scene has no measurable scroll, still advance export after a short hold.
                exportCompletionTimeoutRef.current = window.setTimeout(() => {
                    setAnimationFinished(true)
                }, 1200)
            }
            return
        }

        if (isPlaying) {
            const currentY = y.get()
            const remainingDistance = Math.abs(-maxScroll - currentY)
            const pxPerSec = Math.max(10, scrollSpeed * 5)
            // Safety: avoid division by zero
            const duration = pxPerSec > 0 ? remainingDistance / pxPerSec : 0

            controls.start({
                y: -maxScroll,
                transition: {
                    duration: duration,
                    ease: "linear"
                }
            }).then(() => {
                // Animation completed
                if (isExporting) {
                    exportCompletionTimeoutRef.current = window.setTimeout(() => {
                        setAnimationFinished(true)
                    }, 1000)
                }
                // else if (isPlaying) {
                //     setIsPlaying(false) // Optionally auto-pause at end
                // }
            })
        } else {
            controls.stop()
        }
        return () => {
            controls.stop()
            clearExportCompletionTimeout()
        }
    }, [isPlaying, maxScroll, scrollSpeed, controls, y, isExporting, setAnimationFinished, sceneId])

    // Reset when content changes or explicit reset signal
    useEffect(() => {
        controls.stop()
        clearExportCompletionTimeout()
        y.set(0)
    }, [screenshots, aspectRatio, y, resetScrollSignal, controls, sceneId])

    useEffect(() => () => clearExportCompletionTimeout(), [])

    return (
        <div className="relative group">
            {/* Phone Frame */}
            <div
                className="relative rounded-[3rem] border-[8px] overflow-hidden z-20 transition-all duration-500"
                style={{
                    width: 300,
                    height: 600,
                    borderColor: frame.border,
                    background: frame.frameBg,
                    boxShadow: `
                inset 0 0 0 1px ${frame.highlight},
                inset 0 0 0 2px ${frame.edge},
                0 20px 50px -10px ${frame.shadow}
            `,
                }}
            >
                {/* iPhone 15-style Dynamic Island */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 bg-black z-30 flex justify-center items-center"
                    style={{
                        top: 8,
                        height: 28,
                        width: 100,
                        borderRadius: 20,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        className="bg-black/50 rounded-full"
                        style={{
                            width: 72,
                            height: 16,
                        }}
                    />
                </div>

                {/* Screen Content */}
                <div ref={containerRef} className="w-full h-full bg-gray-800 relative flex flex-col overflow-hidden">
                    {screenshots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/20 p-8 text-center space-y-4">
                            <div className="w-12 h-12 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center">
                                +
                            </div>
                            <p className="text-sm">Upload Screenshots</p>
                        </div>
                    ) : (
                        <motion.div
                            ref={contentRef}
                            className="w-full"
                            style={{ y }}
                            animate={controls}
                        >
                            {screenshots.map((src, i) => (
                                <img
                                    key={i}
                                    src={src}
                                    alt={`Screen ${i}`}
                                    className="w-full h-auto object-cover block"
                                />
                            ))}
                        </motion.div>
                    )}
                </div>

                {/* Screen Glass Reflection (Overlay) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-40 rounded-[2.5rem]" />
            </div>

            {/* Ambient Glow behind phone */}
            <div
                className={clsx(
                    "absolute inset-0 blur-3xl opacity-40 -z-10 transition-colors duration-1000",
                )}
                style={{ background: frame.glow }}
            />
        </div>
    )
}
