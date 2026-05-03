# Trainer Client App

React + Vite приложение для тренера: CRM, лиды, запись, шаблоны, площадки и клиентская страница `/razbor`.

## Локальный запуск

```bash
npm install
npm run dev
```

Открыть CRM:

```text
http://127.0.0.1:5173/
```

Открыть клиентскую страницу:

```text
http://127.0.0.1:5173/razbor
```

## Деплой на Vercel

Build Command:

```bash
npm run build
```

Output Directory:

```text
dist
```

Файл `vercel.json` нужен, чтобы ссылка `/razbor` открывалась напрямую и не давала 404.

## Важно

Сейчас заявки сохраняются в localStorage браузера. После публикации в интернете форму нужно подключить к базе данных: Supabase, Firebase, Google Sheets или Airtable.
