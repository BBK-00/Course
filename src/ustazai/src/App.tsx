import React, { lazy, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Upload, Sparkles, BrainCircuit, Play,
  Rocket, Camera, Gamepad2, Presentation, Wrench, Trophy, User,
  Instagram, Youtube, Send, MessageCircle,
  ChevronRight, LayoutDashboard, Star, Info, Users,
  Menu, X, Zap, Heart, BookOpen, Hand, Brain, Palette, Shuffle, Clock, Type
} from 'lucide-react';
import { generateQuestions, Question } from './services/gemini';
import TugOfWarGame from './components/TugOfWarGame';
import SackRaceGame from './components/SackRaceGame';
import MemoryGame from './components/MemoryGame';
import ColorMatchGame from './components/ColorMatchGame';
import GroupSplitter from './components/GroupSplitter';
import RandomPicker from './components/RandomPicker';
import LessonTimer from './components/LessonTimer';
import HangmanGame from './components/HangmanGame';
import StudentAssessment from './components/StudentAssessment';
import ReflectionTool from './components/ReflectionTool';
import AuthModal from './components/AuthModal';
import { AccountError, accountRequest, type Account } from './services/account';
import { cn } from './lib/utils';
import { translations, Language } from './lib/translations';

const CameraGame = lazy(() => import('./components/CameraGame'));
const LetterBuilderGame = lazy(() => import('./components/LetterBuilderGame'));
const AIPedagog = lazy(() => import('./components/AIPedagog'));
type AiTool = 'lessonPlan' | 'presentation' | 'quizGames';

type GameState = 'dashboard' | 'setup' | 'generating' | 'ready' | 'playing';
type GameType = 'camera' | 'tugofwar' | 'letterbuilder' | 'sackrace' | 'memory' | 'colormatch' | 'groupsplitter' | 'randompicker' | 'lessontimer' | 'hangman' | 'assessment' | 'reflection' | 'aipedagog';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('dashboard');
  const [selectedGame, setSelectedGame] = useState<GameType>('camera');
  const [material, setMaterial] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<Account | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [aiTool, setAiTool] = useState<AiTool>('lessonPlan');
  const [lang, setLang] = useState<Language>('kz');
  const generation = useRef(0);

  const t = translations[lang];
  useEffect(() => {
    let mounted = true;
    accountRequest<{ account: Account | null }>().then(({ account }) => {
      if (mounted) setUser(account);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === 'kz' ? 'kk' : lang;
  }, [lang]);
  useEffect(() => {
    if (gameState === 'setup' || gameState === 'playing') window.scrollTo(0, 0);
  }, [gameState]);
  const goHome = () => { generation.current++; setGameState('dashboard'); setMobileMenu(false); };
  const visitSection = (id: string) => {
    setMobileMenu(false);
    if (gameState === 'dashboard') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    else goHome();
  };
  const showLogin = () => setIsAuthModalOpen(true);
  const accountDialog = <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)}
    onLogin={account => { setUser(account); setError(null); }} />;
  const openAiTool = (tool: AiTool) => {
    setAiTool(tool);
    setSelectedGame('aipedagog');
    setGameState('playing');
  };

  const handleGenerate = async () => {
    if (!material.trim()) return;
    const ticket = ++generation.current;
    setGameState('generating');
    setError(null);
    try {
      const qs = await generateQuestions(material, lang, selectedGame);
      if (ticket !== generation.current) return;
      if (qs.length > 0) {
        setQuestions(qs);
        setGameState('ready');
      } else {
        throw new Error("Сұрақтар құрастырылмады. Қайта көріңіз.");
      }
    } catch (err) {
      if (ticket !== generation.current) return;
      setError(err instanceof Error ? err.message : "Қате орын алды");
      setGameState('setup');
      if (err instanceof AccountError && err.code === 'auth') showLogin();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 48000) { setError('Мәтіндік файл тым үлкен. 12 000 таңбаға дейін таңдаңыз.'); return; }

    const reader = new FileReader();
    reader.onload = (event) => {
      const value = String(event.target?.result || '');
      if (value.length > 12000) { setError('Сабақ мәтіні 12 000 таңбадан аспауы керек.'); return; }
      setMaterial(value);
      setError(null);
    };
    reader.onerror = () => setError('Файлды оқу мүмкін болмады.');
    reader.readAsText(file);
  };

  const startSetup = (game: GameType) => {
    generation.current++;
    setError(null);
    setSelectedGame(game);
    setGameState('setup');
  };

  if (gameState === 'playing') {
    if (selectedGame === 'camera') {
      return <CameraGame questions={questions} onBack={() => setGameState('ready')} />;
    } else if (selectedGame === 'tugofwar') {
      return <TugOfWarGame questions={questions} onBack={() => setGameState('ready')} />;
    } else if (selectedGame === 'letterbuilder') {
      return <LetterBuilderGame questions={questions} onBack={() => setGameState('ready')} />;
    } else if (selectedGame === 'sackrace') {
      return <SackRaceGame onBack={() => setGameState('dashboard')} />;
    } else if (selectedGame === 'memory') {
      return <MemoryGame onBack={() => setGameState('dashboard')} />;
    } else if (selectedGame === 'colormatch') {
      return <ColorMatchGame onBack={() => setGameState('dashboard')} />;
    } else if (selectedGame === 'groupsplitter') {
      return <GroupSplitter onBack={() => setGameState('dashboard')} lang={lang} />;
    } else if (selectedGame === 'randompicker') {
      return <RandomPicker onBack={() => setGameState('dashboard')} lang={lang} />;
    } else if (selectedGame === 'hangman') {
      return <HangmanGame questions={questions} onBack={() => setGameState('ready')} />;
    } else if (selectedGame === 'assessment') {
      return <StudentAssessment onBack={() => setGameState('dashboard')} lang={lang} />;
    } else if (selectedGame === 'reflection') {
      return <ReflectionTool onBack={() => setGameState('dashboard')} lang={lang} />;
    } else if (selectedGame === 'aipedagog') {
      return <><AIPedagog onBack={goHome} lang={lang} initialTool={aiTool} onAuthRequired={showLogin} />{accountDialog}</>;
    } else {
      return <LessonTimer onBack={() => setGameState('dashboard')} lang={lang} />;
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] font-sans selection:bg-brand-primary/20">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-100 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <button
            onClick={goHome}
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
              <Rocket className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-brand-text">
              Ustaz<span className="text-brand-primary">AI</span>
            </h1>
          </button>

          <div id="ustazai-nav" className={cn("order-last w-full flex-wrap items-center gap-4 md:order-none md:w-auto md:flex", mobileMenu ? "flex" : "hidden")}>
            <a className="text-sm font-bold text-brand-text hover:text-brand-primary" href="/tools/">
              {lang === 'kz' ? '← Көмекші құралдар' : lang === 'ru' ? '← Инструменты' : '← Learning tools'}
            </a>
            <div className="flex items-center gap-2 mr-4 border-r border-zinc-100 pr-4">
              {(['kz', 'ru', 'en'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest w-8 h-8 rounded-lg transition-all",
                    lang === l ? "bg-brand-primary text-white" : "bg-zinc-50 text-brand-muted hover:bg-zinc-100"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <NavLink label={t.nav.games} onClick={() => visitSection('games-grid')} />
            <NavLink label={t.nav.teachers} onClick={() => visitSection('teacher-tools')} />

            {user ? (
              <div className="flex items-center gap-4 pl-4 border-l border-zinc-100">
                <div className="text-right hidden lg:block">
                  <p className="text-xs font-black text-brand-text">{user.name}</p>
                  <p className="text-[10px] font-bold text-brand-muted">{user.email}</p>
                </div>
                <button
                  aria-label="Аккаунттан шығу"
                  onClick={async () => {
                    try { await accountRequest('/logout', {}); setUser(null); }
                    catch { setError('Шығу мүмкін болмады. Қайта көріңіз.'); }
                  }}
                  className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all border border-zinc-100"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={showLogin}
                className="px-6 py-2 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-primary-hover transition-all"
              >
                {t.nav.login}
              </button>
            )}
          </div>

          <button type="button" className="md:hidden p-2 text-brand-text" aria-label="Мәзір"
            aria-expanded={mobileMenu} aria-controls="ustazai-nav" onClick={() => setMobileMenu(!mobileMenu)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {accountDialog}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-gradient-to-b from-brand-bg/50 to-transparent -z-20 pointer-events-none" />

        <AnimatePresence mode="wait">
          {gameState === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-32"
            >
              {/* Hero Section */}
              <div className="relative flex flex-col items-center text-center space-y-10 max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-bg border border-brand-primary/20 rounded-full text-[11px] font-black uppercase tracking-widest text-brand-primary shadow-sm">
                  <span className="flex h-2 w-2 rounded-full bg-brand-primary animate-pulse" />
                  {t.hero.badge}
                </div>

                <h2 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-brand-text leading-[1.1]">
                  {t.hero.title1} <br />
                  <span className="text-brand-primary">{t.hero.title2}</span>
                </h2>

                <p className="text-xl font-medium text-brand-text/60 max-w-2xl leading-relaxed">
                  {t.hero.subtitle}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
                  <button
                    onClick={() => {
                      const el = document.getElementById('games-grid');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="btn-primary px-12 shadow-xl shadow-brand-primary/20"
                  >
                    <Gamepad2 size={20} />
                    {t.hero.startBtn}
                  </button>
                  <button className="btn-secondary px-12" onClick={() => visitSection('teacher-tools')}>
                    {t.hero.teacherBtn}
                  </button>
                </div>
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-16 border-y border-zinc-100 bg-white/50 backdrop-blur-sm rounded-[3rem]">
                <StatItem value="12+" label={t.stats.games} />
                <StatItem value="AI" label={t.stats.tech} />
                <StatItem value="FREE" label={t.stats.version} />
                <StatItem value={lang.toUpperCase()} label={t.stats.language} />
              </div>

              {/* Games Grid */}
              <div id="games-grid" className="space-y-20 md:space-y-32 scroll-mt-24">
                <section className="space-y-12">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-brand-text">
                      <Gamepad2 className="w-8 h-8" />
                      <h3 className="text-4xl font-black tracking-tight">{t.sections.interactive}</h3>
                    </div>
                    <p className="text-brand-muted font-medium">{t.sections.interactiveSub}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <GameCard
                      title={t.games.tugofwar.title}
                      description={t.games.tugofwar.desc}
                      icon={<Users className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => startSetup('tugofwar')}
                      badge="HIT"
                    />
                    <GameCard
                      title={t.games.camera.title}
                      description={t.games.camera.desc}
                      icon={<Camera className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => startSetup('camera')}
                      badge="NEW"
                    />
                    <GameCard
                      title={t.games.letterbuilder.title}
                      description={t.games.letterbuilder.desc}
                      icon={<Hand className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => startSetup('letterbuilder')}
                      badge="NEW"
                    />
                    <GameCard
                      title={t.games.sackrace.title}
                      description={t.games.sackrace.desc}
                      icon={<Zap className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => {
                        setSelectedGame('sackrace');
                        setGameState('playing');
                      }}
                      badge="NEW"
                    />
                    <GameCard
                      title={t.games.hangman.title}
                      description={t.games.hangman.desc}
                      icon={<Type className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => startSetup('hangman')}
                      badge="NEW"
                    />
                  </div>
                </section>

                <section className="space-y-12">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-brand-text">
                      <Brain className="w-8 h-8" />
                      <h3 className="text-4xl font-black tracking-tight">{t.sections.cognitive}</h3>
                    </div>
                    <p className="text-brand-muted font-medium">{t.sections.cognitiveSub}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <GameCard
                      title={t.games.memory.title}
                      description={t.games.memory.desc}
                      icon={<Brain className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => {
                        setSelectedGame('memory');
                        setGameState('playing');
                      }}
                      badge="NEW"
                    />
                    <GameCard
                      title={t.games.colormatch.title}
                      description={t.games.colormatch.desc}
                      icon={<Palette className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => {
                        setSelectedGame('colormatch');
                        setGameState('playing');
                      }}
                      badge="NEW"
                    />
                  </div>
                </section>

                <section className="space-y-12">
                  <div className="space-y-2">
                    <div id="teacher-tools" className="flex items-center gap-3 text-brand-text scroll-mt-24">
                      <Wrench className="w-8 h-8" />
                      <h3 className="text-4xl font-black tracking-tight">{t.sections.tools}</h3>
                    </div>
                    <p className="text-brand-muted font-medium">{t.sections.toolsSub}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <GameCard
                      title={t.games.groupsplitter.title}
                      description={t.games.groupsplitter.desc}
                      icon={<Users className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => {
                        setSelectedGame('groupsplitter');
                        setGameState('playing');
                      }}
                      badge="NEW"
                    />
                    <GameCard
                      title={t.games.randompicker.title}
                      description={t.games.randompicker.desc}
                      icon={<Shuffle className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => {
                        setSelectedGame('randompicker');
                        setGameState('playing');
                      }}
                      badge="NEW"
                    />
                    <GameCard
                      title={t.games.lessontimer.title}
                      description={t.games.lessontimer.desc}
                      icon={<Clock className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => {
                        setSelectedGame('lessontimer');
                        setGameState('playing');
                      }}
                      badge="NEW"
                    />
                    <GameCard
                      title={t.games.assessment.title}
                      description={t.games.assessment.desc}
                      icon={<Star className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => {
                        setSelectedGame('assessment');
                        setGameState('playing');
                      }}
                      badge="NEW"
                    />
                    <GameCard
                      title={t.games.reflection.title}
                      description={t.games.reflection.desc}
                      icon={<MessageCircle className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => {
                        setSelectedGame('reflection');
                        setGameState('playing');
                      }}
                      badge="NEW"
                    />
                  </div>
                </section>

                <section className="space-y-12">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-brand-text">
                      <BrainCircuit className="w-8 h-8" />
                      <h3 className="text-4xl font-black tracking-tight">{t.sections.aiPedagog}</h3>
                    </div>
                    <p className="text-brand-muted font-medium">{t.sections.aiPedagogSub}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <GameCard
                      title={t.games.lessonPlan.title}
                      description={t.games.lessonPlan.desc}
                      icon={<FileText className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => openAiTool('lessonPlan')}
                      badge="AI"
                    />
                    <GameCard
                      title={t.games.presentation.title}
                      description={t.games.presentation.desc}
                      icon={<Presentation className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => openAiTool('presentation')}
                      badge="AI"
                    />
                    <GameCard
                      title={t.games.quizGames.title}
                      description={t.games.quizGames.desc}
                      icon={<Gamepad2 className="w-8 h-8" />}
                      color="bg-brand-primary"
                      onClick={() => openAiTool('quizGames')}
                      badge="AI"
                    />
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {(gameState === 'setup' || gameState === 'generating' || gameState === 'ready') && (
            <motion.div
              key="game-flow"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              {/* Breadcrumbs */}
              <div className="flex items-center gap-4 mb-12">
                <button
                  onClick={goHome}
                  className="w-12 h-12 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center hover:bg-zinc-50 shadow-sm transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="bg-white border border-zinc-100 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
                  <div className="w-3 h-3 rounded-full bg-brand-primary" />
                  <span className="font-bold text-sm text-brand-text">
                    {t.games[selectedGame as keyof typeof t.games]?.title || t.setup.title}
                  </span>
                </div>
              </div>

              {gameState === 'setup' && (
                <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 md:p-12 space-y-12 shadow-xl shadow-brand-primary/5">
                  <div className="space-y-4">
                    <h2 className="text-5xl font-black tracking-tight text-brand-text">{t.setup.materialLabel}</h2>
                    <p className="text-brand-muted font-medium text-lg">{t.setup.materialPlaceholder}</p>
                  </div>

                  <div className="relative">
                    <textarea
                      value={material}
                      maxLength={12000}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder={t.setup.materialPlaceholder}
                      className="w-full h-80 bg-brand-bg/30 border border-zinc-100 rounded-[2rem] p-8 text-xl font-medium focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all resize-none"
                    />
                    <div className="absolute bottom-6 right-6 flex gap-3">
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.md" />
                        <div className="w-14 h-14 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md transition-all">
                          <Upload className="w-6 h-6 text-brand-primary" />
                        </div>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!material.trim()}
                    className="w-full btn-primary py-6 text-xl"
                  >
                    <BrainCircuit className="w-8 h-8" />
                    {t.setup.generateBtn}
                  </button>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-bold flex items-center gap-3">
                      <Info className="w-5 h-5" /> {error}
                    </div>
                  )}
                </div>
              )}

              {gameState === 'generating' && (
                <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-20 flex flex-col items-center justify-center space-y-10 text-center shadow-xl shadow-brand-primary/5">
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="w-32 h-32 border-8 border-brand-bg border-t-brand-primary rounded-full"
                    />
                    <Sparkles className="absolute inset-0 m-auto w-12 h-12 text-brand-primary animate-pulse" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-black text-brand-text">{t.setup.generating}</h3>
                    <p className="text-brand-muted text-lg font-medium">AI is analyzing the material...</p>
                  </div>
                </div>
              )}

              {gameState === 'ready' && (
                <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-12 space-y-12 text-center shadow-xl shadow-brand-primary/5">
                  <div className="w-24 h-24 bg-brand-bg rounded-full flex items-center justify-center mx-auto">
                    <Play className="w-12 h-12 text-brand-primary fill-current" />
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-5xl font-black text-brand-text">{t.setup.ready}</h2>
                    <p className="text-brand-muted text-xl font-medium">{questions.length} questions generated successfully.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {questions.slice(0, 4).map((q, i) => (
                      <div key={i} className="p-6 bg-brand-bg/30 border border-zinc-100 rounded-2xl text-sm font-bold flex gap-4 items-start">
                        <span className="w-6 h-6 bg-brand-primary text-white rounded flex items-center justify-center shrink-0 text-[10px]">
                          {i + 1}
                        </span>
                        <span className="truncate text-brand-text/80">{q.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 pt-6">
                    <button
                      onClick={() => setGameState('setup')}
                      className="flex-1 btn-secondary"
                    >
                      {t.footer.change}
                    </button>
                    <button
                      onClick={() => setGameState('playing')}
                      className="flex-[2] btn-primary"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      {t.setup.startBtn}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-100 p-12 md:p-20 mt-32">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-16">
          <div className="col-span-2 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                <Rocket className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-brand-text">Ustaz<span className="text-brand-primary">AI</span></h1>
            </div>
            <p className="text-brand-muted font-medium max-w-sm leading-relaxed">
              {t.footer.desc}
            </p>
          </div>

          <div className="space-y-8">
            <h4 className="font-black uppercase tracking-widest text-xs text-brand-text">{t.footer.platform}</h4>
            <ul className="space-y-4 font-bold text-brand-muted text-sm">
              <li><button onClick={() => visitSection('games-grid')} className="hover:text-brand-primary transition-colors">{t.footer.games}</button></li>
              <li><button onClick={() => visitSection('teacher-tools')} className="hover:text-brand-primary transition-colors">{t.footer.teachers}</button></li>
              <li><a href="/tools/" className="hover:text-brand-primary transition-colors">Оқу кеңістігі</a></li>
            </ul>
          </div>

        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-12 border-t border-zinc-100 text-center text-brand-muted font-bold text-xs tracking-widest uppercase">
          © 2024 UstazAI. Барлық құқықтар қорғалған.
        </div>
      </footer>
    </div>
  );
}

function NavLink({ label, active, onClick }: { label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-sm font-bold transition-all hover:text-brand-primary relative py-1",
        active ? "text-brand-primary" : "text-brand-text/60"
      )}
    >
      {label}
    </button>
  );
}

function StatItem({ value, label }: { value: string, label: string }) {
  return (
    <div className="flex flex-col items-center text-center space-y-2 px-4 border-r last:border-r-0 border-zinc-100">
      <div className="text-4xl font-black text-brand-primary">{value}</div>
      <div className="text-xs font-bold text-brand-muted uppercase tracking-widest">{label}</div>
    </div>
  );
}

function GameCard({ title, description, icon, color, onClick, disabled, badge }: {
  title: string,
  description: string,
  icon: React.ReactNode,
  color: string,
  onClick?: () => void,
  disabled?: boolean,
  badge?: string
}) {
  return (
    <motion.button
      whileHover={!disabled ? { y: -8, transition: { duration: 0.2 } } : {}}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "bg-white border border-zinc-100 rounded-[2.5rem] p-8 text-left flex flex-col h-full group relative overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300",
        disabled && "opacity-50 grayscale cursor-not-allowed shadow-none hover:translate-y-0"
      )}
    >
      {badge && (
        <div className={cn(
          "absolute top-6 right-6 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest z-10 border",
          badge === 'ХИТ' || badge === 'HIT'
            ? "bg-orange-50 text-orange-600 border-orange-100"
            : badge === 'AI'
              ? "bg-purple-50 text-purple-600 border-purple-100"
              : "bg-brand-bg text-brand-primary border-brand-primary/20"
        )}>
          {badge}
        </div>
      )}
      <div className={cn("w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-brand-primary mb-8 bg-brand-bg group-hover:scale-110 transition-transform duration-300")}>
        {icon}
      </div>

      <h3 className="text-2xl font-black mb-3 text-brand-text tracking-tight">{title}</h3>
      <p className="text-brand-muted font-medium text-sm leading-relaxed mb-8 flex-1">
        {description}
      </p>

      <div className="flex items-center gap-2 text-brand-primary font-black text-[11px] uppercase tracking-widest">
        <span>{disabled ? 'Көп ұзамай' : 'Ойнау'}</span>
        {!disabled && <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
      </div>
    </motion.button>
  );
}
