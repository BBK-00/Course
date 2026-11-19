import { useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowUpRight, BookOpen, BrainCircuit, Camera, ClipboardCheck,
  FileText, Gamepad2, LayoutGrid, MessageSquareText, Palette, Presentation, Puzzle,
  Search, Shuffle, Sparkles, Timer, Type, Users, X
} from 'lucide-react';
import { translations, type Language } from '../lib/translations';

export type ToolId = keyof typeof translations.kz.games;
type Category = 'classroom' | 'games' | 'ai';
type Filter = 'all' | Category;

const catalog = {
  classroom: ['lessontimer', 'groupsplitter', 'randompicker', 'assessment', 'reflection'],
  games: ['tugofwar', 'camera', 'letterbuilder', 'sackrace', 'hangman', 'memory', 'colormatch'],
  ai: ['lessonPlan', 'presentation', 'quizGames']
} satisfies Record<Category, ToolId[]>;

const icons = {
  lessontimer: Timer, groupsplitter: Users, randompicker: Shuffle,
  assessment: ClipboardCheck, reflection: MessageSquareText, tugofwar: Users, camera: Camera,
  letterbuilder: Type, sackrace: Gamepad2, hangman: Puzzle, memory: BrainCircuit, colormatch: Palette,
  lessonPlan: FileText, presentation: Presentation, quizGames: Sparkles
};
const filters = [
  ['all', LayoutGrid], ['classroom', BookOpen], ['games', Gamepad2], ['ai', Sparkles]
] as const;

export const workspaceCopy = {
  kz: {
    home: 'Оқу кеңістігі', back: 'Көмекші құралдар', title: 'Сабаққа арналған құралдар',
    intro: 'Сабақты ұйымдастырыңыз, интерактивті ойын өткізіңіз және ЖИ көмегімен материал дайындаңыз.',
    all: 'Барлық құралдар', classroom: 'Сабақ құралдары', games: 'Ойындар', ai: 'ЖИ құралдары',
    search: 'Құралды іздеу', empty: 'Құрал табылмады.', clear: 'Іздеуді тазарту',
    language: 'Интерфейс тілі', account: 'Жеке кабинет', logoutError: 'Шығу мүмкін болмады. Қайта көріңіз.',
    menu: 'Құралдар санаттары', skip: 'Мазмұнға өту', generated: 'Дайын сұрақтар',
    material: 'Сабақ мәтіні', upload: 'Мәтіндік файл қосу', generating: 'Сұрақтар дайындалып жатыр…'
  },
  ru: {
    home: 'Учебное пространство', back: 'Инструменты', title: 'Инструменты для урока',
    intro: 'Организуйте урок, проведите игру и подготовьте материалы с помощью ИИ.',
    all: 'Все инструменты', classroom: 'Для урока', games: 'Игры', ai: 'Инструменты ИИ',
    search: 'Найти инструмент', empty: 'Инструменты не найдены.', clear: 'Очистить поиск',
    language: 'Язык интерфейса', account: 'Личный кабинет', logoutError: 'Не удалось выйти. Повторите попытку.',
    menu: 'Категории инструментов', skip: 'Перейти к содержимому', generated: 'Готовые вопросы',
    material: 'Текст урока', upload: 'Загрузить текстовый файл', generating: 'Готовим вопросы…'
  },
  en: {
    home: 'Learning Space', back: 'Learning tools', title: 'Tools for your lesson',
    intro: 'Run classroom activities, play learning games and prepare materials with AI.',
    all: 'All tools', classroom: 'Classroom tools', games: 'Games', ai: 'AI tools',
    search: 'Find a tool', empty: 'No tools found.', clear: 'Clear search',
    language: 'Interface language', account: 'My account', logoutError: 'Could not sign out. Please try again.',
    menu: 'Tool categories', skip: 'Skip to content', generated: 'Your questions',
    material: 'Lesson material', upload: 'Add a text file', generating: 'Preparing questions…'
  }
};

interface Props {
  lang: Language;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  query: string;
  onQuery: (query: string) => void;
  onOpen: (tool: ToolId) => void;
}

export default function ToolCatalog({ lang, filter, onFilter, query, onQuery, onOpen }: Props) {
  const copy = workspaceCopy[lang];
  const { games } = translations[lang];
  const term = query.trim().toLocaleLowerCase(lang === 'kz' ? 'kk' : lang);
  const groups = (Object.keys(catalog) as Category[])
    .filter(category => filter === 'all' || category === filter)
    .map(category => ({
      category,
      tools: catalog[category].filter(id => `${games[id].title} ${games[id].desc}`.toLocaleLowerCase(lang === 'kz' ? 'kk' : lang).includes(term))
    }))
    .filter(group => group.tools.length > 0);
  const count = groups.reduce((sum, group) => sum + group.tools.length, 0);
  const [announcement, setAnnouncement] = useState(false);
  const featured = filter === 'all';

  return (
    <div className="ustaz-layout">
      <aside className="ustaz-rail">
        <a className="ustaz-rail-brand" href="/" aria-label={copy.home}>
          <span className="ustaz-mark"><BookOpen size={21} aria-hidden="true" /></span>
          <span><strong>AI</strong><small>{copy.home}</small></span>
        </a>
        <nav className="ustaz-filters" aria-label={copy.menu}>
          {filters.map(([key, Icon]) => (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => { onFilter(key); setAnnouncement(true); }}>
              <Icon size={18} aria-hidden="true" /><span>{copy[key]}</span>
            </button>
          ))}
        </nav>
        <a className="ustaz-rail-back" href="/tools/"><ArrowLeft size={16} aria-hidden="true" />{copy.back}</a>
      </aside>

      <main id="ustaz-main" className="ustaz-catalog" tabIndex={-1}>
        {featured && (
          <section className="ustaz-feature" aria-labelledby="ustaz-title">
            <div className="ustaz-feature-content">
              <h1 id="ustaz-title">{copy.title}</h1>
              <p>{copy.intro}</p>
              <div className="ustaz-feature-actions">
                <button id="ustaz-feature-timer" className="ustaz-button ustaz-button-lime" type="button" onClick={() => onOpen('lessontimer')}>
                  <Timer size={17} aria-hidden="true" />{games.lessontimer.title}
                </button>
                <a className="ustaz-button ustaz-button-glass" href="#ustaz-list">
                  {copy.all}<ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="ustaz-feature-visual" aria-hidden="true">
              <div className="ustaz-dial"><Timer size={66} strokeWidth={1.2} /></div>
              <span className="ustaz-feature-icon ustaz-feature-users"><Users size={24} /></span>
              <span className="ustaz-feature-icon ustaz-feature-ai"><Sparkles size={22} /></span>
            </div>
          </section>
        )}

        <section id="ustaz-list" className="ustaz-directory" aria-labelledby="ustaz-directory-title">
          <div className="ustaz-directory-head">
            {featured
              ? <h2 id="ustaz-directory-title">{copy[filter]}</h2>
              : <h1 id="ustaz-directory-title">{copy[filter]}</h1>}
            <label className="ustaz-search">
              <Search size={18} aria-hidden="true" />
              <input type="search" aria-label={copy.search} placeholder={copy.search} value={query}
                onChange={event => { onQuery(event.target.value); setAnnouncement(true); }} />
              {query && <button type="button" title={copy.clear} aria-label={copy.clear} onClick={() => onQuery('')}><X size={17} aria-hidden="true" /></button>}
            </label>
          </div>
          {announcement && <span className="sr-only" role="status">{count ? `${copy[filter]} · ${count}` : copy.empty}</span>}
          {groups.map(({ category, tools }) => (
            <section key={category} className="ustaz-tool-group" aria-label={copy[category]}>
              {filter === 'all' && <h3>{copy[category]}</h3>}
              <div className="ustaz-grid">
                {tools.map(id => {
                  const Icon = icons[id];
                  return (
                    <button id={`ustaz-tool-${id}`} key={id} type="button" className={`ustaz-tile ustaz-tile-${category}`} onClick={() => onOpen(id)}>
                      <span className="ustaz-tile-top"><span className="ustaz-tile-icon"><Icon size={21} aria-hidden="true" /></span><ArrowUpRight size={18} aria-hidden="true" /></span>
                      <strong>{games[id].title}</strong><small>{games[id].desc}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {count === 0 && <div className="ustaz-empty">
            <Search size={24} aria-hidden="true" /><p>{copy.empty}</p>
            <button type="button" className="ustaz-button ustaz-button-secondary" onClick={() => onQuery('')}>{copy.clear}</button>
          </div>}
        </section>
      </main>
    </div>
  );
}
