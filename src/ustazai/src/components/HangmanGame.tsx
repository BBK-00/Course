import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, RotateCcw, HelpCircle, Type, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import confetti from 'canvas-confetti';

interface Question {
  text: string;
  answer: string;
}

interface HangmanGameProps {
  questions: Question[];
  onBack: () => void;
}

const KAZAKH_ALPHABET = "АӘБВГҒДЕЁЖЗИЙКҚЛМНҢОӨПРСТУҰҮФХҺЦЧШЩЪЫІЬЭЮЯ".split("");

export default function HangmanGame({ questions, onBack }: HangmanGameProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const maxMistakes = 6;

  const currentQuestion = questions[currentQuestionIndex];
  const word = currentQuestion?.answer.toUpperCase() || "";
  const hint = currentQuestion?.text || "";

  const isWon = word.split("").every(letter => guessedLetters.includes(letter) || !KAZAKH_ALPHABET.includes(letter));
  const isLost = mistakes >= maxMistakes;

  useEffect(() => {
    if (isWon) {
      setGameState('won');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else if (isLost) {
      setGameState('lost');
    }
  }, [isWon, isLost]);

  const handleGuess = (letter: string) => {
    if (gameState !== 'playing' || guessedLetters.includes(letter)) return;

    setGuessedLetters(prev => [...prev, letter]);
    if (!word.includes(letter)) {
      setMistakes(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setGuessedLetters([]);
      setMistakes(0);
      setGameState('playing');
    } else {
      onBack();
    }
  };

  const resetGame = () => {
    setGuessedLetters([]);
    setMistakes(0);
    setGameState('playing');
  };

  // Hangman Drawing Component
  const HangmanDrawing = ({ mistakes }: { mistakes: number }) => {
    return (
      <div className="relative w-48 h-64 mx-auto">
        {/* Gallows */}
        <div className="absolute bottom-0 left-0 w-full h-2 bg-brand-text rounded-full" />
        <div className="absolute bottom-0 left-8 w-2 h-full bg-brand-text rounded-full" />
        <div className="absolute top-0 left-8 w-32 h-2 bg-brand-text rounded-full" />
        <div className="absolute top-0 right-8 w-2 h-12 bg-brand-text rounded-full" />

        {/* Head */}
        {mistakes > 0 && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute top-12 right-4 w-10 h-10 rounded-full border-4 border-brand-text bg-white"
          />
        )}
        {/* Body */}
        {mistakes > 1 && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 60 }}
            className="absolute top-22 right-8.5 w-1 bg-brand-text rounded-full"
          />
        )}
        {/* Left Arm */}
        {mistakes > 2 && (
          <motion.div
            initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 1, rotate: 45 }}
            className="absolute top-26 right-9 w-8 h-1 bg-brand-text rounded-full origin-left"
          />
        )}
        {/* Right Arm */}
        {mistakes > 3 && (
          <motion.div
            initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 1, rotate: -45 }}
            className="absolute top-26 right-1 w-8 h-1 bg-brand-text rounded-full origin-right"
          />
        )}
        {/* Left Leg */}
        {mistakes > 4 && (
          <motion.div
            initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 1, rotate: 45 }}
            className="absolute top-36 right-9 w-8 h-1 bg-brand-text rounded-full origin-left"
          />
        )}
        {/* Right Leg */}
        {mistakes > 5 && (
          <motion.div
            initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 1, rotate: -45 }}
            className="absolute top-36 right-1 w-8 h-1 bg-brand-text rounded-full origin-right"
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#FDFCF8] overflow-hidden font-sans select-none">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Header */}
      <div className="relative z-20 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <button onClick={onBack} className="btn-secondary px-4 py-2 text-sm">
          <X size={18} /> Артқа
        </button>
        <div className="badge-modern bg-brand-primary text-white px-6 py-2">
          Сөзді тап (Hangman)
        </div>
        <div className="w-24 h-10 bg-white border border-zinc-100 rounded-xl flex items-center justify-center font-black text-sm">
          {currentQuestionIndex + 1} / {questions.length}
        </div>
      </div>

      <div className="relative z-20 h-[calc(100vh-100px)] flex flex-col items-center justify-center p-4 gap-8 max-w-5xl mx-auto w-full">

        {/* Hint Section */}
        <div className="card-modern p-6 w-full text-center space-y-4 bg-white border-b-8 border-brand-primary">
          <div className="flex items-center justify-center gap-2 text-brand-primary font-black uppercase tracking-widest text-sm">
            <HelpCircle size={18} />
            Көмекші мәтін
          </div>
          <p className="text-2xl font-bold text-brand-text">{hint}</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full">
          {/* Drawing */}
          <div className="card-modern p-8 bg-white/50 backdrop-blur-sm">
            <HangmanDrawing mistakes={mistakes} />
          </div>

          {/* Word Display */}
          <div className="flex-1 flex flex-col items-center gap-12">
            <div className="flex flex-wrap justify-center gap-3">
              {word.split("").map((letter, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-12 h-16 md:w-14 md:h-20 border-b-4 flex items-center justify-center text-3xl md:text-4xl font-black transition-all",
                    guessedLetters.includes(letter) || !KAZAKH_ALPHABET.includes(letter)
                      ? "border-brand-primary text-brand-text"
                      : "border-zinc-200 text-transparent"
                  )}
                >
                  {guessedLetters.includes(letter) || !KAZAKH_ALPHABET.includes(letter) ? letter : ""}
                </div>
              ))}
            </div>

            {/* Keyboard */}
            <div className="grid grid-cols-7 md:grid-cols-11 gap-2 max-w-3xl">
              {KAZAKH_ALPHABET.map(letter => (
                <button
                  key={letter}
                  disabled={guessedLetters.includes(letter) || gameState !== 'playing'}
                  onClick={() => handleGuess(letter)}
                  className={cn(
                    "w-10 h-12 md:w-12 md:h-14 rounded-xl font-black text-lg transition-all active:scale-90 shadow-sm flex items-center justify-center",
                    guessedLetters.includes(letter)
                      ? (word.includes(letter) ? "bg-brand-primary text-white" : "bg-zinc-200 text-zinc-400")
                      : "bg-white border border-zinc-100 hover:border-brand-primary hover:text-brand-primary"
                  )}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Result Modals */}
      <AnimatePresence>
        {(gameState === 'won' || gameState === 'lost') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-text/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="card-modern bg-white p-12 max-w-lg w-full text-center space-y-8"
            >
              <div className={cn(
                "w-24 h-24 border-4 border-brand-text rounded-full flex items-center justify-center mx-auto shadow-xl",
                gameState === 'won' ? "bg-brand-primary" : "bg-red-500"
              )}>
                {gameState === 'won' ? <Trophy size={48} className="text-white" /> : <AlertCircle size={48} className="text-white" />}
              </div>

              <div className="space-y-2">
                <h3 className="text-4xl font-black uppercase tracking-tight">
                  {gameState === 'won' ? 'Керемет!' : 'Ойын аяқталды'}
                </h3>
                <p className="text-brand-muted font-bold">
                  {gameState === 'won' ? 'Сіз сөзді таптыңыз!' : 'Мүмкіндіктер таусылды.'}
                </p>
                <div className="py-4">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Дұрыс жауап:</p>
                  <p className="text-3xl font-black text-brand-text tracking-widest">{word}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {gameState === 'won' ? (
                  <button
                    onClick={nextQuestion}
                    className="btn-primary w-full py-4 text-xl"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Келесі сөз' : 'Мәзірге қайту'}
                  </button>
                ) : (
                  <button
                    onClick={resetGame}
                    className="btn-primary w-full py-4 text-xl"
                  >
                    <RotateCcw /> Қайта көру
                  </button>
                )}
                <button
                  onClick={onBack}
                  className="btn-secondary w-full py-4 text-xl"
                >
                  Шығу
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
