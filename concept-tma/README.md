# CONCEPT ADS — Telegram Mini App

UGC-маркетплейс для брендов и креаторов Казахстана.

---

## Стек
- **Frontend:** React + TypeScript + Vite (Liquid Glass, iOS 26)
- **Backend:** Node.js + Express + SQLite
- **Bot:** node-telegram-bot-api
- **Деплой:** Railway

---

## Запуск локально

### 1. Backend
```bash
cd backend
npm install
# Отредактируй .env — вставь свой BOT_TOKEN и ADMIN_TG_ID
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Открой: http://localhost:5173

---

## Деплой на Railway

### Шаг 1 — Создай аккаунт
Зайди на railway.app, войди через GitHub.

### Шаг 2 — Создай проект
- New Project → Deploy from GitHub repo
- Загрузи папку concept-tma на GitHub (бесплатно)
- Подключи репозиторий в Railway

### Шаг 3 — Переменные окружения
В Railway → Variables добавь:
```
BOT_TOKEN=8652237482:AAGvgnLLo51YQWsKdqQlFp2_uRR3qJTUreE
NODE_ENV=production
APP_URL=https://ВАШ_ДОМЕН.railway.app
ADMIN_TG_ID=ВАШ_TELEGRAM_ID
ADMIN_SECRET=concept2024secret
PORT=3001
```

### Шаг 4 — Узнай свой Telegram ID
Напиши @userinfobot в Telegram. Он ответит твоим ID.

### Шаг 5 — Сделай себя администратором
После деплоя выполни в терминале:
```bash
curl -X POST https://ВАШ_ДОМЕН.railway.app/api/admin/set-admin \
  -H "Content-Type: application/json" \
  -d '{"secret":"concept2024secret","telegram_id":"ВАШ_ID"}'
```

### Шаг 6 — Подключи Mini App к боту
1. Открой @BotFather в Telegram
2. /mybots → @Concept_ads_bot → Bot Settings → Menu Button
3. Set URL: https://ВАШ_ДОМЕН.railway.app
4. Set Title: 🚀 Открыть CONCEPT ADS

---

## Структура проекта

```
concept-tma/
├── backend/
│   ├── src/
│   │   ├── bot/index.js       — Telegram бот + уведомления
│   │   ├── db/schema.js       — SQLite БД (12 таблиц)
│   │   ├── middleware/auth.js — Авторизация Telegram WebApp
│   │   ├── routes/
│   │   │   ├── auth.js        — /api/auth
│   │   │   ├── creators.js    — /api/creators
│   │   │   ├── business.js    — /api/business
│   │   │   └── admin.js       — /api/admin
│   │   └── index.js           — Express сервер
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/index.ts       — API клиент
│   │   ├── store/index.ts     — Zustand store
│   │   ├── components/Tabs.tsx — Табы для всех ролей
│   │   ├── pages/
│   │   │   ├── creator/       — 4 страницы
│   │   │   ├── business/      — 4 страницы
│   │   │   └── admin/         — 5 страниц
│   │   ├── App.tsx            — Роутинг по ролям
│   │   └── index.css          — Liquid Glass дизайн
│   └── package.json
├── railway.toml               — Конфиг деплоя
└── README.md
```

---

## Роли и функции

### Креатор
- Регистрация 3 шага (Instagram/TikTok ≥1000, Threads без ограничений)
- Видит ВСЕ офферы, откликается только на совпадающую платформу
- Загружает контент по ссылке
- Баллы: лайк=20, комментарий=30 (1000=500₸, 2000=1000₸)
- Реферальная программа: промокод, 5 рефералов = 5000₸

### Бизнес
- Регистрация бренда
- Создание проектов (описание, продукт, что показать, длина, стиль)
- Бизнес НЕ видит каталог — команда подбирает
- Принятие/правки контента (до 3 правок)

### Администратор
- Статистика дашборд
- Модерация: одобрить/отклонить с причиной
- Редактирование офферов (дополнение от команды) → активация
- Подбор креаторов из откликов
- Управление статусами проектов
- Реферальная таблица + уведомления о выплатах

---

## API эндпоинты

```
POST /api/auth/login
GET/POST /api/creators/*
GET/POST /api/business/*
GET/POST /api/admin/*  (только admin роль)
POST /api/admin/set-admin  (первичная настройка)
GET /health
```

## Жизненный цикл проекта
new → in_progress → review → revision/done → paid → closed

## Комиссия
20% при статусе "paid" (автоматически)
