# Оқу кеңістігі — Бақытжанов Бекет Қайратұлы

Python, Scratch, Сандық әдістер және АКТ бойынша интерактивті сабақтар, оқытушы панелі, студент журналы және UstazAI құралдары. Бәрі бір Cloudflare Worker-де жұмыс істейді (`bbk-courses`): статикалық бет + API + D1 дерекқоры.

## Құрылым

```
index.html, python/, scratch/, sandyq-adister/, akt/   студент беттері (сабақтар)
journal/                       студенттің жеке журналы (/journal/)
tools/ , src/ustazai/          көмекші құралдар; UstazAI (React) → tools/ustazai/ ішіне жиналады
teacher/                       оқытушы панелі: Топтар, Журнал, Сабақ, Үй жұмысы, Архив, Курс студиясы
assets/                        ортақ стильдер мен модульдер (learner*, python-*, join.js, py-work.js, my-journal.js)
src/                           Worker: index.js (маршруттар), classes.js, accounts.js, practice.js, plan-import.js, grading, py*.js
test/                          Node тесттері, scripts/ — құрастыру және іске қосу скрипттері
```

## Негізгі ұғымдар

- **Топ + пән.** Топ пәнсіз құрылмайды. Топ+пән жұбы — журналдың бірлігі (`progress_courses`).
- **Студент аккаунты.** Логин мен парольді оқытушы береді (Топтар бөлімі). Аккаунтсыз да сабаққа кодпен кіруге болады.
- **Журнал.** Google Sheets сілтемесінен импортталады (кесте сілтемесі бар кез келген адамға ашық болуы керек), ұяшықтар қолмен түзетіледі. Сайттағы сабақ баллдары мен Python жаттығу нәтижелері автоматты бөлек бағандар болып қосылады.
- **Жаттығу нәтижесі.** Студент логинімен кірсе, Python жаттығуының жауабы серверде қайта тексеріліп (`/api/account/practice`) мұғалімге көрінеді.
- **Пән жоспары.** Word/Excel файлынан тақырыптар оқылады (қаласа Gemini-мен).
- Оқытушы панелінің толық сипаттамасы: [teacher/README.md](teacher/README.md).

## Жергілікті іске қосу

```powershell
node scripts/devsite.mjs
npx wrangler dev -c wrangler.dev.jsonc --port 8788 --local --persist-to .wrangler/local
```

`.dev.vars` ішінде `TEACHER_PASSWORD=…` және (қаласаң) `GEMINI_STUB=1` болуы керек. Тікелей Gemini үшін `GEMINI_API_KEY` қос. UstazAI-ды жергілікті көру үшін алдымен `npm run build:ustazai` орында.

## Тексеру

```powershell
npm test          # серверсіз бірлік тесттер
```

`test/*.api.test.mjs` және `test/api.test.mjs` жұмыс істеп тұрған `wrangler dev` серверін қажет етеді (файл басындағы нұсқаулықты қара).

## Сайтқа шығару

`main` тармағына push жасаса, Cloudflare өздігінен жинап шығарады (`wrangler.jsonc`: UstazAI жинау командасы бар). Дерекқор кестелері алғашқы сұраныста өздігінен жаңарады (`ensureSchema`).

> `wrangler.jsonc`-қа R2 (`bbk-media`) қосылымын тек Cloudflare-де бакет жасалған соң қос, әйтпесе деплой құлайды.

## Құпия мәліметтер

Gemini кілті, оқытушы құпиясөзі және студент деректері репозиторийге жазылмайды: оларды Cloudflare құпиялары мен `.dev.vars` (git-те жоқ) ұстайды. `tmp/`, `output/`, `backups/` қалталары git-ке кірмейді.
