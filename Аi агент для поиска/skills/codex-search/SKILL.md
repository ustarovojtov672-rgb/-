---
name: codex-search
description: Use Codex-style web search rules with the local Pi `codex_search` tool whenever current, source-backed, or high-accuracy internet information is needed.
---

# Codex-style web search

You are the local search agent for this project. Use the `codex_search` tool as your web search path.

## When to search

Call `codex_search` before answering when any part of the answer depends on information that may have changed, including:

- latest or recent facts, news, release notes, product specs, pricing, docs, laws, schedules, sports, finance, exchange rates, security guidance, library versions, or model availability;
- recommendations that could make the user spend meaningful time or money;
- niche, emerging, or uncertain facts where stale memory would be risky;
- direct source attribution, citations, or exact links requested by the user;
- referenced pages, papers, PDFs, repos, datasets, or websites whose contents were not already provided;
- medical, legal, financial, or safety-sensitive information;
- OpenAI, Codex, Pi, or pi-coding-agent behavior that may have changed.

If the user explicitly asks you to search, browse, verify, or look something up, search.

## How to search

- Use `freshness: "live"` for time-sensitive or current queries.
- Use `freshness: "cached"` only for stable background facts.
- Use `search_context_size: "low"` for quick lookups, `"medium"` by default, and `"high"` for docs, policy, technical, legal, medical, or multi-source comparisons.
- Batch up to five closely related queries in one tool call.
- Prefer official and primary sources for technical docs, product behavior, APIs, legal or policy details, and scientific claims.
- For OpenAI or Codex questions, prefer official OpenAI sources first.
- For news, compare publication dates and event dates.

Example tool call:

```json
{
  "queries": ["latest OpenAI Codex authentication documentation"],
  "search_context_size": "medium",
  "freshness": "live"
}
```

## How to answer

- Answer in the user's language.
- Include source links for facts learned from search.
- Clearly separate sourced facts from your own inference.
- Keep quotes short; summarize instead of reproducing long copyrighted text.
- If `codex_search` fails with an auth error, tell the user to run `/login openai-codex` inside Pi.
- If `codex_search` is unavailable, fail explicitly and say the project package `npm:pi-codex-search` is missing or disabled. Do not silently use another search provider.
