# Prilozyxa Calories

Приложение для трекинга калорий, макроэлементов и микроэлементов по сообщениям и фото еды. Первый экран объясняет продуктовый сценарий и содержит форму входа/регистрации.

## Стек

- Next.js App Router, TypeScript, Tailwind CSS
- shadcn/ui
- Capacitor с `webDir: "out"`
- Jazz `jazz-tools` + локально запущенный sync-сервер для будущей облачной синхронизации
- Pi Coding Agent и `pi-codex-search` для поиска через Codex auth
- Nutrition agent для анализа еды через память, фото, OCR, локальную базу и web search
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

Во втором терминале запустите приложение:

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

## Pi Codex search

Project-local установка поиска через Codex auth:

```bash
npm run pi:install-codex-search
```

Скрипт выполняет:

```bash
pi install npm:pi-codex-search -l --approve
```

Локальный агент лежит в `Аi агент для поиска/`.

```bash
npm run agent:login
npm run agent:search -- "что изменилось в Next.js static export"
```

## Pi nutrition agent

Локальный агент питания лежит в `Аi агент питания/`.

```bash
npm run nutrition-agent:login
npm run nutrition-agent:run -- "На фото упаковка творога, нужно посчитать 200 г"
```

Серверный слой приложения уже выделен в `src/lib/nutrition-agent/`: туда приходит текст, фото, профиль, цель, дневные ориентиры и последние приемы пищи. `tool-plan.ts` собирает план инструментов для агента: текст, зрение, OCR, штрихкод, память, локальная база и web search. `pi-agent.ts` подключает Pi SDK к `/api/analyze-meal`, передает фото как image input и использует локальное хранилище авторизации из `Аi агент питания/.pi-agent/`. UI показывает черновик расчета, использованные инструменты, найденную еду, источники и предупреждение, если порцию нужно проверить вручную.

Форма авторизации в шапке использует Jazz DemoAuth: email становится именем Jazz-аккаунта, а дневник хранится в `account.root` этого аккаунта и синхронизируется через текущий `NEXT_PUBLIC_JAZZ_SYNC_PEER`. Список известных email хранится на устройстве в browser storage, поэтому перед production-сборкой этот слой нужно заменить на серверную авторизацию без изменения схемы дневника.
