import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Users, Shuffle, Star, Trophy,
  RotateCcw, User, CheckCircle2,
  Battery, BatteryMedium, BatteryLow, BatteryFull,
  Plus, Minus, Trash2, LayoutGrid
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import confetti from 'canvas-confetti';
import { translations, Language } from '../lib/translations';

interface Student {
  id: string;
  name: string;
  score: number;
}

interface StudentAssessmentProps {
  onBack: () => void;
  lang: Language;
}

export default function StudentAssessment({ onBack, lang }: StudentAssessmentProps) {
  const [view, setView] = useState<'setup' | 'main' | 'grading' | 'groups'>('setup');
  const [studentInput, setStudentInput] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [maxScore, setMaxScore] = useState(10);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Student[][]>([]);
  const [groupCount, setGroupCount] = useState(2);
  const [isAnimating, setIsAnimating] = useState(false);
  const t = translations[lang].tools.assessment;
  const common = translations[lang].reflection;

  const handleStart = () => {
    const names = studentInput
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) return;

    const newStudents = names.map((name, index) => ({
      id: `student-${index}-${Date.now()}`,
      name,
      score: 0
    }));

    setStudents(newStudents);
    setView('main');
  };

  const pickRandom = () => {
    if (students.length === 0) return;
    setIsAnimating(true);

    let counter = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * students.length);
      setSelectedStudentId(students[randomIndex].id);
      counter++;
      if (counter > 20) {
        clearInterval(interval);
        setIsAnimating(false);
        setView('grading');
      }
    }, 100);
  };

  const splitIntoGroups = () => {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const newGroups: Student[][] = Array.from({ length: groupCount }, () => []);

    shuffled.forEach((student, index) => {
      newGroups[index % groupCount].push(student);
    });

    setGroups(newGroups);
    setView('groups');
  };

  const handleGrade = (studentId: string, grade: number) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, score: grade } : s
    ));

    // Trigger "charging" animation effect
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.8 },
      colors: ['#22c55e', '#10b981']
    });

    setTimeout(() => {
      setView('main');
      setSelectedStudentId(null);
    }, 1500);
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="min-h-screen bg-brand-bg/20 flex flex-col">
      {/* Header */}
      <div className="p-6 flex justify-between items-center bg-white border-b border-zinc-100">
        <button onClick={onBack} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
          <X size={18} /> {common.back}
        </button>
        <div className="badge-modern bg-brand-primary text-white px-6 py-2">
          {t.title}
        </div>
        <div className="flex gap-4">
          <div className="card-modern bg-white px-4 py-2 font-black text-sm text-brand-text">
            {lang === 'kz' ? 'Оқушы саны' : lang === 'ru' ? 'Кол-во учеников' : 'Students count'}: {students.length}
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {view === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8 pt-12"
            >
              <div className="card-modern bg-white p-10 space-y-8">
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-black text-brand-text">{t.studentName}</h2>
                  <p className="text-brand-muted font-medium">{lang === 'kz' ? 'Әр оқушыны жаңа жолға жазыңыз' : lang === 'ru' ? 'Введите каждое имя с новой строки' : 'Enter each name on a new line'}</p>
                </div>

                <textarea
                  value={studentInput}
                  onChange={(e) => setStudentInput(e.target.value)}
                  placeholder={lang === 'kz' ? 'Мәселен:\nӘлихан\nАружан\nБекет' : lang === 'ru' ? 'Например:\nАлихан\nАружан\nБекет' : 'Example:\nAlikhan\nAruzhan\nBeket'}
                  className="w-full h-64 bg-brand-bg/30 border border-zinc-100 rounded-2xl p-6 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all resize-none"
                />

                <div className="flex items-center justify-between p-4 bg-brand-bg/50 rounded-2xl">
                  <span className="font-black text-brand-text uppercase tracking-widest text-xs">{t.maxScore}:</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setMaxScore(Math.max(1, maxScore - 1))} className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center hover:bg-zinc-50">
                      <Minus size={18} />
                    </button>
                    <input
                      type="number"
                      value={maxScore}
                      onChange={(e) => setMaxScore(Math.max(1, parseInt(e.target.value) || 1))}
                      className="text-2xl font-black text-brand-primary w-16 text-center bg-white border border-zinc-100 rounded-xl py-1 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                    <button onClick={() => setMaxScore(maxScore + 1)} className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center hover:bg-zinc-50">
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleStart}
                  disabled={!studentInput.trim()}
                  className="w-full btn-primary py-4 text-xl"
                >
                  {lang === 'kz' ? 'Бастау' : lang === 'ru' ? 'Начать' : 'Start'}
                </button>
              </div>
            </motion.div>
          )}

          {view === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={pickRandom}
                  className="card-modern bg-brand-primary text-white p-8 flex flex-col items-center gap-4 hover:scale-105 transition-all group"
                >
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <Shuffle size={32} />
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black uppercase tracking-tight">Кездейсоқ таңдау</div>
                    <div className="text-white/70 font-medium text-sm">Сұрақ қою үшін</div>
                  </div>
                </button>

                <div className="card-modern bg-white p-8 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-brand-bg rounded-2xl flex items-center justify-center text-brand-primary">
                    <LayoutGrid size={32} />
                  </div>
                  <div className="text-center w-full space-y-4">
                    <div className="text-xl font-black uppercase tracking-tight text-brand-text">Топқа бөлу</div>
                    <div className="flex items-center justify-center gap-4">
                      <button onClick={() => setGroupCount(Math.max(2, groupCount - 1))} className="w-8 h-8 rounded-lg bg-brand-bg flex items-center justify-center">
                        <Minus size={14} />
                      </button>
                      <span className="font-black text-brand-primary">{groupCount} топ</span>
                      <button onClick={() => setGroupCount(groupCount + 1)} className="w-8 h-8 rounded-lg bg-brand-bg flex items-center justify-center">
                        <Plus size={14} />
                      </button>
                    </div>
                    <button onClick={splitIntoGroups} className="w-full btn-secondary py-2 text-sm">Бөлу</button>
                  </div>
                </div>

                <div className="card-modern bg-white p-8 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-brand-bg rounded-2xl flex items-center justify-center text-brand-primary">
                    <Trophy size={32} />
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black uppercase tracking-tight text-brand-text">Үздік оқушы</div>
                    <div className="text-brand-muted font-medium text-sm">
                      {students.length > 0 ? [...students].sort((a, b) => b.score - a.score)[0].name : '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-modern bg-white p-8 space-y-6">
                <h3 className="text-2xl font-black text-brand-text flex items-center gap-3">
                  <Users className="text-brand-primary" /> Оқушылар тізімі
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {students.map(student => (
                    <div
                      key={student.id}
                      onClick={() => {
                        setSelectedStudentId(student.id);
                        setView('grading');
                      }}
                      className="p-4 bg-brand-bg/30 border border-zinc-100 rounded-2xl flex items-center justify-between hover:border-brand-primary/30 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary font-black">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-brand-text">{student.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-brand-primary">{student.score}/{maxScore}</span>
                        <div className="w-12 h-1.5 bg-zinc-200 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-brand-primary transition-all duration-500"
                            style={{ width: `${(student.score / maxScore) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'grading' && selectedStudent && (
            <motion.div
              key="grading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto pt-12"
            >
              <div className="card-modern bg-[#1a1f3c] p-10 text-white space-y-10 relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/20 blur-[100px] -z-10" />

                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-brand-primary to-blue-600 rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl shadow-brand-primary/40">
                    {selectedStudent.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tight">{selectedStudent.name}</h2>
                    <p className="text-blue-200/60 font-bold">Ағымдағы балл: {selectedStudent.score}/{maxScore}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-blue-200/60 font-black uppercase tracking-widest text-xs">Үлгерім деңгейі</span>
                    <span className="text-2xl font-black text-brand-primary">
                      {Math.round((selectedStudent.score / maxScore) * 100)}%
                    </span>
                  </div>
                  <div className="h-12 bg-white/5 rounded-2xl p-1.5 border border-white/10 relative overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(selectedStudent.score / maxScore) * 100}%` }}
                      className="h-full bg-gradient-to-r from-brand-primary to-blue-400 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    />
                    {/* Battery/Charging Animation Overlay */}
                    <AnimatePresence>
                      {isAnimating && (
                        <motion.div
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {Array.from({ length: maxScore }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => handleGrade(selectedStudent.id, num)}
                      className={cn(
                        "h-16 rounded-2xl font-black text-xl transition-all active:scale-90 border-2",
                        selectedStudent.score === num
                          ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20"
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setView('main')}
                  className="w-full py-4 text-blue-200/40 font-bold hover:text-white transition-colors"
                >
                  Болдырмау
                </button>
              </div>
            </motion.div>
          )}

          {view === 'groups' && (
            <motion.div
              key="groups"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-brand-text">Топтар тізімі</h2>
                <button onClick={splitIntoGroups} className="btn-secondary flex items-center gap-2">
                  <RotateCcw size={18} /> Қайта бөлу
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {groups.map((group, idx) => (
                  <div key={idx} className="card-modern bg-white p-8 space-y-6 border-t-8 border-brand-primary">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-black text-brand-text uppercase tracking-tight">Топ {idx + 1}</h3>
                      <span className="badge-modern bg-brand-bg text-brand-primary">{group.length} оқушы</span>
                    </div>
                    <div className="space-y-3">
                      {group.map(student => (
                        <div key={student.id} className="p-3 bg-brand-bg/30 rounded-xl font-bold text-brand-text flex items-center gap-3">
                          <User size={16} className="text-brand-primary" />
                          {student.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setView('main')}
                className="w-full btn-primary py-4"
              >
                Оқушылар тізіміне қайту
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
