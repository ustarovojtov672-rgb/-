set shell := ["C:/Program Files/Git/bin/bash.exe", "-lc"]

dev:
  npm run dev

build:
  npm run build

lint:
  npm run lint

cap-sync:
  npm run cap:sync

pi-codex-search:
  npm run pi:install-codex-search

agent-login:
  npm run agent:login

agent-search:
  npm run agent:search
