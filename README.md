# PageGuide web demo

An interactive demo of **PageGuide**'s two core features — **Find** and **Guide** — running on **any real web page**, reached by a pasted URL or a web search. It mirrors the real PageGuide browser-extension experience (a side panel that grounds an LLM's answer in page content), and offers **two switchable surfaces**:

- **🧩 Browser** — a browser-chrome view of the loaded page beside the PageGuide side panel. Find highlights the answer's source passage; Guide outlines the real controls to click, step by step.
- **▌ Terminal** — the same engine in a command-line aesthetic (`open`, `search`, `find`, `guide`, `next`).

Built with **Next.js (App Router) + TypeScript + Tailwind**, deployable to **Vercel**. Defaults to **OpenAI `gpt-4o-mini`** with an operator key so visitors need no key of their own; **OpenRouter** is also supported, and either key can come from server env or the in-app Settings panel.

> The **Browser** surface is the focus and is feature-complete. The **Terminal** surface works but is a lighter work-in-progress. The previous static HTML/CSS/JS demo is preserved under [`legacy/`](./legacy).

## Features

- **Open any real page** from the address bar (URL or web search), rendered as a grounding view.
- **Find** — answers are grounded: the exact source passage is highlighted on the page (the server rejects any evidence id the model invents).
- **Guide that acts** — in **No Ask** mode the agent *performs* each step on the rendered page: it **fills** form fields, **clicks** buttons (shown as “done”), and **follows links** to the next real page. In **Ask** mode you confirm each step. (It actuates the extracted/rendered view and real link navigation; it does not drive a remote site's live JavaScript — see Caveats.)
- **`/find` and `/guide`** prefixes force the mode; `/open <url>`, `/search <q>`, `/clear` are also commands.
- **Chat history** — Save (⤓) the current chat, open past chats (⟲) to reload them, start a New chat (✎), or Clear. Saved in your browser.
- **Dark mode**, and a Browser ⇄ Terminal switch.

## How it works

A visitor searches or opens a URL → a serverless function fetches and extracts the page into grounding **blocks** → the model answers → the UI highlights the real passage (Find) or steps through real controls (Guide). No model-authored HTML/JS is ever executed; the model may only reference block ids that exist on the page, and every id is validated server-side.

| Route | Purpose |
|---|---|
| `POST /api/fetch` | Fetch + sanitize + extract any page into ordered blocks (headings, paragraphs, list items, links, buttons, inputs). SSRF-guarded. |
| `POST /api/search` | Keyless web search (DuckDuckGo Instant Answer API + Wikipedia search), merged. |
| `POST /api/ask` | Call the selected provider (OpenAI / OpenRouter) with strict JSON output; validate the grounded ids; return a Find highlight or Guide steps. |

Key files: `lib/store.ts` (shared Zustand session), `lib/providers.ts`, `components/PageView.tsx` (the grounded page renderer), `components/SidePanel.tsx`, `components/surfaces/*`.

## Run locally

```sh
npm install
cp .env.example .env.local   # optional: add operator keys
npm run dev                  # http://localhost:3000
```

Open a URL (e.g. `en.wikipedia.org/wiki/Rayleigh_scattering`) or type a query, then ask a question. Ask "how do I …" to trigger a Guide.

## API keys (OpenAI and OpenRouter)

The default provider is **OpenAI** (`gpt-4o-mini`). A key is resolved in this order:

1. **Server env** — `OPENAI_API_KEY` and/or `OPENROUTER_API_KEY` (in `.env.local` locally, or Vercel Project → Settings → Environment Variables). **For a public demo, set `OPENAI_API_KEY` so visitors need no key of their own.**
2. **In-app Settings** — otherwise each visitor opens **⚙ Settings**, picks a provider, pastes that provider's key (stored only in their browser), and chooses a model.

Defaults: OpenAI `gpt-4o-mini`, OpenRouter `google/gemini-3-flash-preview` (both editable in Settings). A user-supplied key is sent per-request to this app's server, forwarded to the provider, and never logged.

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel (Next.js is auto-detected — no config needed).
2. Optionally set `OPENAI_API_KEY` / `OPENROUTER_API_KEY` in the project's environment variables.
3. Deploy. The serverless routes run as Vercel Functions.

## Tests

```sh
npx playwright install chromium
npm test
```

The suite mocks the API routes (no key or network needed) and covers: loading a page + Find highlight, Guide stepping through controls, the no-false-highlight contract, surfaced provider errors, and session preservation across surfaces.

## Caveats

- **Page fetching is best-effort.** Bot-blocked, login-gated, or heavily JavaScript-rendered pages may not extract cleanly; the UI shows a friendly error. Content pages (Wikipedia, docs, articles, blogs) work best.
- **Guide acts on the rendered view, not a remote live DOM.** The app renders a server-extracted snapshot of the page, so Guide fills fields and actuates controls *in that rendered view*, and really navigates when it follows a link. It does not click a remote site's own JavaScript widgets (that needs a real in-browser extension or a headless-browser backend).
- **Search is keyless** and therefore lighter than a paid search API; it blends DuckDuckGo Instant Answers with Wikipedia results.
- Model slugs for preview models can change — override them in Settings if a provider rejects the default.
- Proxying third-party pages is for demonstration and respects no-auth content only.
