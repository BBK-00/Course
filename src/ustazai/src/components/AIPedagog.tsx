import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Presentation, Gamepad2, BrainCircuit,
  ArrowLeft, Download, Loader2, Play, CheckCircle2,
  Trophy, Shuffle, Target, Info, FileDown
} from 'lucide-react';
import {
  generateLessonPlanJson,
  generatePresentationJson,
  generateInteractiveGames
} from '../services/gemini';
import { translations, Language } from '../lib/translations';
import PptxGenJS from 'pptxgenjs';

// ─── Style Themes ─────────────────────────────────────────────────────────────
const THEMES = {
  midnight: {
    label: "Midnight",
    desc: "Қою, элегантты",
    preview: ["#0F172A", "#6366F1"],
    bg: "0F172A",
    title_bg: "1E1B4B",
    title_fg: "FFFFFF",
    accent: "818CF8",
    accent2: "C7D2FE",
    body_bg: "1E293B",
    text: "E2E8F0",
    sub: "818CF8",
    muted: "94A3B8",
    card: "1E293B",
    card_border: "334155",
  },
  aurora: {
    label: "Aurora",
    desc: "Жасыл-табиғи",
    preview: ["#064E3B", "#10B981"],
    bg: "F0FDF4",
    title_bg: "064E3B",
    title_fg: "ECFDF5",
    accent: "059669",
    accent2: "6EE7B7",
    body_bg: "D1FAE5",
    text: "064E3B",
    sub: "059669",
    muted: "6B7280",
    card: "ECFDF5",
    card_border: "A7F3D0",
  },
  crimson: {
    label: "Crimson",
    desc: "Батыл, қызыл",
    preview: ["#7F1D1D", "#EF4444"],
    bg: "FFFFFF",
    title_bg: "7F1D1D",
    title_fg: "FEF2F2",
    accent: "DC2626",
    accent2: "FCA5A5",
    body_bg: "FEF2F2",
    text: "1C1917",
    sub: "DC2626",
    muted: "78716C",
    card: "FFF7F7",
    card_border: "FECACA",
  },
  ocean: {
    label: "Ocean",
    desc: "Терең көк",
    preview: ["#0C4A6E", "#0EA5E9"],
    bg: "F0F9FF",
    title_bg: "0C4A6E",
    title_fg: "E0F2FE",
    accent: "0284C7",
    accent2: "7DD3FC",
    body_bg: "E0F2FE",
    text: "0C4A6E",
    sub: "0284C7",
    muted: "6B7280",
    card: "F0F9FF",
    card_border: "BAE6FD",
  },
  sand: {
    label: "Sand",
    desc: "Жылы, минимал",
    preview: ["#78350F", "#F59E0B"],
    bg: "FFFBEB",
    title_bg: "78350F",
    title_fg: "FEF3C7",
    accent: "D97706",
    accent2: "FCD34D",
    body_bg: "FEF3C7",
    text: "1C1917",
    sub: "B45309",
    muted: "78716C",
    card: "FFFBEB",
    card_border: "FDE68A",
  },
  slate: {
    label: "Slate",
    desc: "Сұр, корпоративтік",
    preview: ["#1E293B", "#64748B"],
    bg: "F8FAFC",
    title_bg: "1E293B",
    title_fg: "F1F5F9",
    accent: "475569",
    accent2: "CBD5E1",
    body_bg: "E2E8F0",
    text: "0F172A",
    sub: "475569",
    muted: "94A3B8",
    card: "FFFFFF",
    card_border: "E2E8F0",
  },
} as const;

type ThemeKey = keyof typeof THEMES;

// ─── Helper: Build PPTX ───────────────────────────────────────────────────────
async function buildPptx(data: any, themeKey: ThemeKey): Promise<Blob> {
  const c = THEMES[themeKey];
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  for (const slide of data.slides) {
    const s = pptx.addSlide();
    s.background = { color: c.bg };

    if (slide.type === "title") {
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: c.title_bg } });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: "100%", fill: { color: c.accent } });
      s.addShape(pptx.ShapeType.ellipse, { x: 8.5, y: -1.2, w: 4.5, h: 4.5, fill: { color: c.accent } });
      s.addShape(pptx.ShapeType.ellipse, { x: 9.2, y: -0.5, w: 3, h: 3, fill: { color: c.title_bg } });
      s.addText(slide.title || data.title, {
        x: 0.7, y: 1.4, w: 9.5, h: 1.8,
        fontSize: 42, bold: true, color: c.title_fg,
        fontFace: "Trebuchet MS", align: "left", valign: "middle",
        wrap: true,
      });
      if (slide.subtitle) {
        s.addText(slide.subtitle, {
          x: 0.7, y: 3.3, w: 9, h: 0.8,
          fontSize: 18, color: c.accent2,
          fontFace: "Calibri", align: "left",
        });
      }
      s.addShape(pptx.ShapeType.rect, { x: 0.7, y: 4.5, w: 3, h: 0.06, fill: { color: c.accent } });

    } else if (slide.type === "content") {
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.05, fill: { color: c.title_bg } });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.1, h: 1.05, fill: { color: c.accent } });
      s.addText(slide.title || "", {
        x: 0.35, y: 0.1, w: 11.8, h: 0.85,
        fontSize: 26, bold: true, color: c.title_fg,
        fontFace: "Trebuchet MS", valign: "middle",
      });
      s.addShape(pptx.ShapeType.rect, {
        x: 0.3, y: 1.2, w: 11.8, h: 4.0,
        fill: { color: c.card }, line: { color: c.card_border, pt: 1 }
      });
      const pts = (slide.points || []).map((p: string) => ({
        text: "  " + p,
        options: { bullet: { type: "bullet" as const, color: c.accent, fontSize: 8 }, paraSpaceBefore: 10 },
      }));
      if (pts.length) {
        s.addText(pts, { x: 0.55, y: 1.35, w: 11.3, h: 3.7, fontSize: 16, color: c.text, fontFace: "Calibri", valign: "top" });
      }
      if (slide.note) {
        s.addShape(pptx.ShapeType.rect, { x: 0.3, y: 5.35, w: 11.8, h: 0.5, fill: { color: c.body_bg } });
        s.addText("💡 " + slide.note, { x: 0.45, y: 5.38, w: 11.5, h: 0.44, fontSize: 12, color: c.sub, fontFace: "Calibri", italic: true });
      }

    } else if (slide.type === "two_col") {
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.05, fill: { color: c.title_bg } });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.1, h: 1.05, fill: { color: c.accent } });
      s.addText(slide.title || "", {
        x: 0.35, y: 0.1, w: 11.8, h: 0.85,
        fontSize: 26, bold: true, color: c.title_fg, fontFace: "Trebuchet MS", valign: "middle",
      });
      s.addShape(pptx.ShapeType.rect, { x: 0.3, y: 1.2, w: 5.75, h: 4.1, fill: { color: c.card }, line: { color: c.card_border, pt: 1 } });
      s.addShape(pptx.ShapeType.rect, { x: 0.3, y: 1.2, w: 5.75, h: 0.5, fill: { color: c.accent } });
      if (slide.left_title) s.addText(slide.left_title, { x: 0.45, y: 1.25, w: 5.5, h: 0.4, fontSize: 14, bold: true, color: c.title_fg, fontFace: "Trebuchet MS" });
      const lp = (slide.left_points || []).map((p: string) => ({ text: p, options: { bullet: true, paraSpaceBefore: 6 } }));
      if (lp.length) s.addText(lp, { x: 0.45, y: 1.8, w: 5.5, h: 3.4, fontSize: 14, color: c.text, fontFace: "Calibri", valign: "top" });

      s.addShape(pptx.ShapeType.rect, { x: 6.35, y: 1.2, w: 5.75, h: 4.1, fill: { color: c.card }, line: { color: c.card_border, pt: 1 } });
      s.addShape(pptx.ShapeType.rect, { x: 6.35, y: 1.2, w: 5.75, h: 0.5, fill: { color: c.sub } });
      if (slide.right_title) s.addText(slide.right_title, { x: 6.5, y: 1.25, w: 5.5, h: 0.4, fontSize: 14, bold: true, color: c.title_fg, fontFace: "Trebuchet MS" });
      const rp = (slide.right_points || []).map((p: string) => ({ text: p, options: { bullet: true, paraSpaceBefore: 6 } }));
      if (rp.length) s.addText(rp, { x: 6.5, y: 1.8, w: 5.5, h: 3.4, fontSize: 14, color: c.text, fontFace: "Calibri", valign: "top" });

    } else if (slide.type === "stats") {
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.05, fill: { color: c.title_bg } });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.1, h: 1.05, fill: { color: c.accent } });
      s.addText(slide.title || "", {
        x: 0.35, y: 0.1, w: 11.8, h: 0.85,
        fontSize: 26, bold: true, color: c.title_fg, fontFace: "Trebuchet MS", valign: "middle",
      });
      const stats = slide.stats || [];
      const cardW = (11.7 - (stats.length - 1) * 0.25) / stats.length;
      stats.forEach((st: any, i: number) => {
        const x = 0.3 + i * (cardW + 0.25);
        s.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: cardW, h: 3.8, fill: { color: c.card }, line: { color: c.card_border, pt: 1 } });
        s.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: cardW, h: 0.12, fill: { color: c.accent } });
        s.addText(st.value, { x, y: 2.0, w: cardW, h: 1.5, fontSize: 52, bold: true, color: c.accent, fontFace: "Trebuchet MS", align: "center" });
        s.addText(st.label, { x, y: 3.7, w: cardW, h: 0.9, fontSize: 15, color: c.text, fontFace: "Calibri", align: "center", wrap: true });
      });

    } else if (slide.type === "quote") {
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: c.body_bg } });
      s.addText("“", { x: 0.6, y: 0.3, w: 2, h: 2.5, fontSize: 120, bold: true, color: c.accent, fontFace: "Georgia" });
      s.addText(slide.quote || "", {
        x: 0.9, y: 1.4, w: 10.7, h: 2.8,
        fontSize: 24, color: c.text, fontFace: "Georgia",
        italic: true, align: "left", valign: "middle", wrap: true,
      });
      if (slide.author) {
        s.addShape(pptx.ShapeType.rect, { x: 0.9, y: 4.5, w: 2, h: 0.05, fill: { color: c.accent } });
        s.addText("— " + slide.author, { x: 0.9, y: 4.6, w: 6, h: 0.5, fontSize: 14, bold: true, color: c.sub, fontFace: "Calibri" });
      }

    } else if (slide.type === "end") {
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: c.title_bg } });
      s.addText(slide.title || "Рахмет!", { x: 1.2, y: 1.1, w: 9.5, h: 1.5, fontSize: 44, bold: true, color: c.title_fg, fontFace: "Trebuchet MS" });
      if (slide.message) {
        s.addText(slide.message, { x: 1.2, y: 2.4, w: 9.5, h: 1.2, fontSize: 18, color: c.accent2, fontFace: "Calibri" });
      }
    }
  }

  const buf = await pptx.write({ outputType: "arraybuffer" });
  return new Blob([buf as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} from "docx";
import { cn } from '../lib/utils';
import { AccountError } from '../services/account';

interface AIPedagogProps {
  onBack: () => void;
  lang: Language;
  initialTool: ToolType;
  onAuthRequired: () => void;
}

type ToolType = 'lessonPlan' | 'presentation' | 'quizGames';
type Status = 'idle' | 'generating' | 'ready';

interface FormState {
  title: string;
  module_: string;
  teacher: string;
  date: string;
  groups: string;
  type_: string;
  duration: string;
}

// ─── DOCX builder ─────────────────────────────────────────────────────────────
async function buildDocx(meta: FormState, ai: any, lang: string) {
  const isKz = lang === "kz";
  const practiceMin = parseInt(meta.duration) - 35;

  const L = isKz ? {
    heading: "ОҚУ САБАҒЫНЫҢ ЖОСПАРЫ",
    rowTitle: "Сабақтың тақырыбы",
    rowModule: "Модуль / пән атауы",
    rowTeacher: "Педагог",
    rowDate: "Жылы, айы, күні",
    rowGroups: "Курс, топ",
    rowType: "Сабақтың түрі",
    rowGoal: "Сабақ мақсаты, міндеттері",
    rowOutcomes: "Күтілетін нәтижелер",
    rowEquipment: "Құрал-жабдықтар",
    tableTitle: "Сабақ барысы",
    colStage: "Сабақтың барысы",
    colTime: "Уақыты (минут)",
    colPlan: "Жоспарланған іс-әрекеттер",
    colRes: "Ресурстар",
    s1name: "Ұйымдастырушы,\nынталандырушы кезең",
    s2name: "Іс-әрекет кезеңі\n(теория)",
    s3name: "Іс-әрекет кезеңі\n(практика)",
    s4name: "Сабақты қорытындылау\nмен рефлексия",
    t1: "5 мин", t2: "20 мин", t3: `${practiceMin} мин`, t4: "10 мин",
    signTeacher: "Педагог",
    signDate: "Күні",
  } : {
    heading: "ПЛАН УРОКА",
    rowTitle: "Тема урока",
    rowModule: "Модуль / предмет",
    rowTeacher: "Педагог",
    rowDate: "Дата",
    rowGroups: "Группа / курс",
    rowType: "Тип урока",
    rowGoal: "Цель урока",
    rowOutcomes: "Ожидаемые результаты",
    rowEquipment: "Оборудование",
    tableTitle: "Ход урока",
    colStage: "Этап урока",
    colTime: "Время (мин)",
    colPlan: "Запланированные действия",
    colRes: "Ресурсы",
    s1name: "Организационный\nэтап",
    s2name: "Изучение нового\nматериала",
    s3name: "Практический\nэтап",
    s4name: "Итог /\nРефлексия",
    t1: "5 мин", t2: "20 мин", t3: `${practiceMin} мин`, t4: "10 мин",
    signTeacher: "Педагог",
    signDate: "Дата",
  };

  const BD = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
  const borders = { top: BD, bottom: BD, left: BD, right: BD };
  const HBD = { style: BorderStyle.SINGLE, size: 1, color: "2E75B6" };
  const hBorders = { top: HBD, bottom: HBD, left: HBD, right: HBD };
  const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

  function textRun(text: string, bold = false, size = 20, color = "000000") {
    return new TextRun({ text, bold, size, color, font: "Times New Roman" });
  }

  function multilineParagraphs(text: string, bold = false, size = 20): Paragraph[] {
    return String(text || "—").split("\n").map(
      (line) =>
        new Paragraph({
          spacing: { before: 40, after: 40 },
          children: [textRun(line || " ", bold, size)],
        })
    );
  }

  function infoCell(text: string, width: number, bg = "FFFFFF", bold = false): TableCell {
    return new TableCell({
      borders,
      width: { size: width, type: WidthType.DXA },
      shading: { fill: bg, type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      margins: cellMargins,
      children: multilineParagraphs(text, bold),
    });
  }

  function headerCell(text: string, width: number): TableCell {
    return new TableCell({
      borders: hBorders,
      width: { size: width, type: WidthType.DXA },
      shading: { fill: "2E75B6", type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      margins: cellMargins,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
          children: [textRun(text, true, 20, "FFFFFF")],
        }),
      ],
    });
  }

  function infoRow(label: string, value: string): TableRow {
    return new TableRow({
      children: [
        infoCell(label, 3000, "EBF3FB", true),
        infoCell(value, 6096),
      ],
    });
  }

  const outcomesText = (ai.outcomes || []).map((o: string) => `• ${o}`).join("\n");
  const practiceText = `${ai.practice_task1 || ""}\n\n${ai.practice_task2 || ""}\n\n${ai.practice_task3 || ""}\n\n${ai.practice_criteria || ""}`;

  function stageRow(stageName: string, time: string, activities: string, resources: string): TableRow {
    return new TableRow({
      children: [
        infoCell(stageName, 1800, "EBF3FB", true),
        new TableCell({
          borders,
          width: { size: 700, type: WidthType.DXA },
          shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
              children: [textRun(time)],
            }),
          ],
        }),
        infoCell(activities, 4796),
        infoCell(resources, 1800),
      ],
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 850, bottom: 1134, left: 1701 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [textRun(L.heading, true, 28, "2E75B6")],
          }),
          new Table({
            width: { size: 9096, type: WidthType.DXA },
            rows: [
              infoRow(L.rowTitle, meta.title),
              infoRow(L.rowModule, meta.module_),
              infoRow(L.rowTeacher, meta.teacher),
              infoRow(L.rowDate, meta.date),
              infoRow(L.rowGroups, meta.groups),
              infoRow(L.rowType, meta.type_),
              infoRow(L.rowGoal, String(ai.goal || "")),
              infoRow(L.rowOutcomes, outcomesText),
              infoRow(L.rowEquipment, String(ai.equipment || "")),
            ],
          }),
          new Paragraph({ spacing: { before: 160, after: 80 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 100 },
            children: [textRun(L.tableTitle, true, 24, "2E75B6")],
          }),
          new Table({
            width: { size: 9096, type: WidthType.DXA },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  headerCell(L.colStage, 1800),
                  headerCell(L.colTime, 700),
                  headerCell(L.colPlan, 4796),
                  headerCell(L.colRes, 1800),
                ],
              }),
              stageRow(L.s1name, L.t1, String(ai.org_activities || ""), String(ai.org_resources || "")),
              stageRow(L.s2name, L.t2, String(ai.theory_activities || ""), String(ai.theory_resources || "")),
              stageRow(L.s3name, L.t3, practiceText, String(ai.practice_resources || "")),
              stageRow(L.s4name, L.t4, String(ai.reflection_activities || ""), String(ai.reflection_resources || "")),
            ],
          }),
          new Paragraph({
            spacing: { before: 240, after: 60 },
            children: [textRun(`${L.signTeacher}: _________________________ ${meta.teacher}`, false, 22)],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [textRun(`${L.signDate}: _____________________________`, false, 22)],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

const T_EXTRA = {
  kz: {
    lessonHeading: "Сабақ жоспары генераторы",
    lessonSub: "Негізгі ақпаратты енгізіңіз — AI мазмұнды өзі жасайды",
    fTitle: "Сабақтың тақырыбы *",
    fModule: "Модуль / Пән",
    fTeacher: "Педагог",
    fDate: "Күні",
    fGroups: "Топ / Курс",
    fType: "Сабақ түрі",
    fDur: "Ұзақтығы",
    types: ["Аралас (теория + практика)", "Тек практика", "Тек теория", "Зертханалық жұмыс"],
    btn: "✦ AI-мен жоспар жасау",
    loading: "Жасалуда…",
    dlBtn: "↓ .docx жүктеу (Word кестесі)",
    errEmpty: "Тақырыпты енгізіңіз!",
    pTitle: "мысалы: Веб-конструктор ұғымы және түрлері",
    pModule: "мысалы: ОН2.1. АКТ негіздерін меңгеру",
    pTeacher: "мысалы: Бақытжанов Б.Қ.",
    pGroups: "мысалы: И-205, И-206, И-215",
    ready: "✓ Жоспар дайын! Жүктеу батырмасын басыңыз.",
    cancel: "Болдырмау",
    generate: "Жүктеу / Дайындау"
  },
  ru: {
    lessonHeading: "Генератор плана урока",
    lessonSub: "Введите данные — ИИ создаст содержание автоматически",
    fTitle: "Тема урока *",
    fModule: "Модуль / Предмет",
    fTeacher: "Педагог",
    fDate: "Дата",
    fGroups: "Группа / Курс",
    fType: "Тип урока",
    fDur: "Длительность",
    types: ["Смешанный (теория + практика)", "Только практика", "Только теория", "Лабораторная"],
    btn: "✦ Создать план с ИИ",
    loading: "Создаётся…",
    dlBtn: "↓ Скачать .docx (таблица Word)",
    errEmpty: "Введите тему урока!",
    pTitle: "например: Понятие и виды веб-конструкторов",
    pModule: "например: Основы ИКТ",
    pTeacher: "например: Иванов И.И.",
    pGroups: "например: И-205, И-206",
    ready: "✓ План готов! Нажмите кнопку загрузки.",
    cancel: "Отмена",
    generate: "Скачать / Подготовить"
  }
};

export default function AIPedagog({ onBack, lang, initialTool, onAuthRequired }: AIPedagogProps) {
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(initialTool);
  const [status, setStatus] = useState<Status>('idle');
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState("8");
  const [presentationTheme, setPresentationTheme] = useState<ThemeKey>("midnight");
  const [extraInfo, setExtraInfo] = useState("");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    title: "", module_: "", teacher: "", date: "", groups: "", type_: "", duration: "90",
  });

  const t = translations[lang];
  const tx = (lang === 'kz' || lang === 'ru') ? T_EXTRA[lang] : T_EXTRA['ru'];

  const handleGenerate = async () => {
    if (selectedTool === 'lessonPlan') {
      if (!form.title.trim()) {
        setError(tx.errEmpty);
        return;
      }
    } else {
      if (!topic.trim()) return;
    }

    setStatus('generating');
    setError(null);

    try {
      let result;
      if (selectedTool === 'lessonPlan') {
        result = await generateLessonPlanJson(form, lang);
      } else if (selectedTool === 'presentation') {
        result = await generatePresentationJson(topic, slideCount, lang, extraInfo);
      } else {
        result = await generateInteractiveGames(topic, lang);
      }

      if (!result || (selectedTool === 'presentation' && (!result.slides || result.slides.length === 0))) {
        throw new Error("AI мазмұн дайындай алмады. Тақырыпты нақтырақ енгізіп көріңіз.");
      }

      setContent(result);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Техникалық қате орын алды. Интернет байланысын немесе тақырыпты тексеріңіз.");
      if (err instanceof AccountError && err.code === 'auth') onAuthRequired();
      setStatus('idle');
    }
  };

  const downloadPPTX = async () => {
    if (selectedTool !== 'presentation' || !content) return;
    try {
      const blob = await buildPptx(content, presentationTheme);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${content.title || topic}_presentation.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Презентация файлын жасау кезінде қате кетті.");
    }
  };

  const downloadDocx = async () => {
    if (selectedTool !== 'lessonPlan' || !content) return;
    try {
      const blob = await buildDocx(form, content, lang);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (form.title || "sabak_zhospary").replace(/\s+/g, "_").substring(0, 40) + ".docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Word файлын жасау кезінде қате кетті.");
    }
  };

  if (status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-8">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-24 h-24 border-4 border-brand-bg border-t-brand-primary rounded-full"
          />
          <BrainCircuit className="absolute inset-0 m-auto w-10 h-10 text-brand-primary animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black text-brand-text">AI Жасап жатыр...</h3>
          <p className="text-brand-muted font-medium">Сіздің сұранысыңыз бойынша материал дайындалуда</p>
        </div>
      </div>
    );
  }

  if (status === 'ready' && selectedTool === 'lessonPlan') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center">
          <button onClick={() => setStatus('idle')} className="btn-secondary px-4 py-2 text-sm">
            ← Қайтадан
          </button>
          <button onClick={downloadDocx} className="btn-primary px-6 py-2 text-sm flex items-center gap-2">
            <Download size={18} /> {tx.dlBtn}
          </button>
        </div>
        <div className="card-modern p-10 bg-white shadow-xl space-y-8">
          <div className="text-center border-b pb-6">
            <h2 className="text-2xl font-black text-brand-primary mb-2 uppercase tracking-wide">Сабақ жоспары дайын</h2>
            <p className="text-zinc-500 font-medium">{form.title}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-4">
              <p><strong>Тақырып:</strong> {form.title}</p>
              <p><strong>Пән:</strong> {form.module_}</p>
              <p><strong>Оқытушы:</strong> {form.teacher}</p>
            </div>
            <div className="space-y-4">
              <p><strong>Күні:</strong> {form.date}</p>
              <p><strong>Топтар:</strong> {form.groups}</p>
              <p><strong>Түрі:</strong> {form.type_}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-brand-bg rounded-2xl border border-brand-primary/10">
              <div className="flex items-center gap-3 text-brand-primary mb-4">
                <Target size={20} />
                <h3 className="font-black uppercase tracking-widest text-xs">Сабақ мақсаты</h3>
              </div>
              <p className="text-brand-text leading-relaxed text-sm">{content.goal}</p>
            </div>
            <div className="p-6 bg-brand-bg rounded-2xl border border-brand-primary/10">
              <div className="flex items-center gap-3 text-brand-primary mb-4">
                <CheckCircle2 size={20} />
                <h3 className="font-black uppercase tracking-widest text-xs">Күтілетін нәтижелер</h3>
              </div>
              <ul className="space-y-2">
                {content.outcomes.slice(0, 3).map((o: string, i: number) => (
                  <li key={i} className="text-sm text-brand-text flex gap-2">
                    <span className="text-brand-primary">•</span> {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-black text-brand-text flex items-center gap-2">
              <FileText className="text-brand-primary" /> Оқу тапсырмалары
            </h3>
            <div className="grid gap-4">
              {[content.practice_task1, content.practice_task2, content.practice_task3].map((task, i) => (
                <div key={i} className="p-4 bg-white border border-zinc-100 rounded-xl shadow-sm">
                  <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest block mb-1">Тапсырма {i + 1}</span>
                  <p className="text-sm text-zinc-600 line-clamp-2 italic">{task}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-green-600 font-bold justify-center py-4 bg-green-50 rounded-2xl">
            <CheckCircle2 size={20} /> Word файлын жүктеп, толық жоспарды көріңіз
          </div>
        </div>
      </div>
    );
  }

  if (status === 'ready' && selectedTool === 'presentation') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center">
          <button onClick={() => setStatus('idle')} className="btn-secondary px-4 py-2 text-sm">
            ← Қайтадан
          </button>
          <button onClick={downloadPPTX} className="btn-primary px-6 py-2 text-sm flex items-center gap-2">
            <Download size={18} /> PPTX Жүктеу
          </button>
        </div>
        <div className="card-modern p-10 bg-white shadow-xl space-y-8">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className={`p-4 rounded-2xl bg-brand-bg text-brand-primary`}>
              <Presentation size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-text">{content.title}</h2>
              <p className="text-brand-muted font-medium">{content.slides.length} слайд · {THEMES[presentationTheme].label} стилі</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {content.slides.map((slide: any, i: number) => {
              const isDark = slide.type === "title" || slide.type === "end";
              const isQuote = slide.type === "quote";
              const themeParams = THEMES[presentationTheme];
              const bg = isDark ? themeParams.title_bg : isQuote ? themeParams.body_bg : themeParams.bg;
              const textColor = isDark ? themeParams.title_fg : themeParams.text;

              return (
                <div key={i} className="aspect-[16/10] rounded-xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col justify-end p-3 relative" style={{ backgroundColor: `#${bg}` }}>
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: `#${themeParams.accent}` }} />
                  <span className="text-[10px] font-black absolute top-2 right-3" style={{ color: `#${themeParams.muted}` }}>{i + 1}</span>
                  <p className="text-[10px] font-bold line-clamp-2" style={{ color: textColor }}>{slide.title || content.title}</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-green-600 font-bold justify-center py-4 bg-green-50 rounded-2xl">
            <CheckCircle2 size={20} /> Презентация дайын! Жүктеп алып, PowerPoint-та ашыңыз
          </div>
        </div>
      </div>
    );
  }

  if (status === 'ready' && selectedTool === 'quizGames') {
    return (
      <div className="space-y-8 max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center">
          <button onClick={() => setStatus('idle')} className="btn-secondary px-4 py-2 text-sm">
            ← Қайтадан
          </button>
          <div className="text-xl font-black text-brand-text">Ойындар дайын!</div>
        </div>
        <section className="space-y-4">
          <h3 className="text-2xl font-black text-brand-primary flex items-center gap-2"><Target className="w-6 h-6" /> Сәйкестендіру</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {content.matching.map((item: any, i: number) => (
              <div key={i} className="p-4 bg-brand-bg rounded-2xl border border-zinc-100 flex justify-between items-center">
                <span className="font-bold text-brand-text">{item.left}</span>
                <span className="text-zinc-400">↔</span>
                <span className="text-brand-muted text-right">{item.right}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-4">
          <h3 className="text-2xl font-black text-brand-primary flex items-center gap-2"><CheckCircle2 className="w-6 h-6" /> Шын немесе Жалған</h3>
          <div className="space-y-3">
            {content.trueFalse.map((item: any, i: number) => (
              <div key={i} className="p-4 bg-white border border-zinc-100 rounded-2xl flex justify-between items-center shadow-sm">
                <span className="font-medium text-brand-text pr-4">{item.question}</span>
                <div className={cn("px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest", item.answer ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                  {item.answer ? "Шын" : "Жалған"}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const inputCls = "w-full rounded-xl border border-zinc-200 bg-brand-bg/50 px-4 py-3 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium";

  return (
    <div className="space-y-12 max-w-5xl mx-auto px-4 mt-8 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="btn-secondary px-4 py-2 text-sm">← Артқа</button>
        <div className="badge-modern bg-brand-primary text-white px-6 py-2">AI Педагог</div>
      </div>

      {!selectedTool ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ToolCard title={t.games.lessonPlan.title} desc={t.games.lessonPlan.desc} icon={<FileText />} onClick={() => setSelectedTool('lessonPlan')} />
          <ToolCard title={t.games.presentation.title} desc={t.games.presentation.desc} icon={<Presentation />} onClick={() => setSelectedTool('presentation')} />
          <ToolCard title={t.games.quizGames.title} desc={t.games.quizGames.desc} icon={<Gamepad2 />} onClick={() => setSelectedTool('quizGames')} />
        </div>
      ) : selectedTool === 'presentation' ? (
        <div className="card-modern p-8 md:p-10 space-y-8 bg-white border border-zinc-100 shadow-2xl max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-black text-brand-text">Презентация жасау</h3>
            <p className="text-brand-muted font-medium">Кәсіби PowerPoint слайдтарын дайындау</p>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest pl-1">Сабақ тақырыбы *</label>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Мысалы: Абай Құнанбаев" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest pl-1">Слайд саны</label>
                <div className="flex gap-2">
                  {["6", "8", "10", "12"].map(count => (
                    <button
                      key={count}
                      onClick={() => setSlideCount(count)}
                      className={cn(
                        "flex-1 py-2 px-1 rounded-xl text-xs font-bold border transition-all",
                        slideCount === count
                          ? "bg-brand-primary text-white border-brand-primary"
                          : "bg-brand-bg text-brand-muted border-zinc-100 hover:border-zinc-300"
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest pl-1">Дизайн стилі</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => setPresentationTheme(key)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-left space-y-2",
                      presentationTheme === key
                        ? "border-brand-primary bg-brand-bg/20"
                        : "border-zinc-50 bg-brand-bg/50 hover:border-zinc-200"
                    )}
                  >
                    <div className="flex gap-1 h-3 rounded-md overflow-hidden">
                      <div className="flex-1" style={{ background: t.preview[0] }} />
                      <div className="flex-1" style={{ background: t.preview[1] }} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-brand-text">{t.label}</div>
                      <div className="text-[9px] text-brand-muted font-medium leading-none">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest pl-1">Қосымша нұсқаулар</label>
              <textarea
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
                placeholder="Мәліметтер, деректер немесе ерекше талаптар..."
                className={cn(inputCls, "min-h-[80px] resize-none")}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setSelectedTool(null)} className="flex-1 btn-secondary py-4">Болдырмау</button>
            <button onClick={handleGenerate} disabled={!topic.trim()} className="flex-[2] btn-primary py-4"><BrainCircuit className="w-5 h-5" />Презентация жасау</button>
          </div>
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2"><Info size={14} /> {error}</div>}
        </div>
      ) : selectedTool === 'lessonPlan' ? (
        <div className="card-modern p-8 md:p-10 space-y-8 bg-white border border-zinc-100 shadow-2xl max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-black text-brand-text">{tx.lessonHeading}</h3>
            <p className="text-brand-muted font-medium">{tx.lessonSub}</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1.5">{tx.fTitle}</label>
              <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder={tx.pTitle} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1.5">{tx.fModule}</label>
              <input value={form.module_} onChange={(e) => setForm({...form, module_: e.target.value})} placeholder={tx.pModule} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1.5">{tx.fTeacher}</label>
                <input value={form.teacher} onChange={(e) => setForm({...form, teacher: e.target.value})} placeholder={tx.pTeacher} className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1.5">{tx.fGroups}</label>
                <input value={form.groups} onChange={(e) => setForm({...form, groups: e.target.value})} placeholder={tx.pGroups} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1.5">{tx.fDate}</label>
                <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1.5">{tx.fType}</label>
                <select value={form.type_} onChange={(e) => setForm({...form, type_: e.target.value})} className={inputCls}>
                  <option value="">—</option>
                  {tx.types.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1.5">{tx.fDur}</label>
                <select value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} className={inputCls}>
                  {["45", "80", "90"].map((d) => <option key={d} value={d}>{d} мин</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button onClick={() => setSelectedTool(null)} className="flex-1 btn-secondary py-4">{tx.cancel}</button>
            <button onClick={handleGenerate} disabled={!form.title.trim()} className="flex-[2] btn-primary py-4"><BrainCircuit className="w-5 h-5" />{tx.generate}</button>
          </div>
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2"><Info size={14} /> {error}</div>}
        </div>
      ) : (
        <div className="card-modern p-8 md:p-12 space-y-8 bg-white border border-zinc-100 shadow-xl max-w-2xl mx-auto">
          <div className="space-y-2 text-center">
            <h3 className="text-3xl font-black text-brand-text">{t.games[selectedTool].title}</h3>
            <p className="text-brand-muted font-medium">{t.games[selectedTool].desc}</p>
          </div>
          <div className="space-y-4">
            <label className="text-sm font-black uppercase tracking-widest text-brand-text">Сабақ тақырыбы</label>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Мысалы: Фотосинтез процесі" className="w-full px-6 py-4 bg-brand-bg/50 border border-zinc-100 rounded-2xl text-lg font-medium focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all" />
          </div>
          <div className="flex gap-4">
            <button onClick={() => setSelectedTool(null)} className="flex-1 btn-secondary py-4">Болдырмау</button>
            <button onClick={handleGenerate} disabled={!topic.trim()} className="flex-[2] btn-primary py-4"><BrainCircuit className="w-6 h-6" />Жүктеу / Дайындау</button>
          </div>
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-2"><Info size={16} /> {error}</div>}
        </div>
      )}
    </div>
  );
}

function ToolCard({ title, desc, icon, onClick }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <motion.button whileHover={{ y: -8 }} onClick={onClick} className="card-modern p-8 text-left space-y-6 hover:shadow-2xl transition-all group border border-zinc-100 bg-white">
      <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">{React.cloneElement(icon as React.ReactElement<any>, { size: 32 })}</div>
      <div className="space-y-2">
        <h4 className="text-xl font-black text-brand-text group-hover:text-brand-primary transition-colors">{title}</h4>
        <p className="text-zinc-500 font-medium text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.button>
  );
}
