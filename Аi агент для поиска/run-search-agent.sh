#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_DIR="$(cd "$AGENT_DIR/.." && pwd -P)"

export PI_CODING_AGENT_DIR="$AGENT_DIR/.pi-agent"
export PI_CODING_AGENT_SESSION_DIR="$AGENT_DIR/sessions"

mkdir -p "$PI_CODING_AGENT_DIR" "$PI_CODING_AGENT_SESSION_DIR"
cd "$PROJECT_DIR"

if [ "$#" -gt 0 ]; then
  prompt="$*"
else
  prompt="$(cat "$AGENT_DIR/agent-prompt.md")"
fi

skill_prompt="/skill:codex-search $prompt"

npm exec -- pi \
  --provider openai-codex \
  --model openai-codex/gpt-5.5 \
  --tools codex_search \
  --skill "$AGENT_DIR/skills/codex-search" \
  --session-dir "$PI_CODING_AGENT_SESSION_DIR" \
  --approve \
  --name "AI агент для поиска" \
  --print \
  "$skill_prompt"
