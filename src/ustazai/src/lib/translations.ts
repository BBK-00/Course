export type Language = 'kz' | 'ru' | 'en';

export const translations = {
  kz: {
    nav: {
      games: 'Ойындар',
      teachers: 'Мұғалімдерге',
      about: 'Біз туралы',
      login: 'Кіру',
      logout: 'Шығу'
    },
    hero: {
      badge: 'AI + Білім платформасы',
      title1: 'Ойнай отырып',
      title2: 'Білім ал!',
      subtitle: 'Интерактивті ойындар арқылы мектеп пәндерін оңай және қызықты үйрен',
      startBtn: 'Ойындарды бастау',
      teacherBtn: 'Мұғалімдерге →'
    },
    stats: {
      games: 'Интерактивті ойын',
      tech: 'Технология',
      version: 'Негізгі нұсқа',
      language: 'Толық қазақша'
    },
    footer: {
      desc: 'Қазақстандық мұғалімдер мен оқушыларға арналған заманауи білім платформасы. Ойын арқылы білім алуды жеңілдетеміз.',
      platform: 'Платформа',
      games: 'Ойындар',
      teachers: 'Мұғалімдерге',
      news: 'Жаңалықтар',
      change: 'Өзгерту'
    },
    games: {
      tugofwar: { title: 'Арқан тартыс', desc: 'Командалық жарыс арқылы білімді тексеру.' },
      camera: { title: 'Камера Ойындары', desc: 'AI көмегімен оқушыларды қызықты таңдау.' },
      letterbuilder: { title: 'Әріп Құрастыру', desc: 'Сөздік қорды дамытуға арналған жаттығу.' },
      sackrace: { title: 'Қаппен жарыс', desc: 'Математикалық есептерді жылдам шығару жарысы.' },
      hangman: { title: 'Сөзді тап', desc: 'Жасырын сөзді әріптер арқылы табу.' },
      memory: { title: 'Есте сақтау', desc: 'Зейін мен есте сақтау қабілетін шыңдау.' },
      colormatch: { title: 'Түсті тап!', desc: 'Концентрацияны жақсартуға арналған ойын.' },
      groupsplitter: { title: 'Топқа бөлу', desc: 'Оқушыларды топтарға жылдам бөлу.' },
      randompicker: { title: 'Кездейсоқ таңдау', desc: 'Сұрақ қою үшін оқушыны әділ таңдау.' },
      lessontimer: { title: 'Сабақ таймері', desc: 'Сабақ уақытын тиімді басқару.' },
      assessment: { title: 'Оқушыларды бағалау', desc: 'Оқушыларға балл қою және топқа бөлу.' },
      reflection: { title: 'Рефлексия', desc: 'Сабақ соңында оқушылардың пікірін білу.' },
      lessonPlan: { title: 'ҚМЖ Жасау', desc: 'Сабақ тақырыбы бойынша толық ҚМЖ дайындау.' },
      presentation: { title: 'Презентация', desc: 'AI арқылы слайдтар мен презентация жасау.' },
      quizGames: { title: 'Викторина Ойындары', desc: 'Сәйкестендіру, Шын/Жалған ойындарын жасау.' }
    },
    sections: {
      interactive: 'Интерактивті оқыту әдістері',
      interactiveSub: 'Оқушылардың қызығушылығын арттыратын ойын элементтері',
      cognitive: 'Зейін мен танымдық қабілеттерді дамыту',
      cognitiveSub: 'Оқушылардың когнитивті функцияларын шыңдауға арналған жаттығулар',
      tools: 'Сабақты ұйымдастыру құралдары',
      toolsSub: 'Мұғалім жұмысын жеңілдететін цифрлық көмекшілер',
      aiPedagog: 'AI Педагог',
      aiPedagogSub: 'Жасанды интеллект арқылы сабақ жоспарлау және материалдар дайындау'
    },
    setup: {
      title: 'Ойынды баптау',
      materialLabel: 'Оқу материалы немесе тақырып',
      materialPlaceholder: 'Мәтінді осында енгізіңіз немесе файл жүктеңіз...',
      uploadBtn: 'Файл жүктеу',
      generateBtn: 'Сұрақтарды дайындау',
      generating: 'AI сұрақтарды құрастыруда...',
      ready: 'Ойын дайын!',
      startBtn: 'Бастау'
    },
    reflection: {
      selectTitle: 'Рефлексия түрін таңдаңыз',
      selectSub: 'Сабақ соңында қолдануға ыңғайлы әдісті таңдаңыз',
      classic: 'Классикалық',
      classicSub: 'Карточкалар арқылы кері байланыс алу',
      tree: 'Эмоция ағашы',
      treeSub: 'Ағаш деңгейлері арқылы бағалау',
      back: 'Артқа',
      reset: 'Тазарту',
      understood: { title: 'Керемет!', sub: 'Бәрін түсіндім' },
      questions: { title: 'Сұрақтар бар', sub: 'Көмек қажет' },
      difficult: { title: 'Қиын болды', sub: 'Түсінбедім' },
      vote: 'Таңдау',
      votesCount: 'Дауыс саны',
      share: 'Үлесі',
      overallResult: 'Жалпы нәтиже',
      votes: 'дауыс',
      toolName: 'Рефлексия құралы',
      high: 'Жоғары',
      middle: 'Орта',
      low: 'Төмен',
      todayLesson: 'Бүгінгі сабақ',
      howWas: 'қалай өтті?'
    },
    tools: {
      groupsplitter: {
        title: 'Топқа бөлу',
        sub: 'Оқушыларды топтарға жылдам бөлу',
        inputLabel: 'Оқушылар тізімі',
        inputPlaceholder: 'Есімдерді үтір арқылы немесе жаңа жолдан енгізіңіз...',
        groupCount: 'Топтар саны',
        splitBtn: 'Топтарға бөлу',
        resetBtn: 'Тазарту'
      },
      randompicker: {
        title: 'Кездейсоқ таңдау',
        sub: 'Сұрақ қою үшін оқушыны әділ таңдау',
        inputLabel: 'Оқушылар тізімі',
        inputPlaceholder: 'Есімдерді енгізіңіз...',
        pickBtn: 'Оқушыны таңдау',
        winner: 'Таңдалған оқушы'
      },
      lessontimer: {
        title: 'Сабақ таймері',
        sub: 'Сабақ уақытын тиімді басқару',
        start: 'Бастау',
        pause: 'Тоқтату',
        reset: 'Тазарту',
        timeUp: 'Уақыт аяқталды!'
      },
      assessment: {
        title: 'Оқушыларды бағалау',
        sub: 'Оқушыларға балл қою және топқа бөлу',
        maxScore: 'Макс. балл',
        addStudent: 'Оқушы қосу',
        studentName: 'Оқушы есімі',
        total: 'Қорытынды'
      }
    }
  },
  ru: {
    nav: {
      games: 'Игры',
      teachers: 'Учителям',
      about: 'О нас',
      login: 'Войти',
      logout: 'Выйти'
    },
    hero: {
      badge: 'AI + Образовательная платформа',
      title1: 'Учись',
      title2: 'играя!',
      subtitle: 'Изучай школьные предметы легко и интересно через интерактивные игры',
      startBtn: 'Начать игры',
      teacherBtn: 'Учителям →'
    },
    stats: {
      games: 'Интерактивных игр',
      tech: 'Технология',
      version: 'Базовая версия',
      language: 'Полностью на русском'
    },
    footer: {
      desc: 'Современная образовательная платформа для казахстанских учителей и учеников. Мы облегчаем обучение через игру.',
      platform: 'Платформа',
      games: 'Игры',
      teachers: 'Учителям',
      news: 'Новости',
      change: 'Изменить'
    },
    games: {
      tugofwar: { title: 'Перетягивание каната', desc: 'Проверка знаний через командное соревнование.' },
      camera: { title: 'Камера Игры', desc: 'Интересный выбор учеников с помощью AI.' },
      letterbuilder: { title: 'Конструктор букв', desc: 'Упражнение для развития словарного запаса.' },
      sackrace: { title: 'Гонка в мешках', desc: 'Соревнование по быстрому решению математических задач.' },
      hangman: { title: 'Найди слово', desc: 'Поиск скрытого слова по буквам.' },
      memory: { title: 'Память', desc: 'Развитие внимания и способности к запоминанию.' },
      colormatch: { title: 'Найди цвет!', desc: 'Игра для улучшения концентрации.' },
      groupsplitter: { title: 'Деление на группы', desc: 'Быстрое распределение учеников по группам.' },
      randompicker: { title: 'Случайный выбор', desc: 'Справедливый выбор ученика для ответа.' },
      lessontimer: { title: 'Таймер урока', desc: 'Эффективное управление временем урока.' },
      assessment: { title: 'Оценка учеников', desc: 'Выставление баллов и деление на группы.' },
      reflection: { title: 'Рефлексия', desc: 'Узнайте мнение учеников в конце урока.' },
      lessonPlan: { title: 'Создание КСП', desc: 'Подготовка полного КСП по теме урока.' },
      presentation: { title: 'Презентация', desc: 'Создание слайдов и презентаций через AI.' },
      quizGames: { title: 'Викторины', desc: 'Создание игр на сопоставление и Да/Нет.' }
    },
    sections: {
      interactive: 'Интерактивные методы обучения',
      interactiveSub: 'Игровые элементы для повышения интереса учащихся',
      cognitive: 'Развитие внимания и когнитивных способностей',
      cognitiveSub: 'Упражнения для оттачивания когнитивных функций учащихся',
      tools: 'Инструменты организации урока',
      toolsSub: 'Цифровые помощники, облегчающие работу учителя',
      aiPedagog: 'AI Педагог',
      aiPedagogSub: 'Планирование уроков и подготовка материалов с помощью ИИ'
    },
    setup: {
      title: 'Настройка игры',
      materialLabel: 'Учебный материал или тема',
      materialPlaceholder: 'Введите текст здесь или загрузите файл...',
      uploadBtn: 'Загрузить файл',
      generateBtn: 'Подготовить вопросы',
      generating: 'AI составляет вопросы...',
      ready: 'Игра готова!',
      startBtn: 'Начать'
    },
    reflection: {
      selectTitle: 'Выберите вид рефлексии',
      selectSub: 'Выберите удобный метод для конца урока',
      classic: 'Классическая',
      classicSub: 'Обратная связь через карточки',
      tree: 'Дерево эмоций',
      treeSub: 'Оценка через уровни дерева',
      back: 'Назад',
      reset: 'Сброс',
      understood: { title: 'Понял!', sub: 'Все было понятно' },
      questions: { title: 'Есть вопросы', sub: 'Нужно больше объяснений' },
      difficult: { title: 'Было сложно', sub: 'Нужна помощь' },
      vote: 'Выбрать',
      votesCount: 'Кол-во голосов',
      share: 'Доля',
      overallResult: 'Общий результат',
      votes: 'голосов',
      toolName: 'Инструмент рефлексии',
      high: 'Высоко',
      middle: 'Средне',
      low: 'Низко',
      todayLesson: 'Как прошел',
      howWas: 'сегодняшний урок?'
    },
    tools: {
      groupsplitter: {
        title: 'Деление на группы',
        sub: 'Быстрое распределение учеников по группам',
        inputLabel: 'Список учеников',
        inputPlaceholder: 'Введите имена через запятую или с новой строки...',
        groupCount: 'Количество групп',
        splitBtn: 'Разделить на группы',
        resetBtn: 'Сброс'
      },
      randompicker: {
        title: 'Случайный выбор',
        sub: 'Справедливый выбор ученика для ответа',
        inputLabel: 'Список учеников',
        inputPlaceholder: 'Введите имена...',
        pickBtn: 'Выбрать ученика',
        winner: 'Выбранный ученик'
      },
      lessontimer: {
        title: 'Таймер урока',
        sub: 'Эффективное управление временем урока',
        start: 'Старт',
        pause: 'Пауза',
        reset: 'Сброс',
        timeUp: 'Время вышло!'
      },
      assessment: {
        title: 'Оценка учеников',
        sub: 'Выставление баллов и деление на группы',
        maxScore: 'Макс. балл',
        addStudent: 'Добавить ученика',
        studentName: 'Имя ученика',
        total: 'Итого'
      }
    }
  },
  en: {
    nav: {
      games: 'Games',
      teachers: 'For Teachers',
      about: 'About Us',
      login: 'Login',
      logout: 'Logout'
    },
    hero: {
      badge: 'AI + Education Platform',
      title1: 'Learn while',
      title2: 'Playing!',
      subtitle: 'Learn school subjects easily and interestingly through interactive games',
      startBtn: 'Start Games',
      teacherBtn: 'For Teachers →'
    },
    stats: {
      games: 'Interactive Games',
      tech: 'Technology',
      version: 'Basic Version',
      language: 'Fully in English'
    },
    footer: {
      desc: 'A modern educational platform for Kazakhstani teachers and students. We make learning easier through play.',
      platform: 'Platform',
      games: 'Games',
      teachers: 'Teachers',
      news: 'News',
      change: 'Change'
    },
    games: {
      tugofwar: { title: 'Tug of War', desc: 'Testing knowledge through team competition.' },
      camera: { title: 'Camera Games', desc: 'Fun student selection using AI.' },
      letterbuilder: { title: 'Letter Builder', desc: 'Exercise for vocabulary development.' },
      sackrace: { title: 'Sack Race', desc: 'Math problem solving competition.' },
      hangman: { title: 'Word Search', desc: 'Finding hidden words by letters.' },
      memory: { title: 'Memory', desc: 'Sharpening attention and memory skills.' },
      colormatch: { title: 'Color Match!', desc: 'Game to improve concentration.' },
      groupsplitter: { title: 'Group Splitter', desc: 'Quickly split students into groups.' },
      randompicker: { title: 'Random Picker', desc: 'Fair student selection for questions.' },
      lessontimer: { title: 'Lesson Timer', desc: 'Effective lesson time management.' },
      assessment: { title: 'Student Assessment', desc: 'Grading and grouping students.' },
      reflection: { title: 'Reflection', desc: 'Get student feedback at the end of the lesson.' },
      lessonPlan: { title: 'Lesson Planning', desc: 'Prepare full lesson plans (KSP) by topic.' },
      presentation: { title: 'Presentation', desc: 'Create slides and presentations via AI.' },
      quizGames: { title: 'Quiz Games', desc: 'Create matching and True/False games.' }
    },
    sections: {
      interactive: 'Interactive Learning Methods',
      interactiveSub: 'Game elements to increase student interest',
      cognitive: 'Attention and Cognitive Development',
      cognitiveSub: 'Exercises to sharpen students\' cognitive functions',
      tools: 'Lesson Organization Tools',
      toolsSub: 'Digital assistants to simplify teacher\'s work',
      aiPedagog: 'AI Educator',
      aiPedagogSub: 'Lesson planning and material preparation using AI'
    },
    setup: {
      title: 'Game Setup',
      materialLabel: 'Learning Material or Topic',
      materialPlaceholder: 'Enter text here or upload a file...',
      uploadBtn: 'Upload File',
      generateBtn: 'Prepare Questions',
      generating: 'AI is generating questions...',
      ready: 'Game is ready!',
      startBtn: 'Start'
    },
    reflection: {
      selectTitle: 'Choose Reflection Type',
      selectSub: 'Select a method suitable for the end of the lesson',
      classic: 'Classic',
      classicSub: 'Feedback via cards',
      tree: 'Emotion Tree',
      treeSub: 'Assessment via tree levels',
      back: 'Back',
      reset: 'Reset',
      understood: { title: 'Understood!', sub: 'I understood everything' },
      questions: { title: 'Have questions', sub: 'Need more explanation' },
      difficult: { title: 'It was difficult', sub: 'Need help' },
      vote: 'Select',
      votesCount: 'Votes count',
      share: 'Share',
      overallResult: 'Overall result',
      votes: 'votes',
      toolName: 'Reflection tool',
      high: 'High',
      middle: 'Middle',
      low: 'Low',
      todayLesson: 'How was',
      howWas: "today's lesson?"
    },
    tools: {
      groupsplitter: {
        title: 'Group Splitter',
        sub: 'Split students into groups quickly',
        inputLabel: 'Student List',
        inputPlaceholder: 'Enter names separated by commas or new lines...',
        groupCount: 'Number of Groups',
        splitBtn: 'Split into Groups',
        resetBtn: 'Reset'
      },
      randompicker: {
        title: 'Random Picker',
        sub: 'Fairly select a student for a question',
        inputLabel: 'Student List',
        inputPlaceholder: 'Enter names...',
        pickBtn: 'Pick a Student',
        winner: 'Selected Student'
      },
      lessontimer: {
        title: 'Lesson Timer',
        sub: 'Manage lesson time effectively',
        start: 'Start',
        pause: 'Pause',
        reset: 'Reset',
        timeUp: 'Time is up!'
      },
      assessment: {
        title: 'Student Assessment',
        sub: 'Grade and group students',
        maxScore: 'Max Score',
        addStudent: 'Add Student',
        studentName: 'Student Name',
        total: 'Total'
      }
    }
  }
};
