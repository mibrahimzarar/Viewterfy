
import { useDropzone } from 'react-dropzone'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useStore, type PhoneColor } from '../store/useStore'
import { AudioPanel } from './AudioPanel'
import { clsx } from 'clsx'
import { Upload, X, Smartphone, Type, Settings, Download, RotateCcw, Palette, Play, Pause, Film, Sparkles, Image, Maximize2, Clapperboard, Square, FolderOpen, Save, Copy, Check } from 'lucide-react'
import { saveProject, loadProject } from '../utils/projectFile'
import { buildViewterfyRemotionProps, downloadJson } from '../utils/buildRemotionJob'
import {
    PREVIEW_END_FADE_MS,
    PREVIEW_HOLD_MS_BEFORE_SCENE_SWITCH,
    PREVIEW_INTRO_HANDOFF_MS,
    PREVIEW_INTRO_TO_FIRST_PLAY_DELAY_MS,
    PREVIEW_MS_AFTER_RESET_TO_PLAY,
    PREVIEW_MS_AFTER_SWITCH_TO_RESET,
    PREVIEW_OUTRO_ENTRY_DELAY_MS,
    PREVIEW_OUTRO_MS,
    previewIntroMsByMode,
    previewBetweenScenesMs,
} from '../remotion/previewTimeline'
import { GenericBackgroundPicker } from './GenericBackgroundPicker'

interface ControlPanelProps {
    onClose?: () => void
}

const DEFAULT_SCENE_SECONDS = 3

function formatFullCycleDuration(totalSeconds: number): string {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '—'
    const rounded = Math.round(totalSeconds)
    const m = Math.floor(rounded / 60)
    const s = rounded % 60
    if (m === 0) return `${s}s`
    return `${m}m ${s.toString().padStart(2, '0')}s`
}

function estimateFullCycleSeconds(
    scenes: { id: string }[],
    showIntro: boolean,
    introMode: 'logo' | 'text-hook' | 'text-then-logo',
    showOutro: boolean,
    sceneScrollSecondsById: Record<string, number>,
): number {
    let t = 0
    if (showIntro) {
        t += previewIntroMsByMode(introMode) / 1000
        if (scenes.length > 0) t += PREVIEW_INTRO_HANDOFF_MS / 1000
    }
    scenes.forEach((scene, i) => {
        t += sceneScrollSecondsById[scene.id] ?? DEFAULT_SCENE_SECONDS
        if (i < scenes.length - 1) t += previewBetweenScenesMs() / 1000
    })
    if (showOutro) {
        if (scenes.length > 0) t += PREVIEW_OUTRO_ENTRY_DELAY_MS / 1000
        t += PREVIEW_OUTRO_MS / 1000
    }
    t += PREVIEW_END_FADE_MS / 1000
    return t
}

export const ControlPanel = ({ onClose: _onClose }: ControlPanelProps) => {
    const {
        setPhoneColor,
        scenes, activeSceneId, addScene, removeScene, setActiveScene,
        addScreenshots, removeScreenshot, updateHeadline, updateSubtitle,
        setHeadlineScale, setSubtitleScale, setMockupScale,
        setScrollSpeed,
        aspectRatio, setAspectRatio,
        isPlaying, setIsPlaying,
        setBackgroundType, setBackgroundColor, setBackgroundGradient, setBackgroundPattern, setBackgroundImage,
        triggerReset,
        showIntro, setShowIntro, introMode, setIntroMode, introLogo, setIntroLogo, introHookText, setIntroHookText, introTitle, setIntroTitle, introSubtitle, setIntroSubtitle, introBackground,
        showOutro, setShowOutro, outroQrCode, setOutroQrCode, outroBackground
    } = useStore()

    const activeBackground = activeSceneId === 'INTRO'
        ? introBackground
        : activeSceneId === 'OUTRO'
            ? outroBackground
            : (scenes.find(s => s.id === activeSceneId) || scenes[0])

    const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0]
    const { screenshots, headline, subtitle, phoneColor, scrollSpeed, headlineScale, subtitleScale, mockupScale } = activeScene

    const [isBuildingRemotionJob, setIsBuildingRemotionJob] = useState(false)
    const [isSavingProject, setIsSavingProject] = useState(false)
    const [copiedRenderCommand, setCopiedRenderCommand] = useState(false)
    const previewResumeSceneIdRef = useRef<string | null>(null)
    const endTimeoutRef = useRef<number | null>(null)

    const clearEndTimeout = () => {
        if (endTimeoutRef.current !== null) {
            window.clearTimeout(endTimeoutRef.current)
            endTimeoutRef.current = null
        }
    }

    const handleDownloadRemotionJob = useCallback(async () => {
        setIsBuildingRemotionJob(true)
        try {
            const st = useStore.getState()
            const plain: Record<string, unknown> = {}
            for (const [k, v] of Object.entries(st)) {
                if (typeof v === 'function') continue
                plain[k] = v
            }
            const props = await buildViewterfyRemotionProps(plain)
            const jobFileName = aspectRatio === '1:1' ? 'square.json' : '9-16.json'
            downloadJson(jobFileName, props)
        } catch (err) {
            console.error(err)
            window.alert(
                'Could not build the Remotion job file. Run a full preview once so scroll timings are measured, then try again.',
            )
        } finally {
            setIsBuildingRemotionJob(false)
        }
    }, [aspectRatio])

    const renderPropsFile = aspectRatio === '1:1' ? 'square.json' : '9-16.json'
    const renderCommand = `npm run remotion:render -- --props=./Remotion/${renderPropsFile}`

    const handleCopyRenderCommand = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(renderCommand)
            setCopiedRenderCommand(true)
            window.setTimeout(() => setCopiedRenderCommand(false), 1400)
        } catch {
            window.alert('Could not copy command. Please copy it manually.')
        }
    }, [renderCommand])

    const { animationFinished, setAnimationFinished, isFullCyclePreview, setIsFullCyclePreview, sceneScrollSecondsById } = useStore()

    const estimatedFullCycleSeconds = useMemo(
        () => estimateFullCycleSeconds(scenes, showIntro, introMode, showOutro, sceneScrollSecondsById),
        [scenes, showIntro, introMode, showOutro, sceneScrollSecondsById],
    )

    const endFullPreviewAndRestore = useCallback(() => {
        clearEndTimeout()
        const resume = previewResumeSceneIdRef.current
        previewResumeSceneIdRef.current = null

        setIsFullCyclePreview(false)
        setAnimationFinished(false)
        setIsPlaying(false)

        const st = useStore.getState()
        st.setFadeEffect('none')

        if (!resume) return
        if (resume === 'INTRO' || resume === 'OUTRO') {
            setActiveScene(resume)
        } else if (st.scenes.some((s) => s.id === resume)) {
            setActiveScene(resume)
        } else {
            setActiveScene(st.scenes[0].id)
        }
        st.triggerReset()
    }, [setActiveScene, setAnimationFinished, setIsFullCyclePreview, setIsPlaying])

    const toggleFullCyclePreview = useCallback(() => {
        const st = useStore.getState()

        if (st.isFullCyclePreview) {
            endFullPreviewAndRestore()
            return
        }

        // START Preview
        clearEndTimeout()
        previewResumeSceneIdRef.current = st.activeSceneId
        setIsFullCyclePreview(true)
        setAnimationFinished(false)
        setIsPlaying(false)
        st.setFadeEffect('fadeIn')
        st.setActiveScene(st.showIntro ? 'INTRO' : st.scenes[0].id)
        st.triggerReset()

        // Small delay to allow fade-in to settle
        const t = window.setTimeout(() => setIsPlaying(true), 1000)
        endTimeoutRef.current = t
    }, [endFullPreviewAndRestore, setAnimationFinished, setIsFullCyclePreview, setIsPlaying])

    useEffect(() => {
        if (!isFullCyclePreview) return
        if (activeSceneId === 'INTRO') { const t = setTimeout(() => useStore.getState().setAnimationFinished(true), previewIntroMsByMode(useStore.getState().introMode)); return () => clearTimeout(t) }
        if (activeSceneId === 'OUTRO') { const t = setTimeout(() => useStore.getState().setAnimationFinished(true), PREVIEW_OUTRO_MS); return () => clearTimeout(t) }
    }, [isFullCyclePreview, activeSceneId])

    useEffect(() => {
        if (!isFullCyclePreview || !animationFinished) return

        if (activeSceneId === 'INTRO') {
            setAnimationFinished(false)
            setIsPlaying(false)
            setActiveScene(scenes[0].id)
            triggerReset()
            const t = window.setTimeout(() => setIsPlaying(true), PREVIEW_INTRO_TO_FIRST_PLAY_DELAY_MS)
            endTimeoutRef.current = t
            return
        }

        if (activeSceneId === 'OUTRO') {
            useStore.getState().setFadeEffect('fadeOut')
            clearEndTimeout()
            const t = window.setTimeout(() => { endFullPreviewAndRestore() }, 1000)
            endTimeoutRef.current = t
            return
        }

        const idx = scenes.findIndex(s => s.id === activeSceneId)
        if (idx !== -1 && idx < scenes.length - 1) {
            setAnimationFinished(false)
            setIsPlaying(false)
            const t = window.setTimeout(() => {
                setActiveScene(scenes[idx + 1].id)
                const t2 = window.setTimeout(() => {
                    triggerReset()
                    const t3 = window.setTimeout(() => setIsPlaying(true), PREVIEW_MS_AFTER_RESET_TO_PLAY)
                    endTimeoutRef.current = t3
                }, PREVIEW_MS_AFTER_SWITCH_TO_RESET)
                endTimeoutRef.current = t2
            }, PREVIEW_HOLD_MS_BEFORE_SCENE_SWITCH)
            endTimeoutRef.current = t
        } else {
            setAnimationFinished(false)
            setIsPlaying(false)
            if (showOutro) {
                const t = window.setTimeout(() => setActiveScene('OUTRO'), PREVIEW_OUTRO_ENTRY_DELAY_MS)
                endTimeoutRef.current = t
            } else {
                useStore.getState().setFadeEffect('fadeOut')
                clearEndTimeout()
                const t = window.setTimeout(() => { endFullPreviewAndRestore() }, 1000)
                endTimeoutRef.current = t
            }
        }
    }, [isFullCyclePreview, animationFinished, activeSceneId, scenes, showOutro, endFullPreviewAndRestore, setAnimationFinished, setIsPlaying, setActiveScene, triggerReset])

    useEffect(() => {
        return () => {
            clearEndTimeout()
        }
    }, [])

    const onDrop = useCallback((acceptedFiles: File[]) => addScreenshots(acceptedFiles.map(file => URL.createObjectURL(file))), [addScreenshots])
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } })

    const Colors: PhoneColor[] = ['black', 'silver', 'gold', 'blue']
    const deviceButtonStyles: Record<PhoneColor, { border: string, glow: string, activeBg: string }> = {
        black: {
            border: 'rgba(99, 115, 129, 0.42)',
            glow: '0 0 0 1px rgba(71,85,105,0.24), 0 10px 26px -14px rgba(2,6,23,0.72)',
            activeBg: 'linear-gradient(145deg, rgba(58, 65, 74, 0.96), rgba(24, 28, 34, 0.98) 58%, rgba(10, 12, 16, 0.99))',
        },
        silver: {
            border: 'rgba(191, 200, 210, 0.62)',
            glow: '0 0 0 1px rgba(226,232,240,0.26), 0 10px 26px -14px rgba(100,116,139,0.35)',
            activeBg: 'linear-gradient(145deg, rgba(236, 240, 243, 0.97), rgba(195, 202, 210, 0.95) 54%, rgba(149, 158, 167, 0.96))',
        },
        gold: {
            border: 'rgba(186, 154, 104, 0.56)',
            glow: '0 0 0 1px rgba(217, 188, 139, 0.24), 0 10px 26px -14px rgba(120, 89, 45, 0.38)',
            activeBg: 'linear-gradient(145deg, rgba(224, 201, 164, 0.97), rgba(194, 165, 117, 0.95) 56%, rgba(143, 112, 66, 0.96))',
        },
        blue: {
            border: 'rgba(92, 111, 133, 0.56)',
            glow: '0 0 0 1px rgba(125, 150, 176, 0.22), 0 10px 26px -14px rgba(15, 23, 42, 0.5)',
            activeBg: 'linear-gradient(145deg, rgba(111, 130, 154, 0.96), rgba(68, 84, 104, 0.97) 56%, rgba(32, 43, 58, 0.98))',
        },
    }

    // Toggle Component
    const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
        <button onClick={onChange} className={clsx("w-11 h-6 rounded-full relative transition-all duration-300", value ? "bg-primary shadow-[0_0_12px_rgba(59,130,246,0.5)]" : "bg-white/10")}>
            <div className={clsx("absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300", value ? "left-6" : "left-1")} />
        </button>
    )

    return (
        <div className="w-full h-full flex flex-col overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>



            <div className="flex flex-col gap-6 p-5">

                {/* === INTRO/OUTRO SETTINGS === */}
                <section className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2">
                        <Sparkles size={14} /> Intro & Outro
                    </h3>

                    {/* Intro */}
                    <div className="bg-white/[0.02] rounded-xl p-4 space-y-4 border border-white/5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Intro Screen</span>
                            <Toggle value={showIntro} onChange={() => setShowIntro(!showIntro)} />
                        </div>
                        {showIntro && (
                            <div className="space-y-3 pt-2 border-t border-white/5">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIntroMode('logo')}
                                        className={clsx(
                                            'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                                            introMode === 'logo'
                                                ? 'bg-white text-black shadow'
                                                : 'bg-white/5 text-white/65 hover:bg-white/10'
                                        )}
                                    >
                                        Logo Intro
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIntroMode('text-hook')}
                                        className={clsx(
                                            'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                                            introMode === 'text-hook'
                                                ? 'bg-white text-black shadow'
                                                : 'bg-white/5 text-white/65 hover:bg-white/10'
                                        )}
                                    >
                                        Text Hook
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIntroMode('text-then-logo')}
                                        className={clsx(
                                            'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                                            introMode === 'text-then-logo'
                                                ? 'bg-white text-black shadow'
                                                : 'bg-white/5 text-white/65 hover:bg-white/10'
                                        )}
                                    >
                                        Hook + Logo
                                    </button>
                                </div>
                                {introMode !== 'text-hook' ? (
                                    <div className="flex gap-3">
                                        <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {introLogo ? <img src={introLogo} className="w-full h-full object-cover" /> : <Upload size={16} className="text-white/20" />}
                                        </div>
                                        <div className="flex-1 flex items-center">
                                            <input type="file" accept="image/*" id="intro-logo" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setIntroLogo(URL.createObjectURL(e.target.files[0])) }} />
                                            <label htmlFor="intro-logo" className="text-xs bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg cursor-pointer transition-colors">Upload Logo</label>
                                        </div>
                                    </div>
                                ) : null}
                                {introMode !== 'logo' ? (
                                    <input
                                        value={introHookText}
                                        onChange={(e) => setIntroHookText(e.target.value)}
                                        placeholder="Hook text (typed on intro)"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/30 focus:border-primary focus:outline-none"
                                    />
                                ) : null}
                                {introMode !== 'text-hook' ? (
                                    <>
                                        <input value={introTitle} onChange={(e) => setIntroTitle(e.target.value)} placeholder="App Name" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/30 focus:border-primary focus:outline-none" />
                                        <input value={introSubtitle} onChange={(e) => setIntroSubtitle(e.target.value)} placeholder="Tagline" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/30 focus:border-primary focus:outline-none" />
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* Outro */}
                    <div className="bg-white/[0.02] rounded-xl p-4 space-y-4 border border-white/5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Outro Screen</span>
                            <Toggle value={showOutro} onChange={() => setShowOutro(!showOutro)} />
                        </div>
                        {showOutro && (
                            <div className="space-y-3 pt-2 border-t border-white/5">
                                <div className="flex gap-3">
                                    <div className="w-14 h-14 rounded-xl bg-white border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {outroQrCode ? <img src={outroQrCode} className="w-full h-full object-cover" /> : <Settings size={16} className="text-black/20" />}
                                    </div>
                                    <div className="flex-1 flex items-center">
                                        <input type="file" accept="image/*" id="outro-qr" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setOutroQrCode(URL.createObjectURL(e.target.files[0])) }} />
                                        <label htmlFor="outro-qr" className="text-xs bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg cursor-pointer transition-colors">Upload QR</label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* === TIMELINE / SCENES === */}
                <section className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2">
                            <Film size={14} /> Timeline
                        </h3>
                        <button type="button" onClick={addScene} disabled={isFullCyclePreview} className={clsx("text-[10px] font-medium text-primary transition", isFullCyclePreview ? "opacity-40 pointer-events-none" : "hover:text-primary/80")}>+ Add Scene</button>
                    </div>

                    <button
                        type="button"
                        onClick={toggleFullCyclePreview}
                        disabled={isBuildingRemotionJob}
                        className={clsx(
                            "group relative w-full overflow-hidden rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-300",
                            isBuildingRemotionJob && "cursor-not-allowed opacity-40",
                            isFullCyclePreview
                                ? "border-fuchsia-400/35 bg-fuchsia-500/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                                : "border-white/10 bg-white/[0.04] text-white/90 hover:border-white/18 hover:bg-white/[0.07]"
                        )}
                    >
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-600/0 via-violet-500/12 to-fuchsia-600/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        <span className="relative flex w-full items-center justify-between gap-3">
                            <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
                                {isFullCyclePreview ? (
                                    <>
                                        <Square size={15} className="shrink-0 text-fuchsia-200" />
                                        <span className="truncate">Stop preview</span>
                                    </>
                                ) : (
                                    <>
                                        <Clapperboard size={16} className="shrink-0 text-violet-200" />
                                        <Play size={14} className="shrink-0 opacity-90" />
                                        <span className="truncate">Preview full video</span>
                                    </>
                                )}
                            </span>
                            <span
                                className="shrink-0 text-[11px] font-semibold tabular-nums tracking-tight text-white/45"
                                title="Approximate full run: intro, all scenes, outro, and fades (visit each scene once for best accuracy)"
                            >
                                ~{formatFullCycleDuration(estimatedFullCycleSeconds)}
                            </span>
                        </span>
                    </button>

                    {/* Scene Pills */}
                    <div className={clsx("flex gap-2 overflow-x-auto pb-1", isFullCyclePreview && "pointer-events-none opacity-55")} style={{ scrollbarWidth: 'none' }}>
                        {showIntro && (
                            <button onClick={() => setActiveScene('INTRO')} className={clsx("flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all", activeSceneId === 'INTRO' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white")}>
                                ✨ Intro
                            </button>
                        )}
                        {scenes.map((scene, idx) => (
                            <button key={scene.id} onClick={() => setActiveScene(scene.id)} className={clsx("flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all group relative", activeSceneId === scene.id ? "bg-white text-black shadow-lg" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white")}>
                                Scene {idx + 1}
                                {scenes.length > 1 && (
                                    <span onClick={(e) => { e.stopPropagation(); removeScene(scene.id) }} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600">×</span>
                                )}
                            </button>
                        ))}
                        {showOutro && (
                            <button onClick={() => setActiveScene('OUTRO')} className={clsx("flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all", activeSceneId === 'OUTRO' ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white")}>
                                🎬 Outro
                            </button>
                        )}
                    </div>
                </section>

                {/* === SCENE CONTENT === */}
                {!['INTRO', 'OUTRO'].includes(activeSceneId) && (
                    <section className="space-y-5">

                        {/* Screenshots */}
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2 mb-3">
                                <Image size={14} /> Screenshots
                            </h3>
                            <div {...getRootProps()} className={clsx("border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all", isDragActive ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]")}>
                                <input {...getInputProps()} />
                                <Upload size={24} className="mx-auto mb-2 text-white/20" />
                                <p className="text-sm text-white/40">{isDragActive ? "Drop to upload" : "Drag & drop or click to upload"}</p>
                            </div>
                            {screenshots.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {screenshots.map((src, idx) => (
                                        <div key={idx} className="relative group aspect-[9/16] rounded-lg overflow-hidden ring-1 ring-white/10">
                                            <img src={src} className="w-full h-full object-cover" alt="" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button onClick={() => removeScreenshot(idx)} className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"><X size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Device */}
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2 mb-3">
                                <Smartphone size={14} /> Device
                            </h3>
                            <div className="flex gap-2">
                                {Colors.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setPhoneColor(color)}
                                        className={clsx(
                                            "flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all duration-300 border backdrop-blur-sm",
                                            phoneColor === color
                                                ? "text-slate-950 scale-[1.02]"
                                                : "text-white/75 bg-white/[0.03] hover:bg-white/[0.07] hover:text-white hover:-translate-y-[1px] border-white/10"
                                        )}
                                        style={phoneColor === color
                                            ? {
                                                background: deviceButtonStyles[color].activeBg,
                                                borderColor: deviceButtonStyles[color].border,
                                                boxShadow: deviceButtonStyles[color].glow,
                                            }
                                            : undefined
                                        }
                                    >
                                        {color}
                                    </button>
                                ))}
                            </div>
                            <div className="pt-3 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/50 flex items-center gap-1.5">
                                        <Maximize2 size={12} /> Mockup Size
                                    </span>
                                    <span className="text-white font-medium">{Math.round(mockupScale * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1.5"
                                    step="0.05"
                                    value={mockupScale}
                                    onChange={(e) => setMockupScale(Number(e.target.value))}
                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                        </div>

                        {/* Typography */}
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2 mb-3">
                                <Type size={14} /> Text
                            </h3>
                            <div className="space-y-3">
                                <input type="text" value={headline} onChange={(e) => updateHeadline(e.target.value)} placeholder="Headline" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-white/30 focus:border-primary focus:outline-none transition-colors" />
                                <input type="text" value={subtitle} onChange={(e) => updateSubtitle(e.target.value)} placeholder="Subtitle" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-white/30 focus:border-primary focus:outline-none transition-colors" />
                                <div className="space-y-2 pt-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-white/50">Heading Size</span>
                                        <span className="text-white font-medium">{Math.round(headlineScale * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.7"
                                        max="1.6"
                                        step="0.05"
                                        value={headlineScale}
                                        onChange={(e) => setHeadlineScale(Number(e.target.value))}
                                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-white/50">Subtitle Size</span>
                                        <span className="text-white font-medium">{Math.round(subtitleScale * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.7"
                                        max="1.6"
                                        step="0.05"
                                        value={subtitleScale}
                                        onChange={(e) => setSubtitleScale(Number(e.target.value))}
                                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Animation */}
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2 mb-3">
                                <Settings size={14} /> Animation
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-white/50">Scroll Speed</span>
                                        <span className="text-white font-medium">{scrollSpeed}%</span>
                                    </div>
                                    <input type="range" min="0" max="100" value={scrollSpeed} onChange={(e) => setScrollSpeed(Number(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { triggerReset(); setIsPlaying(false) }} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                                        <RotateCcw size={14} /> Reset
                                    </button>
                                    <button onClick={() => setIsPlaying(!isPlaying)} className={clsx("flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all", isPlaying ? "bg-white/10" : "bg-primary text-white shadow-lg shadow-primary/30")}>
                                        {isPlaying ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Preview</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Background */}
                <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2 mb-3">
                        <Palette size={14} /> Background
                    </h3>
                    <GenericBackgroundPicker
                        type={activeBackground.backgroundType}
                        color={activeBackground.backgroundColor}
                        gradient={activeBackground.backgroundGradient}
                        pattern={activeBackground.backgroundPattern}
                        image={activeBackground.backgroundImage}
                        onTypeChange={setBackgroundType}
                        onColorChange={setBackgroundColor}
                        onGradientChange={setBackgroundGradient}
                        onPatternChange={setBackgroundPattern}
                        onImageChange={setBackgroundImage}
                    />
                </section>

                {/* === AUDIO === */}
                <AudioPanel />

                {/* === PROJECT SAVE / LOAD === */}
                <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2">
                        <Save size={14} /> Project
                    </h3>
                    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5 space-y-3">
                        <p className="text-[11px] text-white/35 leading-relaxed">
                            Save your current work as a <span className="text-white/55 font-medium">.vtfy</span> project file and reopen it later — all scenes, text, images, and settings included.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={isSavingProject || isBuildingRemotionJob}
                                onClick={async () => {
                                    setIsSavingProject(true)
                                    try {
                                        await saveProject(useStore.getState() as unknown as Record<string, unknown>)
                                    } finally {
                                        setIsSavingProject(false)
                                    }
                                }}
                                className={clsx(
                                    'flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all',
                                    isSavingProject || isBuildingRemotionJob
                                        ? 'opacity-40 cursor-not-allowed bg-white/5 text-white/40'
                                        : 'bg-white/8 hover:bg-white/12 text-white border border-white/10 hover:border-white/20'
                                )}
                            >
                                {isSavingProject ? (
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save size={14} />
                                )}
                                {isSavingProject ? 'Saving…' : 'Save Project'}
                            </button>
                            <button
                                type="button"
                                disabled={isBuildingRemotionJob}
                                onClick={async () => {
                                    const restored = await loadProject()
                                    if (!restored) return
                                    // Merge only serializable state keys back into the store
                                    useStore.setState(restored as Partial<ReturnType<typeof useStore.getState>>)
                                }}
                                className={clsx(
                                    'flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all border',
                                    isBuildingRemotionJob
                                        ? 'opacity-40 cursor-not-allowed bg-white/5 text-white/40 border-white/5'
                                        : 'bg-white/8 hover:bg-white/12 text-white border-white/10 hover:border-white/20'
                                )}
                            >
                                <FolderOpen size={14} />
                                Open Project
                            </button>
                        </div>
                    </div>
                </section>

                {/* === EXPORT === */}
                <section className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2">
                        <Download size={14} /> Export
                    </h3>

                    <div className="flex gap-2">
                        <button onClick={() => setAspectRatio('1:1')} className={clsx("flex-1 py-3 rounded-lg text-sm font-medium transition-all", aspectRatio === '1:1' ? "bg-white text-black shadow-lg" : "bg-white/5 text-white/60 hover:bg-white/10")}>
                            1:1 Square
                        </button>
                        <button onClick={() => setAspectRatio('9:16')} className={clsx("flex-1 py-3 rounded-lg text-sm font-medium transition-all", aspectRatio === '9:16' ? "bg-white text-black shadow-lg" : "bg-white/5 text-white/60 hover:bg-white/10")}>
                            9:16 Vertical
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => void handleDownloadRemotionJob()}
                        disabled={isFullCyclePreview || isBuildingRemotionJob}
                        className={clsx(
                            "w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20",
                            isFullCyclePreview || isBuildingRemotionJob
                                ? "cursor-not-allowed opacity-45"
                                : "hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.98]"
                        )}
                    >
                        {isBuildingRemotionJob ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Building job...
                            </>
                        ) : (
                            <>
                                <Clapperboard size={18} /> Download Remotion job (JSON)
                            </>
                        )}
                    </button>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-[11px] text-white/50 leading-relaxed">
                        <div className="flex items-center justify-between gap-2">
                            <code className="block flex-1 rounded-lg bg-black/40 px-3 py-2 text-[10px] text-emerald-200/90 font-mono whitespace-pre-wrap break-all">
                                {renderCommand}
                            </code>
                            <button
                                type="button"
                                onClick={() => void handleCopyRenderCommand()}
                                className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                title="Copy render command"
                                aria-label="Copy render command"
                            >
                                {copiedRenderCommand ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                        <div className="pt-2 space-y-2 text-[11px] text-white/45 leading-relaxed">
                            <p className="text-white/70 font-medium text-xs">How to render your final video</p>
                            <ol className="list-decimal list-inside space-y-1.5">
                                <li>Select your ratio above (Square or 9:16).</li>
                                <li>Click <span className="text-white/70">Download Remotion job (JSON)</span> — it saves as <code className="text-white/60">{renderPropsFile}</code>.</li>
                                <li>Move the JSON file into the <code className="text-white/60">Remotion</code> folder in your project root.</li>
                                <li>Copy the command above (copy icon) and run it from the same folder as <code className="text-white/60">package.json</code>.</li>
                            </ol>
                            <p>
                                Your rendered video will be saved as <code className="text-white/60">out/viewterfy.mp4</code>. Rename or move it after each render if you want to keep multiple versions.
                            </p>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    )
}
