# AI CRAFTS

Статичный сайт + одна serverless-функция (`api/chat.js`). Хостинг: GitHub → Vercel.

## Структура

    index.html, admin.html   страницы
    config.js                публичные настройки (Supabase, Telegram)
    css/                     fonts.css, site.css, admin.css
    js/                      preloader.js, i18n.js (переводы RU/EN), hero3d.js (3D-сцена, WebGL), site.js, game.js, admin.js
    fonts/                   шрифты (скачиваются скриптом)
    api/chat.js              чат-консультант (Groq)
    vercel.json              заголовки безопасности и CSP
    security.sql             ограничения бакета (по желанию)
    404.html, robots.txt     страница ошибки и правила для поисковиков

## Перед деплоем

1. Шрифты: `node scripts/get-fonts.mjs` (нужен Node 18+). Появятся 6 файлов в `fonts/` (Unbounded, Onest, JetBrains Mono); закоммитьте их.
2. Vercel → Settings → Environment Variables: `GROQ_API_KEY` (обязательно), `GROQ_MODEL`, `GROQ_MAX_TOKENS` (по желанию). Затем Redeploy. Без ключа чат отвечает по FAQ.
3. Если сменится адрес Supabase, поправьте его в `config.js` и в CSP (`vercel.json`).

## Безопасность

- Репозиторий держите Private. Секреты только в переменных окружения Vercel.
- В `config.js` лежит только публичный publishable-ключ Supabase; доступ защищён RLS (`supabase.sql`).
- Supabase → Authentication: отключите публичные регистрации (Sign-ups), оставьте одного админа.
- Сессия админки живёт до закрытия вкладки.
- Ключ, который попадал в переписку или код, перевыпустите (Groq → API Keys).
- На сайте для Германии нужны Impressum и политика конфиденциальности (`PRIVACY_URL` в `config.js`).

## Дизайн (r23)

- Главный экран: 3D-киноплёнка на чистом WebGL (`js/hero3d.js`), без библиотек. Положение и размер объекта задаются в `css/site.css` переменными `--gx`, `--gy`, `--gs` у `.hero-gl` (отдельно для телефона и компьютера). Без WebGL показывается запасная SVG-графика.
- Загрузка (`js/preloader.js`): процент считается по реальной готовности шрифтов, 3D-сцены, списка работ и страницы.
- Шоурил: секция появляется только когда видео загружено в админке или указано в `config.js`.
- Заявки: только Telegram, прямая ссылка из `config.js`. Формы с автоматической отправкой через бота нет.
