import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Wand2, Eraser, Plus, Minus, Copy, Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { translations, Language } from '../lib/translations';

interface GroupSplitterProps {
  onBack: () => void;
  lang: Language;
}

export default function GroupSplitter({ onBack, lang }: GroupSplitterProps) {
  const [nameInput, setNameInput] = useState('');
  const [groupCount, setGroupCount] = useState(2);
  const [groups, setGroups] = useState<string[][]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const t = translations[lang].tools.groupsplitter;
  const common = translations[lang].reflection; // for 'back'

  const students = nameInput
    .split(/[\n,]+/)
    .map(s => s.replace(/[0-9]/g, '').trim())
    .filter(s => s.length > 1);

  const splitIntoGroups = () => {
    if (students.length < groupCount) return;

    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const newGroups: string[][] = Array.from({ length: groupCount }, () => []);

    shuffled.forEach((student, index) => {
      newGroups[index % groupCount].push(student);
    });

    setGroups(newGroups);
  };

  const copyToClipboard = (group: string[], index: number) => {
    const text = group.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearAll = () => {
    setNameInput('');
    setGroups([]);
  };

  return (
    <div className="fixed inset-0 bg-[#FDFCF8] overflow-y-auto font-sans select-none pb-20">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none fixed"
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Header */}
      <div className="relative z-20 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <button onClick={onBack} className="btn-secondary px-4 py-2 text-sm flex items-center gap-2">
          <X size={18} /> {common.back}
        </button>
        <div className="badge-modern bg-brand-primary text-white px-6 py-2">
          {t.title}
        </div>
        <div className="w-24" />
      </div>

      <div className="relative z-20 max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        {/* Input Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="card-modern p-6 md:p-8 space-y-6"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{t.title}</h2>
              <p className="text-brand-muted font-medium text-sm">{t.sub}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-brand-muted px-1">{t.inputLabel}</label>
            <textarea
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="w-full h-40 bg-brand-bg/30 border border-zinc-100 rounded-2xl p-6 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
            />
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-black text-brand-primary uppercase tracking-widest">
                {students.length} {lang === 'kz' ? 'оқушы табылды' : lang === 'ru' ? 'учеников найдено' : 'students found'}
              </span>
              <button
                onClick={clearAll}
                className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity"
              >
                <Eraser size={14} /> {t.resetBtn}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
            <div className="flex items-center gap-4 bg-zinc-50 p-2 rounded-2xl border border-zinc-100">
              <span className="text-sm font-black uppercase tracking-widest px-4">{t.groupCount}:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGroupCount(Math.max(2, groupCount - 1))}
                  className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-all"
                >
                  <Minus size={18} />
                </button>
                <div className="w-12 text-center font-black text-xl">{groupCount}</div>
                <button
                  onClick={() => setGroupCount(Math.min(15, groupCount + 1))}
                  className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-all"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <button
              onClick={splitIntoGroups}
              disabled={students.length < groupCount}
              className={cn(
                "btn-primary px-10 py-4 text-lg w-full md:w-auto",
                students.length < groupCount && "opacity-50 cursor-not-allowed"
              )}
            >
              <Wand2 size={20} /> {t.splitBtn}
            </button>
          </div>
        </motion.div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {groups.map((group, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card-modern overflow-hidden flex flex-col"
              >
                <div className="bg-brand-bg p-4 border-b border-zinc-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-primary text-white rounded-lg flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </div>
                    <h3 className="font-black uppercase tracking-widest text-sm text-brand-text">{lang === 'kz' ? 'Топ' : lang === 'ru' ? 'Группа' : 'Group'} {idx + 1}</h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(group, idx)}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    {copiedIndex === idx ? <Check size={16} className="text-brand-primary" /> : <Copy size={16} className="text-brand-muted" />}
                  </button>
                </div>
                <ul className="p-4 space-y-2">
                  {group.map((name, sIdx) => (
                    <li key={sIdx} className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100 font-bold text-sm text-brand-text">
                      <div className="w-2 h-2 rounded-full bg-brand-primary" />
                      {name}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {groups.length === 0 && students.length > 0 && (
          <div className="text-center py-20 opacity-20">
            <Users size={80} className="mx-auto mb-4" />
            <p className="font-black uppercase tracking-widest">{lang === 'kz' ? 'Бөлістіру батырмасын басыңыз' : lang === 'ru' ? 'Нажмите кнопку разделения' : 'Click the split button'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
