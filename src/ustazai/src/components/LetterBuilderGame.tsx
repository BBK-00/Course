import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, RefreshCw, Hand, Camera as CameraIcon, AlertCircle } from 'lucide-react';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { cn } from '@/src/lib/utils';
import { Question } from '../services/gemini';

interface LetterBuilderGameProps {
  questions: Question[];
  onBack: () => void;
}

interface Letter {
  id: string;
  char: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  isPlaced: boolean;
}

interface Slot {
  char: string;
  x: number;
  y: number;
  w: number;
  h: number;
  filledLetterId: string | null;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  decay: number;
  size: number;
}

export default function LetterBuilderGame({ questions, onBack }: LetterBuilderGameProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);

  const [currentLevel, setCurrentLevel] = useState(0);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPinching, setIsPinching] = useState(false);
  const [grabbedLetterId, setGrabbedLetterId] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showWinMessage, setShowWinMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[currentLevel];
  const colors = ['#FF4D94', '#FFD600', '#00E676', '#2979FF', '#D500F9', '#FF9100', '#00B0FF'];

  // Initialize Level
  useEffect(() => {
    if (!currentQuestion) return;

    const word = currentQuestion.answer.toUpperCase();
    const wordArr = word.split('');
    const shuffledChars = [...wordArr].sort(() => Math.random() - 0.5);

    const isMobile = window.innerWidth < 768;
    const dynW = isMobile ? Math.max(45, window.innerWidth * 0.12) : 70;
    const dynH = isMobile ? Math.max(55, window.innerWidth * 0.15) : 85;

    // Create Slots (initial positions will be updated by ref)
    const newSlots: Slot[] = wordArr.map(char => ({
      char,
      x: 0, y: 0, w: dynW, h: dynH,
      filledLetterId: null
    }));
    setSlots(newSlots);

    // Create Letters
    const spacing = Math.min(dynW + 20, window.innerWidth / (wordArr.length + 1));
    const totalWidth = (wordArr.length - 1) * spacing;
    const startX = (window.innerWidth - totalWidth) / 2;
    const startY = window.innerHeight - (dynH * 2);

    const newLetters: Letter[] = shuffledChars.map((char, index) => ({
      id: `letter-${index}-${Date.now()}`,
      char,
      x: startX + index * spacing + (Math.random() * 10 - 5),
      y: startY + (Math.random() * 20 - 10),
      w: dynW,
      h: dynH,
      color: colors[index % colors.length],
      isPlaced: false
    }));
    setLetters(newLetters);
    setShowWinMessage(false);
    setGrabbedLetterId(null);
  }, [currentLevel, questions]);

  // Update slot positions from DOM
  useEffect(() => {
    const updateSlots = () => {
      if (!slotsRef.current) return;
      const slotElements = slotsRef.current.querySelectorAll('.letter-slot');
      setSlots(prev => prev.map((slot, i) => {
        const el = slotElements[i];
        if (!el) return slot;
        const rect = el.getBoundingClientRect();
        return { ...slot, x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      }));
    };

    updateSlots();
    window.addEventListener('resize', updateSlots);
    return () => window.removeEventListener('resize', updateSlots);
  }, [letters]);

  // MediaPipe Hands Setup
  useEffect(() => {
    if (!videoRef.current) return;
    let closed = false;

    const hands = new Hands({
      locateFile: (file) => import.meta.env.BASE_URL + 'models/hands/' + file,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      if (closed) return;
      setIsCameraReady(true);
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        const x = (1 - indexTip.x) * window.innerWidth;
        const y = indexTip.y * window.innerHeight;
        setCursor({ x, y });

        const dist = Math.sqrt(
          Math.pow(indexTip.x - thumbTip.x, 2) +
          Math.pow(indexTip.y - thumbTip.y, 2)
        );

        const pinching = dist < 0.08;
        setIsPinching(pinching);
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (!closed && videoRef.current) {
          try { await hands.send({ image: videoRef.current }); }
          catch { if (!closed) setError("Қол қимылын анықтау моделін іске қосу мүмкін болмады."); }
        }
      },
      width: 640,
      height: 480,
    });

    camera.start().then(() => { if (closed) camera.stop(); })
      .catch(() => { if (!closed) setError("Камераны іске қосу мүмкін болмады. Камераға рұқсатты тексеріңіз."); });

    return () => {
      closed = true;
      camera.stop();
      void hands.close().catch(() => {});
    };
  }, []);

  // Game Logic: Dragging
  useEffect(() => {
    if (isPinching) {
      if (!grabbedLetterId) {
        // Try to grab a letter
        const letterToGrab = [...letters].reverse().find(l =>
          !l.isPlaced &&
          Math.abs(cursor.x - l.x) < l.w/2 + 20 &&
          Math.abs(cursor.y - l.y) < l.h/2 + 20
        );
        if (letterToGrab) {
          setGrabbedLetterId(letterToGrab.id);
        }
      } else {
        // Move grabbed letter
        setLetters(prev => prev.map(l =>
          l.id === grabbedLetterId ? { ...l, x: cursor.x, y: cursor.y } : l
        ));
      }
    } else if (grabbedLetterId) {
      // Release letter - check for snap
      const letter = letters.find(l => l.id === grabbedLetterId);
      if (letter) {
        let snapped = false;
        const snapThreshold = 80;

        const updatedSlots = [...slots];
        for (let i = 0; i < updatedSlots.length; i++) {
          const slot = updatedSlots[i];
          if (!slot.filledLetterId && slot.char === letter.char) {
            const dX = Math.abs(letter.x - (slot.x + slot.w/2));
            const dY = Math.abs(letter.y - (slot.y + slot.h/2));

            if (dX < snapThreshold && dY < snapThreshold) {
              setLetters(prev => prev.map(l =>
                l.id === grabbedLetterId ? { ...l, isPlaced: true, x: slot.x + slot.w/2, y: slot.y + slot.h/2 } : l
              ));
              updatedSlots[i].filledLetterId = letter.id;
              snapped = true;
              createFireworks(slot.x + slot.w/2, slot.y + slot.h/2);
              break;
            }
          }
        }
        setSlots(updatedSlots);
      }
      setGrabbedLetterId(null);
    }
  }, [isPinching, cursor, grabbedLetterId]);

  // Check Win Condition
  useEffect(() => {
    if (slots.length > 0 && slots.every(s => s.filledLetterId !== null)) {
      setTimeout(() => setShowWinMessage(true), 500);
    }
  }, [slots]);

  // Particles Animation
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.4,
          life: p.life - p.decay
        }))
        .filter(p => p.life > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [particles]);

  const createFireworks = (x: number, y: number) => {
    const newParticles: Particle[] = [];
    const colors = ['#FFD600', '#2979FF', '#00E676', '#FF4D94', '#D500F9'];
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: Math.random(),
        x, y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15 - 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: Math.random() * 0.03 + 0.015,
        size: Math.random() * 5 + 3
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const nextLevel = () => {
    if (currentLevel < questions.length - 1) {
      setCurrentLevel(prev => prev + 1);
    } else {
      onBack();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#FDFCF8] overflow-hidden font-sans select-none touch-none">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* UI Layer */}
      <div className="relative z-20 h-full flex flex-col items-center p-4 md:p-8">
        {/* Header */}
        <div className="w-full max-w-7xl flex justify-between items-center mb-8">
          <button onClick={onBack} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
            <X size={18} /> Артқа
          </button>
          <div className="badge-modern bg-brand-primary text-white px-6 py-2">
            Әріп Құрастыру
          </div>
          <div className="card-modern bg-white px-4 py-2 font-black text-sm text-brand-text">
            Деңгей: {currentLevel + 1} / {questions.length}
          </div>
        </div>

        {/* Question Card */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="card-modern p-6 md:p-8 max-w-2xl w-full text-center space-y-4 mb-8 bg-white border-b-8 border-brand-primary"
        >
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-brand-text">{currentQuestion?.text}</h2>
          {currentQuestion?.hint && (
            <p className="text-brand-muted font-medium italic">Көмек: {currentQuestion.hint}</p>
          )}
        </motion.div>

        {/* Slots Container */}
        <div ref={slotsRef} className="flex flex-wrap justify-center gap-4 mb-12">
          {slots.map((slot, i) => (
            <div
              key={i}
              className={cn(
                "letter-slot w-[70px] h-[85px] md:w-[80px] md:h-[95px] border-4 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center transition-all duration-300",
                slot.filledLetterId && "border-solid border-brand-primary bg-brand-primary/10 shadow-xl"
              )}
            >
              {/* Slot is empty, letters will be drawn on canvas or as absolute elements */}
            </div>
          ))}
        </div>

        {/* Camera Preview (Larger) */}
        <div className="fixed top-24 right-8 w-64 md:w-80 aspect-video bg-black border border-zinc-200 rounded-2xl overflow-hidden shadow-2xl z-50">
          <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay playsInline muted />
          {!isCameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-4 text-center">
              <RefreshCw className="animate-spin mb-2" />
              <span className="text-xs font-black uppercase">Камера жүктелуде...</span>
            </div>
          )}
        </div>

        {/* Letters Layer */}
        <div className="absolute inset-0 pointer-events-none">
          {letters.map((letter) => (
            <motion.div
              key={letter.id}
              initial={false}
              animate={{
                x: letter.x - letter.w/2,
                y: letter.y - letter.h/2,
                scale: grabbedLetterId === letter.id ? 1.1 : 1,
                rotate: grabbedLetterId === letter.id ? 5 : 0
              }}
              className={cn(
                "absolute pointer-events-auto cursor-grab active:cursor-grabbing",
                "flex items-center justify-center rounded-2xl border-2 border-white font-black text-3xl text-white shadow-xl",
                grabbedLetterId === letter.id && "z-50 shadow-2xl"
              )}
              style={{
                width: letter.w,
                height: letter.h,
                backgroundColor: letter.color,
                display: letter.isPlaced && grabbedLetterId !== letter.id ? 'flex' : (grabbedLetterId === letter.id ? 'flex' : (letter.isPlaced ? 'none' : 'flex'))
              }}
            >
              {letter.char}
            </motion.div>
          ))}
        </div>

        {/* Particles Layer */}
        <div className="absolute inset-0 pointer-events-none">
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.life,
                boxShadow: `0 0 10px ${p.color}`
              }}
            />
          ))}
        </div>

        {/* Cursor / Hand Indicator */}
        {!grabbedLetterId && (
          <motion.div
            animate={{ x: cursor.x - 20, y: cursor.y - 20 }}
            className={cn(
              "fixed w-10 h-10 border-4 rounded-full pointer-events-none z-[100] flex items-center justify-center transition-colors",
              isPinching ? "border-brand-primary bg-brand-primary/30 scale-75" : "border-brand-primary/50 bg-brand-primary/10"
            )}
          >
            <Hand size={20} className={isPinching ? "text-brand-text" : "text-brand-primary"} />
          </motion.div>
        )}

        {/* Win Message */}
        <AnimatePresence>
          {showWinMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-brand-text/40 backdrop-blur-sm"
            >
              <div className="card-modern p-12 max-w-lg w-full text-center space-y-8 bg-white">
                <div className="w-24 h-24 bg-brand-primary border-4 border-white rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <Trophy size={48} className="text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-4xl font-black uppercase tracking-tight text-brand-text">Керемет!</h3>
                  <p className="text-xl font-bold text-brand-muted">Сіз сөзді дұрыс құрастырдыңыз:</p>
                  <p className="text-3xl font-black text-brand-primary uppercase tracking-widest">{currentQuestion.answer}</p>
                </div>
                <button
                  onClick={nextLevel}
                  className="btn-primary w-full py-4 text-xl"
                >
                  {currentLevel < questions.length - 1 ? 'Келесі деңгей' : 'Ойынды аяқтау'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        {error && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 card-modern bg-red-500 text-white px-6 py-3 flex items-center gap-3 z-[100]">
            <AlertCircle size={20} />
            <span className="font-bold">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
