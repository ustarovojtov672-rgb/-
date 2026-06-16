# Prilozyxa Calories

Приложение для трекинга калорий, макроэлементов и микроэлементов по сообщениям и фото еды. Первый экран объясняет продуктовый сценарий и содержит форму входа/регистрации.

## Стек

- Next.js App Router, TypeScript, Tailwind CSS
- shadcn/ui
- Capacitor с `webDir: "out"`
- Локальный Jazz `jazz-tools` для local-first данных
- Pi Coding Agent и `pi-codex-search` для поиска через Codex auth
- `just-bash` как bash runtime для агентских сценариев

## Запуск

```bash
npm install
npm run dev
```

Откройте `http://localhost:3000`.

## Проверка и сборка

```bash
npm run lint
npm run build
npm run start
```

`npm run build` собирает статический экспорт в `out`, а `npm run start` раздает эту папку через `serve`.

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

Форма авторизации отправляет данные на `/auth/start`. Этот endpoint должен быть реализован вместе с выбранным auth-потоком Jazz перед production-сборкой.
