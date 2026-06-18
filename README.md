# Prilozyxa Calories

Приложение для трекинга калорий, макроэлементов и микроэлементов по сообщениям и фото еды. Первый экран объясняет продуктовый сценарий и содержит форму входа/регистрации.

## Стек

- Next.js App Router, TypeScript, Tailwind CSS
- shadcn/ui
- Capacitor с `webDir: "out"`
- Jazz `jazz-tools` + локально запущенный sync-сервер для будущей облачной синхронизации
- Pi Coding Agent: один nutrition agent с памятью, фото, OCR, локальной базой и `codex_search`
- `just-bash` как bash runtime для агентских сценариев

## Запуск

Подготовьте зависимости и env:

```bash
npm install
cp .env.example .env.local
```

В первом терминале запустите локальный Jazz sync-сервер:

```bash
npm run jazz:sync
```

Он слушает `ws://127.0.0.1:4200` и хранит данные в `.jazz-sync/storage.db`.

Во втором терминале один раз подготовьте серверную авторизацию:

```bash
npm run auth:setup
```

Скрипт создает служебный Jazz-аккаунт для серверной авторизации и записывает его ключи в `.env.local`. Эти ключи не попадают в git.

После этого в том же втором терминале запустите приложение:

```bash
npm run dev
```

Откройте `http://localhost:3000`.

Для реального AI-анализа настройте один из runtime ниже и перезапустите `npm run dev`.

По умолчанию `/api/analyze-meal` использует локальный Pi-агент питания:

```env
NUTRITION_AGENT_RUNTIME=pi
PI_NUTRITION_AGENT_PROVIDER=openai-codex
PI_NUTRITION_AGENT_MODEL=gpt-5.5
```

Для Pi-режима сначала выполните `npm run nutrition-agent:login`, затем внутри Pi выполните `/login openai-codex`. Если нужен прямой OpenAI API без Pi, поставьте `NUTRITION_AGENT_RUNTIME=openai` и заполните `OPENAI_API_KEY`.

## Проверка и сборка

```bash
npm run lint
npm run build
npm run start
```

`npm run build` проверяет web/server-сборку Next.js. `npm run build:mobile` собирает статический экспорт в `out` для Capacitor.

## Capacitor

```bash
npm run cap:copy
npm run cap:sync
```

Перед добавлением нативных платформ установите нужный пакет Capacitor и выполните официальный CLI:

```bash
npm install @capacitor/android
npx cap add android
```

## Jazz Sync

Схема питания лежит в `src/lib/jazz/schema.ts`. Приложение не делит данные на локальный и облачный режимы: клиент всегда использует Jazz sync peer из `NEXT_PUBLIC_JAZZ_SYNC_PEER`.

Для разработки это локальный сервер:

```env
NEXT_PUBLIC_JAZZ_SYNC_PEER=ws://127.0.0.1:4200
```

Когда сервер переедет на VPS или другой хостинг, меняется только этот URL, а схема данных и UI остаются теми же.

## Авторизация

Форма авторизации в шапке использует реальный email/password вход через Better Auth. Аккаунты, сессии и Jazz-ключи пользователя хранятся через Jazz auth adapter на текущем sync-сервере, поэтому локальный сервер уже работает как будущее облако разработки.

Для локальной разработки нужны переменные:

```env
JAZZ_AUTH_SYNC_PEER=ws://127.0.0.1:4200
BETTER_AUTH_URL=http://127.0.0.1:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://127.0.0.1:3000
BETTER_AUTH_SECRET=...
JAZZ_AUTH_WORKER_ACCOUNT=...
JAZZ_AUTH_WORKER_SECRET=...
```

Если `.env.local` потерялся или нужно пересоздать служебный аккаунт, остановите приложение, убедитесь что `npm run jazz:sync` запущен, затем выполните:

```bash
npm run auth:setup
```

## Pi nutrition agent

Локальный агент питания лежит в `Аi агент питания/`. Это единственный Pi-агент приложения: web search подключен к нему как skill и инструмент `codex_search`, а не как отдельный агент.

```bash
npm run pi:install-codex-search
npm run nutrition-agent:login
npm run nutrition-agent:run -- "На фото упаковка творога, нужно посчитать 200 г"
```

`npm run pi:install-codex-search` устанавливает project-local пакет `npm:pi-codex-search`, чтобы основной агент мог искать через Codex auth.

Серверный слой приложения уже выделен в `src/lib/nutrition-agent/`: туда приходит текст, фото, профиль, цель, дневные ориентиры, подтвержденная память блюд и последние приемы пищи. `tool-plan.ts` собирает план инструментов для одного агента: текст, зрение, OCR, штрихкод, память, локальная база и web search. `pi-agent.ts` подключает Pi SDK к `/api/analyze-meal`, передает фото как image input и использует локальное хранилище авторизации из `Аi агент питания/.pi-agent/`. UI показывает черновик расчета, использованные инструменты, найденную еду, источники, похожие подтвержденные блюда и предупреждение, если порцию нужно проверить вручную. После сохранения проверенная еда попадает в Jazz-память аккаунта и используется в следующих анализах.
