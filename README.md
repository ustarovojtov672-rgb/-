# Prilozyxa Calories

Приложение для трекинга калорий, макроэлементов и микроэлементов по сообщениям и фото еды. Первый экран объясняет продуктовый сценарий и содержит форму входа/регистрации.

## Стек

- Next.js App Router, TypeScript, Tailwind CSS
- shadcn/ui
- Capacitor с `webDir: "out"`
- Локальный Jazz `jazz-tools` для local-first данных
- Pi Coding Agent и `pi-codex-search` для поиска через Codex auth
- Nutrition agent для анализа еды через память, фото, OCR, локальную базу и web search
- `just-bash` как bash runtime для агентских сценариев

## Запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

Откройте `http://localhost:3000`.

Для реального AI-анализа заполните `OPENAI_API_KEY` в `.env.local` или системном окружении и перезапустите `npm run dev`.

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

## Локальный Jazz

Схема питания лежит в `src/lib/jazz/schema.ts`. Локальный режим описан в `Локальный jazz.tools/`: данные остаются в IndexedDB, синхронизация с Jazz Cloud отключена.

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

Серверный слой приложения уже выделен в `src/lib/nutrition-agent/`: туда приходит текст, фото, профиль, цель, дневные ориентиры и последние приемы пищи. `tool-plan.ts` собирает план инструментов для агента: текст, зрение, OCR, штрихкод, память, локальная база и web search. UI показывает черновик расчета, использованные инструменты, найденную еду, источники и предупреждение, если порцию нужно проверить вручную.

Форма авторизации отправляет данные на `/auth/start`. Этот endpoint должен быть реализован вместе с выбранным auth-потоком Jazz перед production-сборкой.
