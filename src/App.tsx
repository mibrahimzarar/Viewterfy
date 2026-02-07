import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Layout } from './components/Layout'
import { FeatureGraphicEditor } from './components/FeatureGraphic'
import { ModeSwitcher, type AppMode } from './components/ModeSwitcher'

function App() {
  const [mode, setMode] = useState<AppMode>('video')

  return (
    <>
      <ModeSwitcher mode={mode} onModeChange={setMode} />
      <AnimatePresence mode="wait">
        {mode === 'video' ? (
          <motion.div
            key="video"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Layout />
          </motion.div>
        ) : (
          <motion.div
            key="graphic"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <FeatureGraphicEditor />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App
