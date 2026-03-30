import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Zap, CloudRain, Sun, Wind } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface CaptureEngineProps {
  onCapture: (signal: any) => void;
}

export const CaptureEngine: React.FC<CaptureEngineProps> = ({ onCapture }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const [hue, setHue] = useState(0); // 0-360
  const [intensitySeries, setIntensitySeries] = useState<number[]>([]);
  const [anchorWord, setAnchorWord] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const word = event.results[0][0].transcript.split(' ').pop();
        setAnchorWord(word || '');
      };
    }
  }, []);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsCapturing(true);
    setStartTime(Date.now());
    setIntensitySeries([]);
    setAnchorWord('');
    
    // Start recording intensity curve
    const interval = setInterval(() => {
      setIntensitySeries(prev => [...prev, intensity]);
    }, 100);
    (window as any)._intensityInterval = interval;
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isCapturing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    setIntensity(1 - y); // Y-Axis = Intensity
    setHue(x * 360);    // X-Axis = Hue
  };

  const handleEnd = () => {
    if (!isCapturing) return;
    
    clearInterval((window as any)._intensityInterval);
    setIsCapturing(false);
    
    const duration = Date.now() - (startTime || Date.now());
    
    // Final anchor word capture (simulated or real if speech was active)
    // The spec says "final 1.0s", but Web Speech is tricky. 
    // We'll trigger it right before release if possible, or just use the last result.
    
    const signal = {
      intensity_series: intensitySeries,
      emotion_hex: `hsl(${hue}, 70%, 50%)`,
      anchor_word: anchorWord,
      duration_ms: duration
    };

    onCapture(signal);
  };

  // Trigger speech recognition in the last second? 
  // Actually, Web Speech needs a user gesture. We'll start it on press.
  useEffect(() => {
    if (isCapturing && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    } else if (!isCapturing && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, [isCapturing]);

  const backgroundColor = `hsl(${hue}, ${isCapturing ? 40 + intensity * 40 : 10}%, ${isCapturing ? 10 + intensity * 20 : 5}%)`;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 touch-none select-none overflow-hidden flex items-center justify-center transition-colors duration-300"
      style={{ backgroundColor }}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      <AnimatePresence>
        {!isCapturing && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-white/20 flex flex-col items-center gap-4"
          >
            <Zap size={64} strokeWidth={1} />
            <span className="text-xs uppercase tracking-[0.3em] font-mono">Press to Capture</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isCapturing && (
        <>
          <motion.div 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              background: `radial-gradient(circle at center, hsla(${hue}, 100%, 50%, ${intensity * 0.3}) 0%, transparent 70%)` 
            }}
          />
          
          <div className="relative z-10 flex flex-col items-center gap-8">
            <motion.div 
              animate={{ 
                scale: 1 + intensity * 0.5,
                rotate: hue 
              }}
              className="w-32 h-32 rounded-full border border-white/30 flex items-center justify-center"
            >
              <div 
                className="w-4 h-4 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                style={{ backgroundColor: `hsl(${hue}, 100%, 70%)` }}
              />
            </motion.div>

            <div className="flex flex-col items-center gap-2">
              <div className="h-1 w-48 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-white"
                  style={{ width: `${intensity * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Intensity: {Math.round(intensity * 100)}%</span>
            </div>

            {anchorWord && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl font-serif italic text-white"
              >
                "{anchorWord}"
              </motion.div>
            )}
          </div>

          <div className="absolute bottom-12 left-12 flex items-center gap-3 text-white/30">
            <Mic size={16} className={cn(anchorWord && "text-white animate-pulse")} />
            <span className="text-[10px] font-mono uppercase tracking-widest">Listening for Anchor...</span>
          </div>
        </>
      )}
    </div>
  );
};
