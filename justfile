set shell := ["C:/Program Files/Git/bin/bash.exe", "-lc"]

dev:
  npm run dev

jazz-sync:
  npm run jazz:sync

build:
  npm run build

lint:
  npm run lint

cap-sync:
  npm run cap:sync

pi-codex-search:
  npm run pi:install-codex-search

nutrition-agent-login:
  npm run nutrition-agent:login

nutrition-agent-run:
  npm run nutrition-agent:run
