import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Calculator, ChevronRight, RotateCcw, User, Users } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface SackRaceGameProps {
  onBack: () => void;
}

type Operation = '+' | '-' | '×' | '÷';

interface PlayerState {
  name: string;
  pos: number;
  answer: number;
  input: string;
  question: string;
}

const KazakhBoy = ({ color, taqiyaColor, isJumping }: { color: string, taqiyaColor: string, isJumping: boolean }) => (
  <motion.div
    animate={isJumping ? { y: [0, -40, 0], scale: [1, 1.1, 1] } : {}}
    transition={{ duration: 0.4 }}
    className="relative w-20 h-24 flex flex-col items-center"
  >
    {/* Taqiya (Skullcap) */}
    <div
      className="absolute top-0 w-8 h-4 rounded-t-full border-2 border-black z-10"
      style={{ backgroundColor: taqiyaColor }}
    />
    {/* Head */}
    <div className="absolute top-3 w-10 h-10 bg-[#FFDBAC] rounded-full border-2 border-black" />
    {/* Body/Shirt */}
    <div
      className="absolute top-11 w-12 h-10 border-2 border-black rounded-t-lg"
      style={{ backgroundColor: color }}
    />
    {/* Sack */}
    <div className="absolute bottom-0 w-14 h-12 bg-[#D2B48C] border-2 border-black rounded-b-xl rounded-t-sm shadow-inner flex flex-col items-center justify-center">
      <div className="w-full h-1 bg-black/10 mt-2" />
      <div className="w-full h-1 bg-black/10 mt-2" />
    </div>
  </motion.div>
);

export default function SackRaceGame({ onBack }: SackRaceGameProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'won'>('menu');
  const [operation, setOperation] = useState<Operation>('+');
  const [p1, setP1] = useState<PlayerState>({ name: '1-Команда', pos: 0, answer: 0, input: '', question: '' });
  const [p2, setP2] = useState<PlayerState>({ name: '2-Команда', pos: 0, answer: 0, input: '', question: '' });
  const [winner, setWinner] = useState<string | null>(null);

  const generateQuestion = useCallback((op: Operation) => {
    let num1, num2, answer, signStr;

    switch (op) {
      case '+':
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        answer = num1 + num2;
        signStr = '+';
        break;
      case '-':
        num1 = Math.floor(Math.random() * 20) + 5;
        num2 = Math.floor(Math.random() * num1) + 1;
        answer = num1 - num2;
        signStr = '-';
        break;
      case '×':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 * num2;
        signStr = '×';
        break;
      case '÷':
        answer = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        num1 = answer * num2;
        signStr = '÷';
        break;
      default:
        num1 = 0; num2 = 0; answer = 0; signStr = '+';
    }

    return { question: `${num1} ${signStr} ${num2} = ?`, answer };
  }, []);

  const startGame = (op: Operation) => {
    setOperation(op);
    const q1 = generateQuestion(op);
    const q2 = generateQuestion(op);

    setP1(prev => ({ ...prev, ...q1, pos: 0, input: '' }));
    setP2(prev => ({ ...prev, ...q2, pos: 0, input: '' }));
    setGameState('playing');
  };

  const handleInput = (player: 1 | 2, val: string) => {
    if (gameState !== 'playing') return;

    const setPlayer = player === 1 ? setP1 : setP2;

    if (val === 'C') {
      setPlayer(prev => ({ ...prev, input: '' }));
    } else if (val === 'GO') {
      const p = player === 1 ? p1 : p2;
      if (parseInt(p.input) === p.answer) {
        const newPos = p.pos + 1;
        if (newPos >= 10) {
          setWinner(p.name);
          setGameState('won');
        }
        const nextQ = generateQuestion(operation);
        setPlayer(prev => ({ ...prev, ...nextQ, pos: newPos, input: '' }));
      } else {
        setPlayer(prev => ({ ...prev, input: '' }));
      }
    } else {
      setPlayer(prev => ({
        ...prev,
        input: prev.input.length < 3 ? prev.input + val : prev.input
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-[#FDFCF8] overflow-hidden font-sans select-none">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Header */}
      <div className="relative z-20 p-6 flex justify-between items-center">
        <button onClick={onBack} className="neo-btn bg-white text-sm px-4 py-2 flex items-center gap-2">
          <X size={18} /> Артқа
        </button>
        <div className="neo-card bg-brand-yellow px-6 py-2 font-black uppercase tracking-widest text-sm">
          Қаппен жарыс
        </div>
        <div className="w-24" /> {/* Spacer */}
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center h-[calc(100vh-100px)] p-6"
          >
            <div className="card-modern bg-white p-12 max-w-2xl w-full space-y-10 text-center">
              <div className="space-y-4">
                <h2 className="text-5xl font-black tracking-tight text-brand-text">Математикалық жарыс</h2>
                <p className="text-brand-muted text-xl font-medium">Амалды таңдап, жарысты бастаңыз!</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <input
                  type="text"
                  value={p1.name}
                  onChange={(e) => setP1(prev => ({ ...prev, name: e.target.value }))}
                  className="card-modern bg-brand-bg/30 p-4 text-center font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="1-Команда"
                />
                <input
                  type="text"
                  value={p2.name}
                  onChange={(e) => setP2(prev => ({ ...prev, name: e.target.value }))}
                  className="card-modern bg-brand-bg/30 p-4 text-center font-bold focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  placeholder="2-Команда"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['+', '-', '×', '÷'] as Operation[]).map((op) => (
                  <button
                    key={op}
                    onClick={() => startGame(op)}
                    className="btn-secondary text-3xl py-8 hover:bg-brand-primary hover:text-white transition-colors"
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-[calc(100vh-100px)] flex flex-col md:flex-row items-center justify-around p-4 gap-8"
          >
            {/* Player 1 Calculator */}
            <div className="card-modern bg-white p-6 w-full max-w-[320px] space-y-4 border-brand-primary border-b-8">
              <div className="text-center font-black uppercase tracking-widest text-brand-primary">{p1.name}</div>
              <div className="bg-brand-text text-brand-primary p-4 rounded-xl text-3xl font-black text-center shadow-inner">
                {p1.question}
              </div>
              <div className="bg-brand-bg p-4 rounded-xl text-4xl font-black text-center h-20 flex items-center justify-center border-2 border-brand-primary/20">
                {p1.input}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'GO'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => handleInput(1, btn.toString())}
                    className={cn(
                      "p-4 rounded-xl font-black text-xl transition-all active:scale-95 shadow-sm",
                      btn === 'C' ? "bg-red-500 text-white" :
                      btn === 'GO' ? "bg-brand-primary text-white" : "bg-white border border-zinc-100"
                    )}
                  >
                    {btn}
                  </button>
                ))}
              </div>
              <div className="badge-modern bg-brand-bg text-brand-primary p-2 text-center font-black text-xs">
                ҚАДАМ: {p1.pos} / 10
              </div>
            </div>

            {/* Race Track */}
            <div className="flex-1 w-full max-w-2xl h-full flex flex-col items-center justify-center">
              <div className="relative w-full h-80 bg-zinc-900 rounded-[3rem] border-8 border-brand-text overflow-hidden shadow-2xl">
                {/* Track Lines */}
                <div className="absolute inset-0 opacity-20"
                     style={{ backgroundImage: 'linear-gradient(90deg, #fff 2px, transparent 2px)', backgroundSize: '10% 100%' }} />

                {/* Start & Finish */}
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-brand-primary/50" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-brand-primary flex flex-col justify-around py-2">
                  {[...Array(10)].map((_, i) => <div key={i} className="w-full h-2 bg-white/30" />)}
                </div>

                {/* Player 1 Sprite */}
                <motion.div
                  animate={{ left: `${10 + (p1.pos * 8)}%` }}
                  className="absolute top-[25%] -translate-y-1/2 flex flex-col items-center"
                >
                  <KazakhBoy color="#3B82F6" taqiyaColor="#10B981" isJumping={p1.pos > 0} key={`p1-${p1.pos}`} />
                  <div className="mt-2 px-2 py-1 bg-white border-2 border-brand-text rounded-lg text-[10px] font-black uppercase">
                    {p1.name}
                  </div>
                </motion.div>

                {/* Player 2 Sprite */}
                <motion.div
                  animate={{ left: `${10 + (p2.pos * 8)}%` }}
                  className="absolute top-[75%] -translate-y-1/2 flex flex-col items-center"
                >
                  <KazakhBoy color="#EC4899" taqiyaColor="#EF4444" isJumping={p2.pos > 0} key={`p2-${p2.pos}`} />
                  <div className="mt-2 px-2 py-1 bg-white border-2 border-brand-text rounded-lg text-[10px] font-black uppercase">
                    {p2.name}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Player 2 Calculator */}
            <div className="card-modern bg-white p-6 w-full max-w-[320px] space-y-4 border-brand-secondary border-b-8">
              <div className="text-center font-black uppercase tracking-widest text-brand-secondary">{p2.name}</div>
              <div className="bg-brand-text text-brand-secondary p-4 rounded-xl text-3xl font-black text-center shadow-inner">
                {p2.question}
              </div>
              <div className="bg-brand-bg p-4 rounded-xl text-4xl font-black text-center h-20 flex items-center justify-center border-2 border-brand-secondary/20">
                {p2.input}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'GO'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => handleInput(2, btn.toString())}
                    className={cn(
                      "p-4 rounded-xl font-black text-xl transition-all active:scale-95 shadow-sm",
                      btn === 'C' ? "bg-red-500 text-white" :
                      btn === 'GO' ? "bg-brand-secondary text-white" : "bg-white border border-zinc-100"
                    )}
                  >
                    {btn}
                  </button>
                ))}
              </div>
              <div className="badge-modern bg-brand-bg text-brand-secondary p-2 text-center font-black text-xs">
                ҚАДАМ: {p2.pos} / 10
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'won' && (
          <motion.div
            key="won"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-text/40 backdrop-blur-sm"
          >
            <div className="card-modern bg-white p-12 max-w-lg w-full text-center space-y-8">
              <div className="w-24 h-24 bg-brand-primary border-4 border-brand-text rounded-full flex items-center justify-center mx-auto shadow-xl">
                <Trophy size={48} className="text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black uppercase tracking-tight text-brand-text">Жеңіс!</h3>
                <p className="text-2xl font-black text-brand-primary uppercase tracking-widest">{winner}</p>
                <p className="text-brand-muted font-bold">Жарыста бірінші болып келді!</p>
              </div>
              <button
                onClick={() => setGameState('menu')}
                className="btn-primary w-full py-4 text-xl flex items-center justify-center gap-3"
              >
                <RotateCcw /> Қайта бастау
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
