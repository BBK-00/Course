import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, RotateCcw, X, Play, Calculator, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import confetti from 'canvas-confetti';

interface TugOfWarGameProps {
  questions?: { text: string; answer: string }[];
  onBack: () => void;
}

interface PlayerState {
  name: string;
  question: string;
  answer: number;
  input: string;
}

export default function TugOfWarGame({ questions, onBack }: TugOfWarGameProps) {
  const [gameState, setGameState] = useState<'menu' | 'countdown' | 'playing' | 'won'>('menu');
  const [teamNames, setTeamNames] = useState({ left: '1-ТОП (КӨК)', right: '2-ТОП (ҚЫЗЫЛ)' });
  const [countdown, setCountdown] = useState(3);
  const [position, setPosition] = useState(0); // offset in pixels
  const [p1, setP1] = useState<PlayerState>({ name: '', question: '', answer: 0, input: '' });
  const [p2, setP2] = useState<PlayerState>({ name: '', question: '', answer: 0, input: '' });
  const [winner, setWinner] = useState<'left' | 'right' | null>(null);
  const [qIndex, setQIndex] = useState({ left: 0, right: 1 });

  const WIN_LIMIT = 300;
  const STEP = 50;
  const PENALTY_STEP = 25;

  const generateQuestion = useCallback(() => {
    if (questions && questions.length > 0) {
      // Use AI questions if available
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const idx = qIndex[side] % questions.length;
      const q = questions[idx];

      // Update index for next time
      setQIndex(prev => ({ ...prev, [side]: (prev[side] + 1) % questions.length }));

      return { question: q.text, answer: parseInt(q.answer) };
    }

    const types = ['+', '-'];
    const type = types[Math.floor(Math.random() * types.length)];
    let a, b, text, ans;
    const maxNum = 25;

    if (type === '+') {
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      ans = a + b;
      text = `${a} + ${b}`;
    } else {
      a = Math.floor(Math.random() * (maxNum * 2)) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      if (a < b) [a, b] = [b, a];
      ans = a - b;
      text = `${a} - ${b}`;
    }
    return { question: text, answer: ans };
  }, []);

  const startGame = () => {
    setGameState('countdown');
    setCountdown(3);
    setPosition(0);
    setWinner(null);
  };

  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        const q1 = generateQuestion();
        const q2 = generateQuestion();
        setP1({ name: teamNames.left, ...q1, input: '' });
        setP2({ name: teamNames.right, ...q2, input: '' });
        setGameState('playing');
      }
    }
  }, [gameState, countdown, teamNames, generateQuestion]);

  const handleInput = (side: 'left' | 'right', val: string) => {
    if (gameState !== 'playing') return;

    const setPlayer = side === 'left' ? setP1 : setP2;
    const player = side === 'left' ? p1 : p2;

    if (val === 'C') {
      setPlayer(prev => ({ ...prev, input: '' }));
    } else if (val === 'GO') {
      const isCorrect = parseInt(player.input) === player.answer;

      if (isCorrect) {
        const move = side === 'left' ? -STEP : STEP;
        const newPos = position + move;
        setPosition(newPos);

        if (Math.abs(newPos) >= WIN_LIMIT) {
          setWinner(newPos < 0 ? 'left' : 'right');
          setGameState('won');
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
          });
        } else {
          const nextQ = generateQuestion();
          setPlayer(prev => ({ ...prev, ...nextQ, input: '' }));
        }
      } else {
        // Penalty: move towards opponent
        const move = side === 'left' ? PENALTY_STEP : -PENALTY_STEP;
        const newPos = position + move;
        setPosition(newPos);

        // Even on penalty, check win (though unlikely to win by opponent's mistake)
        if (Math.abs(newPos) >= WIN_LIMIT) {
          setWinner(newPos < 0 ? 'left' : 'right');
          setGameState('won');
        } else {
          const nextQ = generateQuestion();
          setPlayer(prev => ({ ...prev, ...nextQ, input: '' }));
        }
      }
    } else {
      if (player.input.length < 3) {
        setPlayer(prev => ({ ...prev, input: prev.input + val }));
      }
    }
  };

  const Keypad = ({ side, player }: { side: 'left' | 'right', player: PlayerState }) => (
    <div className={cn(
      "card-modern p-6 w-full max-w-[320px] space-y-4 border-b-8",
      side === 'left' ? "border-brand-primary" : "border-brand-secondary"
    )}>
      <div className={cn(
        "text-center font-black uppercase tracking-widest",
        side === 'left' ? "text-brand-primary" : "text-brand-secondary"
      )}>
        {player.name}
      </div>
      <div className="bg-brand-text text-brand-primary p-4 rounded-xl text-3xl font-black text-center shadow-inner">
        {player.question} = ?
      </div>
      <div className="bg-brand-bg p-4 rounded-xl text-4xl font-black text-center h-20 flex items-center justify-center border-2 border-brand-primary/20">
        {player.input}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'GO'].map((btn) => (
          <button
            key={btn}
            onClick={() => handleInput(side, btn.toString())}
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
    </div>
  );

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
          Арқан тартыс
        </div>
        <div className="w-24" />
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
            <div className="card-modern p-12 max-w-2xl w-full space-y-10 text-center bg-white">
              <div className="space-y-4">
                <h2 className="text-4xl font-black tracking-tight text-brand-text">Арқан тартыс: Математика</h2>
                <p className="text-brand-muted text-lg font-medium">Командаларды дайындаңыз</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h3 className="font-black text-brand-primary uppercase tracking-widest text-sm">1-ТОП (КӨК)</h3>
                  <input
                    type="text"
                    value={teamNames.left}
                    onChange={(e) => setTeamNames(prev => ({ ...prev, left: e.target.value }))}
                    className="w-full card-modern bg-brand-bg/30 p-4 text-center font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="Атауы"
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="font-black text-brand-secondary uppercase tracking-widest text-sm">2-ТОП (ҚЫЗЫЛ)</h3>
                  <input
                    type="text"
                    value={teamNames.right}
                    onChange={(e) => setTeamNames(prev => ({ ...prev, right: e.target.value }))}
                    className="w-full card-modern bg-brand-bg/30 p-4 text-center font-bold focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    placeholder="Атауы"
                  />
                </div>
              </div>

              <button
                onClick={startGame}
                className="btn-primary w-full py-6 text-2xl"
              >
                Ойынды бастау
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-brand-primary/10 backdrop-blur-sm"
          >
            <div className="text-[12rem] font-black text-brand-primary drop-shadow-[0_10px_10px_rgba(0,0,0,0.2)]">
              {countdown > 0 ? countdown : 'БАСТАДЫҚ!'}
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-[calc(100vh-100px)] flex flex-col lg:flex-row items-center justify-around p-4 gap-8 max-w-7xl mx-auto w-full"
          >
            <Keypad side="left" player={p1} />

            <div className="flex-1 w-full max-w-2xl h-full flex flex-col items-center justify-center relative">
              <div className="w-full h-80 bg-zinc-900 rounded-[3rem] border-8 border-brand-text overflow-hidden shadow-2xl relative">
                {/* Track Lines */}
                <div className="absolute inset-0 opacity-10"
                     style={{ backgroundImage: 'linear-gradient(90deg, #fff 2px, transparent 2px)', backgroundSize: '10% 100%' }} />

                {/* Center Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-brand-primary/50 -translate-x-1/2" />

                {/* Rope and Players Container */}
                <motion.div
                  animate={{ x: position }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {/* The Rope */}
                  <div className="w-[1200px] h-4 bg-[#8B4513] rounded-full border-2 border-black relative flex items-center justify-center">
                    <div className="w-2 h-16 bg-brand-primary border-2 border-black rounded-full" />
                  </div>

                  {/* Left Team Sprites */}
                  <div className="absolute right-[calc(50%+40px)] flex gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-12 h-20 bg-brand-primary rounded-t-full border-4 border-brand-text flex flex-col items-center justify-end pb-2">
                        <div className="w-8 h-8 bg-white border-2 border-brand-text rounded-full mb-1" />
                      </div>
                    ))}
                  </div>

                  {/* Right Team Sprites */}
                  <div className="absolute left-[calc(50%+40px)] flex gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-12 h-20 bg-brand-secondary rounded-t-full border-4 border-brand-text flex flex-col items-center justify-end pb-2">
                        <div className="w-8 h-8 bg-white border-2 border-brand-text rounded-full mb-1" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Win/Loss Indicators */}
              <div className="absolute inset-x-0 -bottom-12 flex justify-between px-12 font-black uppercase tracking-widest text-xs text-brand-muted">
                <span>{teamNames.left} жағы</span>
                <span>{teamNames.right} жағы</span>
              </div>
            </div>

            <Keypad side="right" player={p2} />
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
                <p className={cn(
                  "text-3xl font-black uppercase tracking-widest",
                  winner === 'left' ? "text-brand-primary" : "text-brand-secondary"
                )}>
                  {winner === 'left' ? teamNames.left : teamNames.right}
                </p>
                <p className="text-brand-muted font-bold">Командасы жеңіске жетті!</p>
              </div>
              <button
                onClick={() => setGameState('menu')}
                className="btn-primary w-full py-4 text-xl"
              >
                <RotateCcw /> Қайта ойнау
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
