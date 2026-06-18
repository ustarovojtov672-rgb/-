---
name: codex-search
description: Use Codex-style web search rules with the local Pi `codex_search` tool whenever the nutrition agent needs current, source-backed, or high-accuracy internet information.
---

# Codex-style web search

You are not a separate search agent. You are a web-search skill inside the single nutrition agent for this project. Use the `codex_search` tool as one evidence path alongside memory, image understanding, OCR, barcode reading, and the local food database.

## When to search

Call `codex_search` before deciding the nutrition result when any part of the answer depends on information that may have changed or needs a source, including:

- packaged food, brand, restaurant, delivery menu, barcode, label, or product name not already clear from memory or local data;
- latest or current product nutrition facts, ingredients, serving sizes, prices, docs, safety guidance, model behavior, or library/API behavior;
- niche, emerging, or uncertain facts where stale memory would be risky;
- direct source attribution, citations, or exact links requested by the user;
- referenced pages, PDFs, repos, datasets, or websites whose contents were not already provided;
- medical, legal, financial, or safety-sensitive information.

If the user explicitly asks you to search, browse, verify, or look something up, search.

## How to search

- Keep the current meal context in mind: food name, brand, visible label text, barcode digits, country, serving size, and the user's stated portion.
- Use `freshness: "live"` for time-sensitive, product, brand, restaurant, barcode, or current queries.
- Use `freshness: "cached"` only for stable background facts.
- Use `search_context_size: "low"` for quick lookups, `"medium"` by default, and `"high"` for docs, policy, technical, legal, medical, or multi-source comparisons.
- Batch up to five closely related queries in one tool call.
- Prefer official and primary sources for product pages, APIs, technical docs, legal or policy details, and scientific claims.
- For OpenAI or Codex questions, prefer official OpenAI sources first.
- For news, compare publication dates and event dates.

Example tool call:

```json
{
  "queries": ["творог Простоквашино 5% калорийность 200 г"],
  "search_context_size": "medium",
  "freshness": "live"
}
```

## How to answer

- Return evidence back into the nutrition result, not a standalone web-search answer.
- Add a `confidenceSignals` item with kind `web_search` when search materially changes the estimate.
- Include source links for facts learned from search.
- Clearly separate sourced facts from your own inference.
- Keep quotes short; summarize instead of reproducing long copyrighted text.
- If `codex_search` fails with an auth error, tell the user to run `/login openai-codex` inside Pi.
- If `codex_search` is unavailable, fail explicitly and say the project package `npm:pi-codex-search` is missing or disabled. Do not silently use another search provider.
