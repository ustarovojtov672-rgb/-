# Аi агент для поиска

Локальный агент поиска на `pi-coding-agent`.

## Что используется

- Provider: `openai-codex`
- Model: `openai-codex/gpt-5.5`
- Search tool: `codex_search` из project-local Pi package `npm:pi-codex-search`
- Search skill: `skills/codex-search/SKILL.md`
- Auth: `/login openai-codex` внутри Pi

## Логин

```bash
npm run agent:login
```

В открывшемся Pi выполните:

```text
/login openai-codex
```

Выберите ChatGPT Plus/Pro Codex provider. Токены сохраняются локально в `.pi-agent/` внутри этой папки и игнорируются git.

## Поиск

```bash
npm run agent:search -- "найди свежую документацию по Jazz local-first auth"
```

Если аргумент не передан, агент использует `agent-prompt.md`.

Запуск автоматически подмешивает `/skill:codex-search`, поэтому агент получает Codex-подобные правила: когда обязательно искать, как выбирать `live`/`cached`, когда брать official sources и как прикладывать ссылки.
