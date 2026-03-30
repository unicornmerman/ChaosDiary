import { useState, useEffect } from 'react';
import { CaptureEngine } from './components/CaptureEngine';
import { Studio } from './components/Studio';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, Zap } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'capture' | 'studio'>('capture');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Latency check: UI must be interactive within 150ms
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleCapture = async (signal: any) => {
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signal)
      });
      if (res.ok) {
        // Auto-commit successful, switch to studio to reflect
        setView('studio');
      }
    } catch (error) {
      console.error("Failed to save signal", error);
    }
  };

  if (!isReady) return <div className="bg-black h-screen w-screen" />;

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'capture' ? (
          <motion.div
            key="capture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full"
          >
            <CaptureEngine onCapture={handleCapture} />
            
            {/* View Toggle */}
            <button 
              onClick={() => setView('studio')}
              className="fixed top-8 right-8 z-50 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group"
            >
              <LayoutGrid size={20} className="text-white/40 group-hover:text-white" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full w-full"
          >
            <Studio onNewCapture={() => setView('capture')} />
            
            {/* View Toggle */}
            <button 
              onClick={() => setView('capture')}
              className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-3 bg-white text-black rounded-full font-bold shadow-2xl hover:scale-105 transition-transform"
            >
              <Zap size={18} />
              <span className="text-xs uppercase tracking-widest">Quick Capture</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
