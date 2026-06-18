# Jazz sync server

Эта папка фиксирует единую sync-архитектуру Jazz для приложения.

- Данные хранятся в IndexedDB браузера как local-first копия.
- Синхронизация всегда включена через `sync.when = "always"`.
- В разработке sync peer указывает на локальный сервер `ws://127.0.0.1:4200`.
- На production меняется только `NEXT_PUBLIC_JAZZ_SYNC_PEER`, схема данных и клиентский код остаются теми же.
- Схема дневника питания лежит в `../src/lib/jazz/schema.ts`.
- Provider подключен в `../src/components/jazz-sync-provider.tsx`.
