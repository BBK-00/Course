import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Brain, RefreshCw, AlertCircle, Star } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface MemoryGameProps {
  onBack: () => void;
}

interface Cell {
  id: number;
  value: number | null;
  isVisible: boolean;
  isClicked: boolean;
}

export default function MemoryGame({ onBack }: MemoryGameProps) {
  const [gameState, setGameState] = useState<'preview' | 'playing' | 'won' | 'lost'>('preview');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState<Cell[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [timer, setTimer] = useState(10);
  const [isGameActive, setIsGameActive] = useState(false);

  const totalLevels = 10;

  const initLevel = useCallback((lvl: number) => {
    const numCount = 2 + lvl; // Level 1: 3 numbers, Level 10: 12 numbers
    const gridSize = lvl <= 3 ? 16 : (lvl <= 7 ? 25 : 36); // 4x4, 5x5, 6x6
    const side = Math.sqrt(gridSize);

    let newGrid: Cell[] = Array(gridSize).fill(null).map((_, i) => ({
      id: i,
      value: null,
      isVisible: true,
      isClicked: false
    }));

    // Randomly place numbers
    let placed = 0;
    while (placed < numCount) {
      const idx = Math.floor(Math.random() * gridSize);
      if (newGrid[idx].value === null) {
        newGrid[idx].value = placed + 1;
        placed++;
      }
    }

    setGrid(newGrid);
    setNextNumber(1);
    setGameState('preview');
    setTimer(Math.max(3, 11 - lvl)); // Less time as level increases
    setIsGameActive(true);
  }, []);

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  // Preview Timer
  useEffect(() => {
    if (gameState === 'preview' && isGameActive) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setGameState('playing');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, isGameActive]);

  const handleCellClick = (cell: Cell) => {
    if (gameState !== 'playing' || cell.value === null || cell.isClicked) return;

    if (cell.value === nextNumber) {
      // Correct click
      const newGrid = grid.map(c =>
        c.id === cell.id ? { ...c, isClicked: true, isVisible: true } : c
      );
      setGrid(newGrid);

      const numCount = 2 + level;
      if (nextNumber === numCount) {
        // Level Complete
        setScore(prev => prev + level * 100);
        if (level < totalLevels) {
          setTimeout(() => setLevel(prev => prev + 1), 500);
        } else {
          setGameState('won');
        }
      } else {
        setNextNumber(prev => prev + 1);
      }
    } else {
      // Wrong click
      setGameState('lost');
      setIsGameActive(false);
    }
  };

  const startPlaying = () => {
    setGameState('playing');
    setTimer(0);
  };

  const resetGame = () => {
    setLevel(1);
    setScore(0);
    initLevel(1);
  };

  const getGridCols = () => {
    if (grid.length === 16) return 'grid-cols-4';
    if (grid.length === 25) return 'grid-cols-5';
    return 'grid-cols-6';
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
          Есте сақтауды жақсарту
        </div>
        <div className="flex gap-4">
          <div className="card-modern bg-white px-4 py-2 font-black text-sm text-brand-text">
            Деңгей: {level} / {totalLevels}
          </div>
          <div className="card-modern bg-brand-primary text-white px-4 py-2 font-black text-sm">
            Ұпай: {score}
          </div>
        </div>
      </div>

      <div className="relative z-20 h-[calc(100vh-100px)] flex flex-col items-center justify-center p-4">
        {/* Status Bar */}
        <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "px-6 py-3 rounded-2xl border-2 border-brand-primary/20 font-black uppercase tracking-tight shadow-sm",
              gameState === 'preview' ? "bg-brand-bg text-brand-primary" : "bg-brand-primary text-white"
            )}>
              {gameState === 'preview' ? `Сандарды есте сақтаңыз: ${timer} сек` : 'Сандарды ретімен басыңыз!'}
            </div>
          </div>
          {gameState === 'preview' && (
            <button
              onClick={startPlaying}
              className="btn-primary px-8 py-3"
            >
              Дайынмын!
            </button>
          )}
        </div>

        {/* Game Grid */}
        <div className={cn(
          "grid gap-3 p-4 bg-white border border-zinc-100 rounded-[2rem] shadow-xl",
          getGridCols()
        )}>
          {grid.map((cell) => (
            <motion.button
              key={cell.id}
              whileHover={gameState === 'playing' && !cell.isClicked ? { scale: 1.05 } : {}}
              whileTap={gameState === 'playing' && !cell.isClicked ? { scale: 0.95 } : {}}
              onClick={() => handleCellClick(cell)}
              className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 transition-all duration-300 flex items-center justify-center text-2xl font-black",
                cell.value === null ? "bg-zinc-50 border-zinc-100" :
                (gameState === 'preview' || cell.isClicked ? "bg-white border-brand-primary text-brand-primary shadow-sm" : "bg-brand-primary border-brand-primary text-white")
              )}
            >
              {(gameState === 'preview' || cell.isClicked) && cell.value}
            </motion.button>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-12 flex items-center gap-3 text-zinc-400 font-black uppercase tracking-widest text-[10px]">
          <Brain size={16} />
          <span>Сандарды 1-ден бастап өсу ретімен белгілеңіз</span>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(gameState === 'won' || gameState === 'lost') && (
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
              <div className={cn(
                "w-24 h-24 border-4 border-white rounded-full flex items-center justify-center mx-auto shadow-xl",
                gameState === 'won' ? "bg-brand-primary" : "bg-red-500"
              )}>
                {gameState === 'won' ? <Trophy size={48} className="text-white" /> : <AlertCircle size={48} className="text-white" />}
              </div>

              <div className="space-y-2">
                <h3 className="text-4xl font-black uppercase tracking-tight text-brand-text">
                  {gameState === 'won' ? 'Керемет нәтиже!' : 'Ойын аяқталды'}
                </h3>
                <p className="text-xl font-bold text-brand-muted">
                  {gameState === 'won' ? 'Сіз барлық деңгейден өттіңіз!' : `Сіз ${level}-деңгейге дейін жеттіңіз`}
                </p>
                <div className="flex items-center justify-center gap-2 text-3xl font-black text-brand-primary">
                  <Star className="fill-brand-primary" />
                  <span>{score} ҰПАЙ</span>
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
