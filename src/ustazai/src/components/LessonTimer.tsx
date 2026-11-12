import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, RotateCcw, Hourglass, Bell, BellOff } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/src/lib/utils';
import { translations, Language } from '../lib/translations';

interface LessonTimerProps {
  onBack: () => void;
  lang: Language;
}

export default function LessonTimer({ onBack, lang }: LessonTimerProps) {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const t = translations[lang].tools.lessontimer;
  const common = translations[lang].reflection;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
  }, []);

  const handleFinish = useCallback(() => {
    stopTimer();
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff4757', '#2ed573', '#1e90ff', '#ffa502']
    });

    if (!isMuted) {
      // Play a simple beep or sound if available
      // For now we just use the visual feedback
    }
  }, [stopTimer, isMuted]);

  const startTimer = () => {
    if (isActive) {
      stopTimer();
    } else {
      if (timeLeft <= 0) {
        const total = minutes * 60 + seconds;
        if (total <= 0) return;
        setTotalSeconds(total);
        setTimeLeft(total);
      }
      setIsActive(true);
    }
  };

  const resetTimer = () => {
    stopTimer();
    setTimeLeft(0);
    setTotalSeconds(0);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleFinish();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleFinish();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, handleFinish]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 100;
  const isWarning = timeLeft > 0 && timeLeft <= 10;

  return (
    <div className="fixed inset-0 bg-[#FDFCF8] overflow-y-auto font-sans select-none pb-20">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none fixed"
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Header */}
      <div className="relative z-20 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <button onClick={onBack} className="btn-secondary px-4 py-2 text-sm flex items-center gap-2">
          <X size={18} /> {common.back}
        </button>
        <div className="badge-modern bg-brand-primary text-white px-6 py-2">
          {t.title}
        </div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 bg-white border border-zinc-100 rounded-xl flex items-center justify-center text-brand-primary hover:bg-zinc-50 transition-all"
        >
          {isMuted ? <BellOff size={20} /> : <Bell size={20} />}
        </button>
      </div>

      <div className="relative z-20 max-w-5xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Settings Panel */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="lg:col-span-5 space-y-6"
        >
          <div className="card-modern p-8 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                <Hourglass size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">{lang === 'kz' ? 'Уақытты орнату' : lang === 'ru' ? 'Установка времени' : 'Set Time'}</h2>
                <p className="text-brand-muted font-medium text-sm">{lang === 'kz' ? 'Минут пен секундты таңдаңыз' : lang === 'ru' ? 'Выберите минуты и секунды' : 'Select minutes and seconds'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-brand-muted px-1">{lang === 'kz' ? 'Минут' : lang === 'ru' ? 'Минуты' : 'Minutes'}</label>
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={isActive}
                  className="w-full bg-brand-bg/30 border border-zinc-100 rounded-2xl p-4 text-center font-black text-3xl focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-brand-muted px-1">{lang === 'kz' ? 'Секунд' : lang === 'ru' ? 'Секунды' : 'Seconds'}</label>
                <input
                  type="number"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  disabled={isActive}
                  className="w-full bg-brand-bg/30 border border-zinc-100 rounded-2xl p-4 text-center font-black text-3xl focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 10, 15, 20, 30].map(m => (
                <button
                  key={m}
                  onClick={() => { setMinutes(m); setSeconds(0); }}
                  disabled={isActive}
                  className="px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold hover:bg-brand-primary hover:text-white transition-all disabled:opacity-50"
                >
                  {m} {lang === 'kz' ? 'мин' : lang === 'ru' ? 'мин' : 'min'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={startTimer}
                className={cn(
                  "btn-primary w-full py-4 text-xl",
                  isActive && "bg-orange-500 hover:bg-orange-600"
                )}
              >
                {isActive ? <Pause size={24} /> : <Play size={24} />}
                {isActive ? t.pause : timeLeft > 0 ? (lang === 'kz' ? 'Жалғастыру' : lang === 'ru' ? 'Продолжить' : 'Continue') : t.start}
              </button>
              <button
                onClick={resetTimer}
                className="btn-secondary w-full py-4 text-xl"
              >
                <RotateCcw size={24} /> {t.reset}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Visual Timer */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="lg:col-span-7 flex justify-center"
        >
          <div className="relative w-full max-w-[450px] aspect-square flex items-center justify-center">
            {/* Progress Ring */}
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-zinc-100"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="283"
                animate={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
                transition={{ duration: 1, ease: "linear" }}
                className={cn(
                  "transition-colors duration-300",
                  isWarning ? "text-red-500" : timeLeft === 0 && totalSeconds > 0 ? "text-brand-primary" : "text-brand-primary"
                )}
              />
            </svg>

            {/* Time Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
              <motion.div
                animate={isWarning ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className={cn(
                  "text-7xl md:text-9xl font-black tracking-tighter",
                  isWarning ? "text-red-500" : "text-brand-text"
                )}
              >
                {timeLeft > 0 ? formatTime(timeLeft) : formatTime(minutes * 60 + seconds)}
              </motion.div>
              <div className={cn(
                "font-black uppercase tracking-[0.3em] text-sm",
                isActive ? "text-brand-primary animate-pulse" : "text-brand-muted"
              )}>
                {timeLeft === 0 && totalSeconds > 0 ? t.timeUp : isActive ? (lang === 'kz' ? 'Жүруде' : lang === 'ru' ? 'Идет' : 'Running') : (lang === 'kz' ? 'Дайын' : lang === 'ru' ? 'Готов' : 'Ready')}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
