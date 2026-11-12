import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, HelpCircle, AlertCircle, CheckCircle2, RotateCcw, TrendingUp } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import confetti from 'canvas-confetti';
import { translations, Language } from '../lib/translations';

interface ReflectionToolProps {
  onBack: () => void;
  lang: Language;
}

type ReflectionType = 'understood' | 'question' | 'confused';
type ReflectionView = 'selection' | 'modern' | 'tree';

export default function ReflectionTool({ onBack, lang }: ReflectionToolProps) {
  const [view, setView] = useState<ReflectionView>('selection');
  const t = translations[lang].reflection;
  const [votes, setVotes] = useState<Record<ReflectionType, number>>({
    understood: 0,
    question: 0,
    confused: 0
  });
  const [lastVote, setLastVote] = useState<ReflectionType | null>(null);

  useEffect(() => {
    const savedVotes = localStorage.getItem('bilimai_reflection_votes');
    if (savedVotes) {
      setVotes(JSON.parse(savedVotes));
    }
  }, []);

  const totalVotes = votes.understood + votes.question + votes.confused;

  const handleVote = (type: ReflectionType) => {
    const newVotes = { ...votes, [type]: votes[type] + 1 };
    setVotes(newVotes);
    setLastVote(type);
    localStorage.setItem('bilimai_reflection_votes', JSON.stringify(newVotes));

    if (type === 'understood') {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#4ade80', '#facc15']
      });
    }

    setTimeout(() => setLastVote(null), 800);
  };

  const resetVotes = () => {
    const initialVotes = { understood: 0, question: 0, confused: 0 };
    setVotes(initialVotes);
    localStorage.setItem('bilimai_reflection_votes', JSON.stringify(initialVotes));
  };

  const getPercentage = (count: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((count / totalVotes) * 100);
  };

  if (view === 'selection') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-5xl font-black text-brand-text tracking-tight">{t.selectTitle}</h2>
          <p className="text-brand-muted text-lg font-medium">{t.selectSub}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <button
            onClick={() => setView('modern')}
            className="card-modern bg-white p-10 flex flex-col items-center gap-6 hover:scale-105 transition-all text-center group"
          >
            <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary group-hover:rotate-6 transition-transform">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-brand-text">{t.classic}</h3>
              <p className="text-brand-muted font-medium">{t.classicSub}</p>
            </div>
          </button>

          <button
            onClick={() => setView('tree')}
            className="card-modern bg-white p-10 flex flex-col items-center gap-6 hover:scale-105 transition-all text-center group"
          >
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-600 group-hover:rotate-6 transition-transform">
              <TrendingUp size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-brand-text">{t.tree}</h3>
              <p className="text-brand-muted font-medium">{t.treeSub}</p>
            </div>
          </button>
        </div>

        <button onClick={onBack} className="btn-secondary px-12 py-4">{t.back}</button>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col relative overflow-hidden font-sans",
      view === 'tree' ? "bg-[#F0FDF4]" : "bg-[#F8FAFC]"
    )}>
      {/* Background Decoration */}
      {view === 'tree' ? (
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-yellow-200/40 blur-[120px] rounded-full" />
      ) : (
        <div className="absolute top-0 left-0 w-full h-64 bg-brand-primary/5 -skew-y-3 -translate-y-32" />
      )}

      {/* Header */}
      <div className="relative z-20 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <button onClick={() => setView('selection')} className="w-12 h-12 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center hover:bg-zinc-50 shadow-sm transition-all">
          <X className="w-6 h-6 text-brand-text" />
        </button>

        <div className="flex items-center gap-4">
          <div className="bg-white border border-zinc-100 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", view === 'tree' ? "bg-emerald-500" : "bg-brand-primary")} />
            <span className="font-black text-xs uppercase tracking-widest text-brand-text">
              {view === 'tree' ? t.tree : translations[lang].games.reflection.title}
            </span>
          </div>
          <button
            onClick={resetVotes}
            className="w-12 h-12 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 shadow-sm transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-7xl mx-auto w-full">
        {view === 'tree' ? (
          <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-12 lg:gap-24">
            {/* Tree Visualization */}
            <div className="relative w-full max-w-md aspect-[3/4] flex items-end justify-center">
              <svg viewBox="0 0 400 500" className="w-full h-full drop-shadow-2xl">
                <path d="M180 500 L220 500 L210 350 L190 350 Z" fill="#78350f" />
                <motion.path
                  animate={lastVote === 'confused' ? { scale: [1, 1.05, 1] } : {}}
                  d="M50 400 Q200 320 350 400 Q380 430 350 460 L50 460 Q20 430 50 400"
                  fill="#ef4444"
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleVote('confused')}
                />
                <motion.path
                  animate={lastVote === 'question' ? { scale: [1, 1.05, 1] } : {}}
                  d="M80 280 Q200 200 320 280 Q350 320 320 360 L80 360 Q50 320 80 280"
                  fill="#f59e0b"
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleVote('question')}
                />
                <motion.path
                  animate={lastVote === 'understood' ? { scale: [1, 1.05, 1] } : {}}
                  d="M120 120 Q200 40 280 120 Q310 180 280 240 L120 240 Q90 180 120 120"
                  fill="#22c55e"
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleVote('understood')}
                />
                <text x="200" y="150" textAnchor="middle" fill="white" className="font-black text-xl pointer-events-none select-none">{t.high}</text>
                <text x="200" y="295" textAnchor="middle" fill="white" className="font-black text-xl pointer-events-none select-none">{t.middle}</text>
                <text x="200" y="435" textAnchor="middle" fill="white" className="font-black text-xl pointer-events-none select-none">{t.low}</text>
              </svg>
            </div>

            {/* Tree Stats */}
            <div className="flex-1 space-y-8 w-full max-w-xl">
              <div className="space-y-4">
                <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-emerald-950 leading-tight">{t.tree}</h2>
                <p className="text-emerald-800/60 text-lg font-medium">{t.treeSub}</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <VoteRow label={`${t.high} — ${t.understood.sub}`} count={votes.understood} color="bg-emerald-500" icon={<TrendingUp className="text-emerald-500" />} onClick={() => handleVote('understood')} isLast={lastVote === 'understood'} />
                <VoteRow label={`${t.middle} — ${t.questions.sub}`} count={votes.question} color="bg-amber-500" icon={<TrendingUp className="text-amber-500 rotate-45" />} onClick={() => handleVote('question')} isLast={lastVote === 'question'} />
                <VoteRow label={`${t.low} — ${t.difficult.sub}`} count={votes.confused} color="bg-red-500" icon={<TrendingUp className="text-red-500 rotate-90" />} onClick={() => handleVote('confused')} isLast={lastVote === 'confused'} />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-16">
            <div className="text-center space-y-6">
              <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-7xl font-black tracking-tighter text-brand-text">
                {t.todayLesson} <br /> <span className="text-brand-primary">{t.howWas}</span>
              </motion.h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              <ReflectionCard title={t.understood.title} subtitle={t.understood.sub} count={votes.understood} percentage={getPercentage(votes.understood)} isAnimating={lastVote === 'understood'} onClick={() => handleVote('understood')} icon={<CheckCircle2 className="w-10 h-10" />} color="emerald" voteLabel={t.vote} lang={lang} />
              <ReflectionCard title={t.questions.title} subtitle={t.questions.sub} count={votes.question} percentage={getPercentage(votes.question)} isAnimating={lastVote === 'question'} onClick={() => handleVote('question')} icon={<HelpCircle className="w-10 h-10" />} color="amber" voteLabel={t.vote} lang={lang} />
              <ReflectionCard title={t.difficult.title} subtitle={t.difficult.sub} count={votes.confused} percentage={getPercentage(votes.confused)} isAnimating={lastVote === 'confused'} onClick={() => handleVote('confused')} icon={<AlertCircle className="w-10 h-10" />} color="rose" voteLabel={t.vote} lang={lang} />
            </div>
          </div>
        )}

        {/* Global Distribution Bar */}
        <div className="w-full max-w-4xl space-y-4 mt-16">
          <div className="flex justify-between items-end px-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-primary" />
              <span className="text-xs font-black text-brand-muted uppercase tracking-widest">{t.overallResult}</span>
            </div>
            <span className="text-sm font-black text-brand-text">{totalVotes} {t.votes}</span>
          </div>
          <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden flex shadow-inner">
            <motion.div animate={{ width: `${getPercentage(votes.understood)}%` }} className="h-full bg-emerald-500" />
            <motion.div animate={{ width: `${getPercentage(votes.question)}%` }} className="h-full bg-amber-500" />
            <motion.div animate={{ width: `${getPercentage(votes.confused)}%` }} className="h-full bg-rose-500" />
          </div>
        </div>
      </main>

      <footer className="p-12 text-center">
        <p className="text-brand-muted font-bold text-[10px] uppercase tracking-[0.3em]">UstazAI • {t.toolName}</p>
      </footer>
    </div>
  );
}

function VoteRow({ label, count, color, icon, onClick, isLast }: {
  label: string,
  count: number,
  color: string,
  icon: React.ReactNode,
  onClick: () => void,
  isLast: boolean
}) {
  return (
    <motion.button
      whileHover={{ x: 10 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center justify-between p-6 bg-white border border-emerald-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50", isLast && "animate-bounce")}>
          {icon}
        </div>
        <span className="font-black text-emerald-950 text-left">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <motion.span
          key={count}
          animate={isLast ? { scale: [1, 1.5, 1] } : {}}
          className="text-3xl font-black text-emerald-950"
        >
          {count}
        </motion.span>
        <div className={cn("w-3 h-3 rounded-full", color)} />
      </div>
    </motion.button>
  );
}

function ReflectionCard({
  title,
  subtitle,
  count,
  percentage,
  onClick,
  icon,
  color,
  isAnimating,
  voteLabel,
  lang
}: {
  title: string,
  subtitle: string,
  count: number,
  percentage: number,
  onClick: () => void,
  icon: React.ReactNode,
  color: 'emerald' | 'amber' | 'rose',
  isAnimating: boolean,
  voteLabel: string,
  lang: Language
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white shadow-emerald-500/10",
    amber: "bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-500 hover:bg-amber-500 hover:text-white shadow-amber-500/10",
    rose: "bg-rose-50 text-rose-600 border-rose-100 hover:border-rose-500 hover:bg-rose-500 hover:text-white shadow-rose-500/10"
  };

  const iconColors = {
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    rose: "bg-rose-500/10 text-rose-600"
  };

  return (
    <motion.button
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "card-modern bg-white p-10 flex flex-col items-center text-center space-y-8 group relative overflow-hidden border-2 transition-all duration-300",
        isAnimating && "scale-105"
      )}
    >
      <div className={cn(
        "w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
        iconColors[color]
      )}>
        {icon}
      </div>

      <div className="space-y-2">
        <h3 className="text-3xl font-black text-brand-text tracking-tight">{title}</h3>
        <p className="text-brand-muted font-bold text-sm uppercase tracking-widest">{subtitle}</p>
      </div>

      <div className="w-full space-y-4">
        <div className={cn(
          "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 border-2",
          colors[color]
        )}>
          {voteLabel}
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{translations[lang].reflection.votesCount}</span>
            <motion.span
              key={count}
              animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
              className="text-2xl font-black text-brand-text"
            >
              {count}
            </motion.span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{translations[lang].reflection.share}</span>
            <div className="text-2xl font-black text-brand-primary">{percentage}%</div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
