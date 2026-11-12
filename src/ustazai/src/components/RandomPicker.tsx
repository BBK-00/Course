import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shuffle, Eraser, UserCheck, RotateCcw, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/src/lib/utils';
import { translations, Language } from '../lib/translations';

interface RandomPickerProps {
  onBack: () => void;
  lang: Language;
}

export default function RandomPicker({ onBack, lang }: RandomPickerProps) {
  const [nameInput, setNameInput] = useState('');
  const [winner, setWinner] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [tempName, setTempName] = useState('');
  const [remainingCount, setRemainingCount] = useState(0);
  const t = translations[lang].tools.randompicker;
  const common = translations[lang].reflection;

  const students = nameInput
    .split(/[,\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 1);

  useEffect(() => {
    setRemainingCount(students.length);
  }, [nameInput]);

  const pickRandom = async () => {
    if (students.length === 0) return;

    setIsPicking(true);
    setWinner(null);

    // Drum effect / Shuffling animation
    let counter = 0;
    const maxTicks = 50; // Increased to ~4s (50 * 80ms)
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * students.length);
      setTempName(students[randomIdx]);
      counter++;

      if (counter >= maxTicks) {
        clearInterval(interval);

        // Final selection
        const finalIdx = Math.floor(Math.random() * students.length);
        const finalWinner = students[finalIdx];

        // Remove winner from list
        const updatedStudents = [...students];
        updatedStudents.splice(finalIdx, 1);
        setNameInput(updatedStudents.join('\n'));

        setWinner(finalWinner);
        setIsPicking(false);

        // Celebration
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#00b894', '#f59e0b', '#ef4444', '#8b5cf6']
        });
      }
    }, 80);
  };

  const clearAll = () => {
    setNameInput('');
    setWinner(null);
    setTempName('');
  };

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
        <div className="w-24" />
      </div>

      <div className="relative z-20 max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Input */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="lg:col-span-5 space-y-6"
        >
          <div className="card-modern p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                <Shuffle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">{t.inputLabel}</h2>
                <p className="text-brand-muted font-medium text-xs">{remainingCount} {lang === 'kz' ? 'оқушы табылды' : lang === 'ru' ? 'учеников найдено' : 'students found'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <textarea
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t.inputPlaceholder}
                className="w-full h-64 bg-brand-bg/30 border border-zinc-100 rounded-2xl p-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              />
              <button
                onClick={clearAll}
                className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity px-1"
              >
                <Eraser size={14} /> {common.reset}
              </button>
            </div>

            <button
              onClick={pickRandom}
              disabled={isPicking || students.length === 0}
              className={cn(
                "btn-primary w-full py-4 text-lg",
                (isPicking || students.length === 0) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Shuffle size={20} className={cn(isPicking && "animate-spin")} />
              {isPicking ? (lang === 'kz' ? 'Таңдалуда...' : lang === 'ru' ? 'Выбирается...' : 'Picking...') : t.pickBtn}
            </button>
          </div>
        </motion.div>

        {/* Main Display: Result */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="lg:col-span-7"
        >
          <div className="card-modern h-full min-h-[400px] flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-4 left-4 opacity-10"><UserPlus size={40} /></div>
            <div className="absolute bottom-4 right-4 opacity-10"><UserCheck size={40} /></div>

            <AnimatePresence mode="wait">
              {isPicking ? (
                <motion.div
                  key="picking"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <div className="text-5xl md:text-7xl font-black text-brand-primary animate-pulse">
                    {tempName}
                  </div>
                  <p className="font-black uppercase tracking-widest text-brand-muted">{lang === 'kz' ? 'Таңдалуда...' : lang === 'ru' ? 'Выбирается...' : 'Picking...'}</p>
                </motion.div>
              ) : winner ? (
                <motion.div
                  key="winner"
                  initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  className="text-center space-y-8"
                >
                  <div className="space-y-2">
                    <p className="font-black uppercase tracking-widest text-brand-primary">{t.winner}:</p>
                    <div className="text-6xl md:text-8xl font-black tracking-tighter bg-brand-bg px-12 py-8 rounded-[3rem] border-4 border-brand-primary shadow-xl shadow-brand-primary/10">
                      {winner}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <p className="font-bold text-brand-muted italic">{lang === 'kz' ? 'Келесі оқушыны таңдауға дайынсыз ба?' : lang === 'ru' ? 'Готовы выбрать следующего ученика?' : 'Ready to pick the next student?'}</p>
                    <button
                      onClick={pickRandom}
                      className="btn-primary px-8 py-3"
                    >
                      <RotateCcw size={18} /> {lang === 'kz' ? 'Келесіні таңдау' : lang === 'ru' ? 'Выбрать следующего' : 'Pick next'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-6 max-w-sm"
                >
                  <div className="w-24 h-24 bg-brand-bg rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserCheck size={48} className="text-brand-primary" />
                  </div>
                  <h3 className="text-2xl font-black text-brand-text">{lang === 'kz' ? 'Оқушыны таңдаңыз' : lang === 'ru' ? 'Выберите ученика' : 'Select a student'}</h3>
                  <p className="text-brand-muted font-medium">
                    {lang === 'kz' ? 'Сол жақтағы тізімге оқушыларды енгізіп, "Таңдау" батырмасын басыңыз.' : lang === 'ru' ? 'Введите имена в список слева и нажмите кнопку "Выбрать".' : 'Enter students in the list on the left and click the "Pick" button.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
