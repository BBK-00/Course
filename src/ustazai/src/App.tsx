import { lazy, Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, ChevronRight, FileUp, Globe2, LoaderCircle, Play, Sparkles
} from 'lucide-react';
import { translations, type Language } from './lib/translations';
import { generateQuestions, type Question } from './services/gemini';
import ToolCatalog, { workspaceCopy, type ToolId } from './components/ToolCatalog';
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

const CameraGame = lazy(() => import('./components/CameraGame'));
const LetterBuilderGame = lazy(() => import('./components/LetterBuilderGame'));
const AIPedagog = lazy(() => import('./components/AIPedagog'));

type Stage = 'catalog' | 'setup' | 'generating' | 'ready' | 'playing';
type Filter = Parameters<typeof ToolCatalog>[0]['filter'];
const questionGames = new Set<ToolId>(['camera', 'tugofwar', 'letterbuilder', 'hangman']);
const fullScreenGames = new Set<ToolId>([...questionGames, 'sackrace', 'memory', 'colormatch']);
const languages: Record<Language, string> = { kz: 'Қазақша', ru: 'Русский', en: 'English' };

export default function App() {
  const [stage, setStage] = useState<Stage>('catalog');
  const [tool, setTool] = useState<ToolId>('lessontimer');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState<Language>('kz');
  const [material, setMaterial] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const returnScroll = useRef(0);
  const returnFocus = useRef('');
  const copy = workspaceCopy[lang];
  const t = translations[lang];
  const details = t.games[tool];
  const inGame = stage === 'playing' && fullScreenGames.has(tool);

  useEffect(() => { document.documentElement.lang = lang === 'kz' ? 'kk' : lang; }, [lang]);
  useEffect(() => {
    if (stage !== 'catalog') { window.scrollTo(0, 0); return; }
    window.scrollTo(0, returnScroll.current);
    if (returnFocus.current) document.getElementById(returnFocus.current)?.focus({ preventScroll: true });
  }, [stage]);

  function openTool(id: ToolId) {
    generation.current++;
    returnScroll.current = window.scrollY;
    returnFocus.current = document.activeElement?.id || 'ustaz-tool-' + id;
    setTool(id);
    setError('');
    setStage(questionGames.has(id) ? 'setup' : 'playing');
  }

  function closeTool() {
    generation.current++;
    setError('');
    setStage('catalog');
  }

  async function prepareQuestions() {
    if (!material.trim() || stage !== 'setup') return;
    const ticket = ++generation.current;
    setStage('generating');
    setError('');
    try {
      const result = await generateQuestions(material, lang, tool);
      if (ticket !== generation.current) return;
      if (!result.length) throw new Error('Сұрақтар құрастырылмады. Қайта көріңіз.');
      setQuestions(result);
      setStage('ready');
    } catch (error) {
      if (ticket !== generation.current) return;
      setStage('setup');
      setError(error instanceof Error ? error.message : 'Қате орын алды.');
    }
  }

  async function loadMaterial(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (file.size > 48000) { setError('Мәтіндік файл тым үлкен. 12 000 таңбаға дейін таңдаңыз.'); return; }
    try {
      const value = await file.text();
      if (value.length > 12000) { setError('Сабақ мәтіні 12 000 таңбадан аспауы керек.'); return; }
      setMaterial(value);
      setError('');
    } catch {
      setError('Файлды оқу мүмкін болмады.');
    }
  }

  function activeTool() {
    const ready = () => setStage('ready');
    switch (tool) {
      case 'camera': return <CameraGame questions={questions} onBack={ready} />;
      case 'tugofwar': return <TugOfWarGame questions={questions} onBack={ready} />;
      case 'letterbuilder': return <LetterBuilderGame questions={questions} onBack={ready} />;
      case 'hangman': return <HangmanGame questions={questions} onBack={ready} />;
      case 'sackrace': return <SackRaceGame onBack={closeTool} />;
      case 'memory': return <MemoryGame onBack={closeTool} />;
      case 'colormatch': return <ColorMatchGame onBack={closeTool} />;
      case 'groupsplitter': return <GroupSplitter onBack={closeTool} lang={lang} />;
      case 'randompicker': return <RandomPicker onBack={closeTool} lang={lang} />;
      case 'assessment': return <StudentAssessment onBack={closeTool} lang={lang} />;
      case 'reflection': return <ReflectionTool onBack={closeTool} lang={lang} />;
      case 'lessontimer': return <LessonTimer onBack={closeTool} lang={lang} />;
      case 'lessonPlan':
      case 'presentation':
      case 'quizGames':
        return <AIPedagog onBack={closeTool} lang={lang} selectedTool={tool} onToolChange={setTool} />;
    }
  }

  return (
    <div className="ustaz-app">
      <a href="#ustaz-main" className="ustaz-skip">{copy.skip}</a>
      {!inGame && (
        <header className="ustaz-top">
          <div className="ustaz-breadcrumb">
            <a href="/tools/" className="ustaz-back" aria-label={copy.back}><ArrowLeft size={18} aria-hidden="true" /><span>{copy.back}</span></a>
            <ChevronRight size={14} aria-hidden="true" />
            {stage === 'catalog'
              ? <strong className="ustaz-top-name">AI</strong>
              : <button type="button" className="ustaz-top-name" onClick={closeTool}>AI</button>}
            {stage !== 'catalog' && <span className="ustaz-crumb-tool"><ChevronRight size={14} aria-hidden="true" />{details.title}</span>}
          </div>
          <div className="ustaz-top-actions">
            <label className="ustaz-language">
              <Globe2 size={16} aria-hidden="true" />
              <select value={lang} aria-label={copy.language} onChange={event => setLang(event.target.value as Language)}>
                {Object.entries(languages).map(([code, label]) => <option value={code} key={code}>{label}</option>)}
              </select>
            </label>
          </div>
        </header>
      )}

      {stage === 'catalog' ? (
        <ToolCatalog lang={lang} filter={filter} onFilter={next => { setFilter(next); window.scrollTo(0, 0); }}
          query={query} onQuery={setQuery} onOpen={openTool} />
      ) : (
        <main id="ustaz-main" tabIndex={-1} className={inGame ? 'ustaz-live ustaz-game' : 'ustaz-live'}>
          {stage === 'playing' ? (
            <Suspense fallback={<div className="ustaz-loading" role="status"><LoaderCircle aria-hidden="true" />Құрал жүктелуде…</div>}>{activeTool()}</Suspense>
          ) : (
            <div className="ustaz-flow">
              <button className="ustaz-button ustaz-button-secondary" type="button" onClick={closeTool}><ArrowLeft size={17} aria-hidden="true" />{copy.all}</button>
              <section className="ustaz-flow-panel" aria-labelledby="ustaz-flow-title">
                <header>
                  <span className="ustaz-flow-icon"><BookOpen size={23} aria-hidden="true" /></span>
                  <div><h1 id="ustaz-flow-title">{details.title}</h1><p>{details.desc}</p></div>
                </header>
                {stage === 'setup' && (
                  <form className="ustaz-flow-form" onSubmit={event => { event.preventDefault(); void prepareQuestions(); }}>
                    <label htmlFor="ustaz-material">{copy.material}</label>
                    <textarea id="ustaz-material" rows={8} maxLength={12000} value={material}
                      placeholder={t.setup.materialPlaceholder} onChange={event => setMaterial(event.target.value)} />
                    <div className="ustaz-flow-actions">
                      <label className="ustaz-button ustaz-button-secondary">
                        <FileUp size={17} aria-hidden="true" />{copy.upload}
                        <input type="file" className="sr-only" accept=".txt,.md" onChange={loadMaterial} />
                      </label>
                      <button className="ustaz-button ustaz-button-primary" disabled={!material.trim()} type="submit">
                        <Sparkles size={17} aria-hidden="true" />{t.setup.generateBtn}
                      </button>
                    </div>
                    {error && <p className="ustaz-form-error" role="alert">{error}</p>}
                  </form>
                )}
                {stage === 'generating' && <div className="ustaz-loading" role="status"><LoaderCircle aria-hidden="true" />{copy.generating}</div>}
                {stage === 'ready' && (
                  <div className="ustaz-ready">
                    <h2>{copy.generated} <span>{questions.length}</span></h2>
                    <ol>{questions.slice(0, 4).map((question, index) => <li key={index}>{question.text}</li>)}</ol>
                    <div className="ustaz-flow-actions">
                      <button className="ustaz-button ustaz-button-secondary" type="button" onClick={() => setStage('setup')}>{t.footer.change}</button>
                      <button className="ustaz-button ustaz-button-primary" type="button" onClick={() => setStage('playing')}>
                        <Play size={17} aria-hidden="true" />{t.setup.startBtn}<ArrowRight size={17} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
