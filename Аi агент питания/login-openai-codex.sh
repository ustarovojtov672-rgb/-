#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_DIR="$(cd "$AGENT_DIR/.." && pwd -P)"

export PI_CODING_AGENT_DIR="$AGENT_DIR/.pi-agent"
export PI_CODING_AGENT_SESSION_DIR="$AGENT_DIR/sessions"

mkdir -p "$PI_CODING_AGENT_DIR" "$PI_CODING_AGENT_SESSION_DIR"
cd "$PROJECT_DIR"

npm exec -- pi \
  --provider openai-codex \
  --model openai-codex/gpt-5.5 \
  --session-dir "$PI_CODING_AGENT_SESSION_DIR" \
  --approve \
  --name "AI агент питания"
