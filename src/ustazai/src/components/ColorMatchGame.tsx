import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Palette, RefreshCw, AlertCircle, Timer } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ColorMatchGameProps {
  onBack: () => void;
}

export default function ColorMatchGame({ onBack }: ColorMatchGameProps) {
  const [gameState, setGameState] = useState<'playing' | 'lost'>('playing');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [grid, setGrid] = useState<{ color: string; isTarget: boolean }[]>([]);
  const [gridSize, setGridSize] = useState(2);
  const [deathReason, setDeathReason] = useState("");

  // Load best score
  useEffect(() => {
    const saved = localStorage.getItem('colorGameBest');
    if (saved) setBestScore(parseInt(saved));
  }, []);

  const initLevel = useCallback((lvl: number) => {
    const size = Math.min(Math.floor(lvl / 2) + 2, 9);
    setGridSize(size);

    // Base color
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);

    // Difference (decreases as level increases)
    const diff = Math.max(45 - (lvl * 2), 4);

    const targetIndex = Math.floor(Math.random() * (size * size));
    const newGrid = Array(size * size).fill(null).map((_, i) => ({
      color: i === targetIndex
        ? `rgb(${Math.min(255, r + diff)}, ${Math.min(255, g + diff)}, ${Math.min(255, b + diff)})`
        : `rgb(${r}, ${g}, ${b})`,
      isTarget: i === targetIndex
    }));

    setGrid(newGrid);
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      initLevel(level);
    }
  }, [level, gameState, initLevel]);

  // Timer
  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame("Уақыт бітті!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  const handleBoxClick = (isTarget: boolean) => {
    if (gameState !== 'playing') return;

    if (isTarget) {
      setLevel(prev => prev + 1);
      setScore(prev => prev + 10);
      setTimeLeft(prev => Math.min(prev + 2, 20));
    } else {
      endGame("Қателестіңіз!");
    }
  };

  const endGame = (reason: string) => {
    setGameState('lost');
    setDeathReason(reason);
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('colorGameBest', score.toString());
    }
  };

  const resetGame = () => {
    setLevel(1);
    setScore(0);
    setTimeLeft(15);
    setGameState('playing');
  };

  return (
    <div className="fixed inset-0 bg-[#FDFCF8] overflow-hidden font-sans select-none">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Header */}
      <div className="relative z-20 p-6 flex justify-between items-center">
        <button onClick={onBack} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
          <X size={18} /> Артқа
        </button>
        <div className="badge-modern bg-brand-primary text-white px-6 py-2">
          Түсті тап!
        </div>
        <div className="flex gap-4">
          <div className="card-modern bg-white px-4 py-2 font-black text-sm flex items-center gap-2 text-brand-text">
            <Timer size={16} className="text-brand-primary" />
            <span className={cn(timeLeft <= 5 && "text-red-500 animate-pulse")}>{timeLeft}с</span>
          </div>
          <div className="card-modern bg-brand-primary text-white px-4 py-2 font-black text-sm">
            Ұпай: {score}
          </div>
        </div>
      </div>

      <div className="relative z-20 h-[calc(100vh-100px)] flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center space-y-2">
          <h2 className="text-2xl font-black tracking-tight uppercase">Өзгеше түсті тап!</h2>
          <p className="text-zinc-500 font-bold text-sm">Қателессеңіз ойын бірден аяқталады</p>
        </div>

        {/* Game Grid */}
        <div
          className="bg-white p-4 border border-zinc-100 rounded-[2rem] shadow-xl grid gap-2 w-full max-w-[400px] aspect-square"
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {grid.map((box, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 0.98 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleBoxClick(box.isTarget)}
              className="w-full h-full rounded-xl border border-black/5"
              style={{ backgroundColor: box.color }}
            />
          ))}
        </div>

        <div className="mt-12 flex items-center gap-3 text-zinc-400 font-black uppercase tracking-widest text-[10px]">
          <Palette size={16} />
          <span>Рекорд: {bestScore}</span>
        </div>
      </div>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState === 'lost' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="card-modern bg-white p-12 max-w-lg w-full text-center space-y-8"
            >
              <div className="w-24 h-24 bg-brand-primary border-4 border-white rounded-full flex items-center justify-center mx-auto shadow-xl">
                <AlertCircle size={48} className="text-white" />
              </div>

              <div className="space-y-2">
                <h3 className="text-4xl font-black uppercase tracking-tight text-brand-primary">{deathReason}</h3>
                <p className="text-xl font-bold text-brand-muted">Ойын аяқталды</p>
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-black text-brand-text">Деңгей: {level}</div>
                  <div className="text-3xl font-black text-brand-primary">Ұпай: {score}</div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={resetGame}
                  className="btn-primary w-full py-4 text-xl flex items-center justify-center gap-3"
                >
                  <RefreshCw /> Қайта бастау
                </button>
                <button
                  onClick={onBack}
                  className="btn-secondary w-full py-4 text-xl"
                >
                  Мәзірге қайту
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
