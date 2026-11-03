# PageGuide web demo

A Next.js + TypeScript demo of **Find** and **Guide**, with a minimal orange-gradient assistant panel. Browser view is enabled; Terminal view is temporarily disabled.

## Try it

```sh
npm install
npm run dev
```

The library offers:

- **Find — six actual saved websites:** MDN Fetch API, Wikipedia Rayleigh scattering, W3C Introduction to Web Accessibility, Wikipedia Cold War, Manhattan, and Roman Empire. These render the original HTML/CSS, not model-generated pages or rewritten summaries. Scripts are stripped for safety.
- **Guide — two isolated, working demo websites:** an Amazon-style market (six products, cart, wishlist, sample shipping, checkout/review, simulated card or wallet payment, order history and cancellation) and a Quora-style community (eight fictional questions, sixteen answers, thirty-two comments, posting questions/answers/comments, following topics, saved posts, voting and language settings). Neither connects to real accounts or makes real purchases.
- **Custom websites:** enter a URL in the library. The browser location bar is read-only and follows page changes. Custom pages are sanitized snapshots; their original JavaScript and form submissions are disabled.

Highlight text on a displayed page to attach an exact quoted excerpt above the composer. It stays attached while typing, can be removed, and is cleared on navigation. Questions such as “explain this” receive that selected text as source context, including selections outside the initial extracted blocks. Find citations are assembled inline after each supported claim rather than collected at the end.

The panel keeps dark mode, clear chat, and send. `/find` and `/guide` force a mode; `/open <url>`, `/search <query>`, and `/clear` remain available. `/admin <password>` uses the existing local demo admin gate; `/admin off` locks it. Admins see recorded Find token totals/cost, not model labels. Guide usage is not yet included. This client-side admin gate is not authentication.

## Guide execution and screenshots

The model proposes one action at a time. User clicks and agent actions share the same sandbox reducer. Each action changes actual demo state, and the next model turn receives the new observed page and input values.

- **Journey snapshots:** Journey is expanded by default. The initial page and every subsequent step have a screenshot. Hover or keyboard-focus a step to preview its post-action state; click to enlarge. These are execution records, not automatically selected evidence.
- **Saved evidence:** the gallery is collapsed by default and includes only agent-selected screenshots cited in the final answer. It is not a step-by-step screenshot list. Inline citations remain hoverable/clickable while the gallery is closed; Journey retains the separate execution snapshots. Evidence cards adapt to the panel width. Optional annotations and on-page confirmation highlights are preserved.
- The final summarizer receives actual outcomes and named evidence and is encouraged to cite it inline. The runtime, not the summarizer, controls completion status. No Reasoning Trail is displayed.
- State-changing tasks are verified against actual sandbox state: requested cart quantities relative to the starting cart, a new paid demo order (not just an order review), saved preferences, published questions/answers/comments (not just drafts), votes, bookmarks and followed topics. Known compound checks must all pass.
- Reading/explaining/navigation tasks use an independent page-evidence reviewer. Its supporting quotations must exist verbatim in current page blocks; navigation also requires the actual destination URL to match. The reviewer cannot approve unsupported mutations from a screenshot alone.
- Incomplete means an unmet goal, a step limit, unsupported verification, or an unavailable checker—not necessarily that every action failed. The answer shows the specific verification result. Failed is reserved for action/provider errors.
- Demo checkout has no real card fields and makes no payment-network requests. Use the sample address and the clearly labeled fictional payment methods.
- Clearing chat, resetting a sandbox, or changing pages cancels the active run. Sandbox state is isolated in browser memory, never shared between visitors or written to Supabase.

Guide requires an operator model API key. Set `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in `.env.local` (see `.env.example`). Default: OpenAI `gpt-4o-mini`.

## Saved HTML and loading speed

- `save-webpage/` is the source of truth for all six original SingleFile HTML pages supplied through Git LFS, including the newly added MDN, W3C, and Rayleigh scattering files.
- `public/saved/` contains sanitized, precompressed copies generated only from those originals. `lib/saved-files.json` records the source filenames and `lib/saved-manifest.json` records version hashes and transfer sizes.
- Browser navigation fetches versioned static `/saved/:id.json.gz` files directly, avoiding serverless cold starts, upstream requests, and per-request HTML parsing. Library hover/focus prefetches pages; the small Fetch API snapshot also prefetches after the library opens unless data saver is enabled. Requests are deduplicated and cached.
- All six originals include their saved styles/assets. No live publisher stylesheet is needed. Refresh reloads the packaged original for a built-in page, never the live site.
- `GET /api/saved/:id` and `/api/fetch` retain compatible local-snapshot responses. Custom pages have a bounded five-minute in-memory cache and an eight-second upstream timeout; Refresh bypasses custom-page caching.
- The saved sites retain their source titles/URLs and layout, but dynamic site widgets cannot run without scripts. Links and same-page anchors remain usable.

To rebuild delivery copies from changed Git LFS originals:

```sh
git lfs pull
node scripts/prepare-saved-pages.mjs
```

After updating any original in `save-webpage/`, rerun the preparation command and commit the regenerated delivery files/manifest. `scripts/save-find-pages.mjs` is now a local-only alias for the same preparation script; it no longer downloads or reconstructs websites.

Keep source attribution and licensing when redistributing these snapshots. Do not replace snapshot JSON/HTML with untrusted executable content.

## Supabase catalog (optional)

The app works immediately with `lib/library-seed.json`. An optional read-only Supabase catalog can supply the same data structure; it never executes database-authored HTML or JavaScript.

1. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env` (already configured locally for this project). `.env` is Git-ignored.
2. Run `supabase/library.sql` in the Supabase SQL Editor. It creates the catalog table, enables Row Level Security, and grants only read access to the published demo row.
3. Run `node scripts/print-library-seed.mjs` and execute its printed INSERT statement in the SQL Editor.
4. Restart the dev server after changing environment variables.

`GET /api/library` tries the database with a 1.5-second timeout and falls back to bundled data. A slow, missing, unpublished, or invalid row never blocks opening the library. The catalog is adopted only before a page/run opens; it cannot replace content underneath an active task. The six saved page IDs/source URLs are validated against the packaged snapshots. Products/posts may be customized within the validated schema.

A publishable key cannot create the table or bypass RLS. Never put service-role credentials, user sessions, private pages, or passwords in the public catalog.

## Development

Key files: `lib/store.ts` (session/orchestration), `lib/sandboxes.ts` (observations, actions and success checks), `components/SandboxView.tsx`, `components/LibraryShelf.tsx`, `components/PageView.tsx`, and `components/SidePanel.tsx`.

```sh
npx playwright install chromium
npm test
npx tsc --noEmit --incremental false
npm run build
```

Tests exercise real local sandbox state and actual packaged HTML while mocking model endpoints. They cover screenshot previews, named evidence vs. journey records, completion verification, cancellation, read-only location updates, custom-page caching, and the simplified panel.

Deploy to Vercel as a Next.js app. Delivery snapshots are committed so production does not need to fetch third-party websites or Git LFS at runtime. Model and optional Supabase environment variables must also be configured in Vercel.
