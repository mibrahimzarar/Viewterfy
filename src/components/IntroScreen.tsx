import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'

export const IntroScreen = () => {
    const { introLogo, introTitle, introSubtitle, aspectRatio } = useStore()

    const isVertical = aspectRatio === '9:16'

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
