'use client';

import { create } from 'zustand';
import { PROVIDERS } from './providers';
import type {
  AskResult,
  AutoMode,
  GuideStep,
  Mode,
  PageDoc,
  Provider,
  SavedChat,
  SearchResult,
} from './types';

export type Surface = 'browser' | 'terminal';
export type BrowserView = 'empty' | 'loading' | 'results' | 'page';

export interface Settings {
  provider: Provider;
  openaiModel: string;
  openrouterModel: string;
  openaiKey: string;
  openrouterKey: string;
  dark: boolean;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  text: string;
  mode?: Mode;
  result?: AskResult;
  error?: boolean;
  action?: boolean; // an "agent did X" log line
}

export interface GuideState {
  steps: GuideStep[];
  current: number;
}

interface StoreState {
  hydrated: boolean;
  surface: Surface;
  settings: Settings;
  auto: AutoMode;

  browserView: BrowserView;
  doc: PageDoc | null;
  pageError: string | null;
  results: SearchResult[] | null;
  query: string;
  navStack: string[];
  navIndex: number;

  messages: ChatMessage[];
  busy: boolean;
  evidence: { id: string; quote?: string; marker?: string }[]; // all cited spans of the current answer (persist)
  focusedEvidence: string | null; // the one the user clicked (shown stronger)
  guide: GuideState | null;
  fieldValues: Record<string, string>;
  clicked: string[];

  history: SavedChat[];
  historyOpen: boolean;

  serverKeys: { openai: boolean; openrouter: boolean };
  devMode: boolean;
  admin: boolean;

  hydrate: () => void;
  loadConfig: () => Promise<void>;
  toggleDev: () => void;
  unlockAdmin: (pw: string) => boolean;
  lockAdmin: () => void;
  setSurface: (s: Surface) => void;
  patchSettings: (p: Partial<Settings>) => void;
  toggleDark: () => void;
  setAuto: (a: AutoMode) => void;

  loadUrl: (input: string, opts?: { push?: boolean }) => Promise<void>;
  goBack: () => void;
  goForward: () => void;
  search: (query: string) => Promise<void>;
  openResult: (url: string) => Promise<void>;
  ask: (question: string, forced?: Mode) => Promise<void>;

  performStep: (index?: number) => void;
  guideNext: () => void;
  setFieldValue: (id: string, v: string) => void;
  focusEvidence: (id: string) => void;

  saveChat: () => void;
  loadChat: (id: string) => void;
  deleteChat: (id: string) => void;
  toggleHistory: (open?: boolean) => void;

  clearChat: () => void;
  reset: () => void;
}

// v2: OpenAI is the new default — bumping the key resets stale settings that
// pinned the old OpenRouter default from a previous version.
const LS_SETTINGS = 'pageguide.settings.v2';
const LS_HISTORY = 'pageguide.history.v1';
let msgId = 1;

function defaultSettings(): Settings {
  return {
    provider: 'openai',
    openaiModel: PROVIDERS.openai.defaultModel,
    openrouterModel: PROVIDERS.openrouter.defaultModel,
    openaiKey: '',
    openrouterKey: '',
    dark: false,
  };
}

export function currentModel(s: Settings): string {
  return s.provider === 'openai' ? s.openaiModel : s.openrouterModel;
}
export function currentKey(s: Settings): string {
  return s.provider === 'openai' ? s.openaiKey : s.openrouterKey;
}

export function detectMode(q: string): Mode {
  const t = q.trim().toLowerCase();
  if (t.startsWith('/guide')) return 'guide';
  if (t.startsWith('/find')) return 'find';
  if (
    /\b(how (do|to|can) i|guide me|walk me|navigate|take me to|where (do|can) i (click|find)|steps to|sign ?up|log ?in|subscribe|check ?out|add to cart|download the|fill (in|out)|submit)\b/.test(
      t,
    )
  )
    return 'guide';
  return 'find';
}

function stripCmd(q: string): string {
  return q.replace(/^\/(find|guide|open|search)\s+/i, '').trim();
}

function deriveValue(fieldText: string, question: string): string {
  const t = fieldText.toLowerCase();
  if (/e-?mail/.test(t)) return 'demo@example.com';
  if (/password/.test(t)) return 'demo-password';
  if (/search|query|find/.test(t)) return question || 'PageGuide';
  if (/name/.test(t)) return 'Alex Demo';
  if (/phone|tel/.test(t)) return '555-0100';
  return question || 'PageGuide demo';
}

function persistSettings(s: Settings) {
  try {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
function persistHistory(h: SavedChat[]) {
  try {
    localStorage.setItem(LS_HISTORY, JSON.stringify(h.slice(0, 30)));
  } catch {
    /* ignore */
  }
}

export const useStore = create<StoreState>((set, get) => ({
  hydrated: false,
  surface: 'browser',
  settings: defaultSettings(),
  auto: 'noask',

  browserView: 'empty',
  doc: null,
  pageError: null,
  results: null,
  query: '',
  navStack: [],
  navIndex: -1,

  messages: [],
  busy: false,
  evidence: [],
  focusedEvidence: null,
  guide: null,
  fieldValues: {},
  clicked: [],

  history: [],
  historyOpen: false,

  serverKeys: { openai: false, openrouter: false },
  devMode: false,
  admin: false,

  toggleDev: () => set({ devMode: !get().devMode }),
  // Soft admin gate for the demo (not real security — the check runs in the browser).
  unlockAdmin: (pw) => {
    const ok = pw === 'admin2026pageguide';
    if (ok) set({ admin: true });
    return ok;
  },
  lockAdmin: () => set({ admin: false, devMode: false }),

  loadConfig: async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) set({ serverKeys: await res.json() });
    } catch {
      /* ignore */
    }
  },

  hydrate: () => {
    if (get().hydrated) return;
    let settings = defaultSettings();
    let history: SavedChat[] = [];
    try {
      const raw = localStorage.getItem(LS_SETTINGS);
      if (raw) settings = { ...settings, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem(LS_HISTORY);
      if (raw) history = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    set({ settings, history, hydrated: true });
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', settings.dark);
  },

  setSurface: (s) => set({ surface: s }),

  patchSettings: (p) => {
    const settings = { ...get().settings, ...p };
    persistSettings(settings);
    set({ settings });
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', settings.dark);
  },

  toggleDark: () => get().patchSettings({ dark: !get().settings.dark }),
  setAuto: (a) => set({ auto: a }),

  loadUrl: async (input, opts) => {
    const url = stripCmd(input);
    if (!url) return;
    const push = opts?.push !== false;
    set({
      browserView: 'loading',
      pageError: null,
      results: null,
      evidence: [],
      focusedEvidence: null,
      guide: null,
      fieldValues: {},
      clicked: [],
      query: url,
    });
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not load the page.');
      const doc = data as PageDoc;
      // navigation history
      let { navStack, navIndex } = get();
      if (push) {
        navStack = navStack.slice(0, navIndex + 1).concat(doc.url);
        navIndex = navStack.length - 1;
      }
      set({
        doc,
        browserView: 'page',
        navStack,
        navIndex,
        messages: [
          ...get().messages,
          {
            id: msgId++,
            role: 'system',
            text: `Loaded “${doc.title}”. Ask a question to Find an answer, or ask how to do something (or type /guide) to start a Guide.`,
          },
        ],
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load the page.';
      set({ browserView: 'empty', doc: null, pageError: msg });
    }
  },

  goBack: () => {
    const { navStack, navIndex } = get();
    if (navIndex <= 0) return;
    const i = navIndex - 1;
    set({ navIndex: i });
    void get().loadUrl(navStack[i], { push: false });
  },
  goForward: () => {
    const { navStack, navIndex } = get();
    if (navIndex >= navStack.length - 1) return;
    const i = navIndex + 1;
    set({ navIndex: i });
    void get().loadUrl(navStack[i], { push: false });
  },

  search: async (raw) => {
    const query = stripCmd(raw);
    if (!query) return;
    set({ browserView: 'loading', pageError: null, results: null, query });
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Search failed.');
      set({ results: (data.results as SearchResult[]) || [], browserView: 'results' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Search failed.';
      set({ browserView: 'empty', pageError: msg });
    }
  },

  openResult: async (url) => {
    await get().loadUrl(url);
  },

  ask: async (question, forced) => {
    const q = question.trim();
    if (!q || get().busy) return;
    const { doc, settings } = get();
    const mode: Mode = forced || detectMode(q);
    const cleanQ = stripCmd(q);

    set({ messages: [...get().messages, { id: msgId++, role: 'user', text: cleanQ, mode }] });

    // Greetings / small talk: answer locally, don't ground or spend tokens.
    if (/^(hi|hello|hey|yo|sup|hiya|howdy|thanks|thank you|ty|ok|okay|cool|nice|test|ping)[\s!.?]*$/i.test(cleanQ)) {
      set({
        messages: [
          ...get().messages,
          {
            id: msgId++,
            role: 'assistant',
            text: 'Hi! Ask a question about this page and I’ll Find the answer with evidence, or ask how to do something to start a Guide.',
          },
        ],
      });
      return;
    }

    if (!doc) {
      set({
        messages: [
          ...get().messages,
          { id: msgId++, role: 'assistant', text: 'Open a page or run a search first, then ask about it.', error: true },
        ],
      });
      return;
    }

    set({ busy: true, evidence: [], focusedEvidence: null, guide: null });
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-provider-key': currentKey(settings) },
        body: JSON.stringify({
          provider: settings.provider,
          model: currentModel(settings),
          mode,
          question: cleanQ,
          doc: { ...doc, html: undefined }, // the route only needs blocks, not the page HTML
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'The request failed.');
      const result = data as AskResult;

      if (result.kind === 'find') {
        // Highlight ALL cited passages (persist); focus/scroll to the first.
        const evidence = [
          ...result.citations.map((c) => ({ id: c.id, quote: c.quote, marker: c.marker })),
          ...(result.visual ? [{ id: result.visual.id, marker: result.visual.marker }] : []),
        ];
        set({
          evidence,
          focusedEvidence: result.citations[0]?.id || result.visual?.id || null,
          messages: [...get().messages, { id: msgId++, role: 'assistant', text: result.answer, mode, result }],
        });
      } else {
        const steps = result.steps || [];
        set({
          guide: steps.length ? { steps, current: 0 } : null,
          messages: [...get().messages, { id: msgId++, role: 'assistant', text: result.answer, mode, result }],
        });
        if (steps.length && get().auto === 'noask') scheduleAuto(get);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'The request failed.';
      set({ messages: [...get().messages, { id: msgId++, role: 'assistant', text: msg, error: true }] });
    } finally {
      set({ busy: false });
    }
  },

  // Perform the action attached to the current (or given) guide step.
  performStep: (index) => {
    const g = get().guide;
    const doc = get().doc;
    if (!g || !doc) return;
    const i = index ?? g.current;
    if (i !== g.current || i >= g.steps.length) return;
    const step = g.steps[i];
    const block = doc.blocks.find((b) => b.id === step.id);
    if (!block) return goStep(get, set, i + 1);

    const action = step.action || (block.type === 'link' ? 'open' : block.type === 'input' ? 'fill' : 'click');

    if (action === 'open' && block.href) {
      set({
        messages: [
          ...get().messages,
          { id: msgId++, role: 'assistant', action: true, text: `↳ Following the link “${block.text}” →` },
        ],
      });
      void get().loadUrl(block.href);
      return;
    }
    if (action === 'fill') {
      const value = step.value || deriveValue(block.text, lastUserQuestion(get));
      set({
        fieldValues: { ...get().fieldValues, [block.id]: value },
        messages: [
          ...get().messages,
          { id: msgId++, role: 'assistant', action: true, text: `↳ Typed “${value}” into ${block.text}.` },
        ],
      });
      goStep(get, set, i + 1);
      return;
    }
    // click
    set({
      clicked: [...get().clicked, block.id],
      messages: [
        ...get().messages,
        { id: msgId++, role: 'assistant', action: true, text: `↳ Clicked “${block.text}”.` },
      ],
    });
    goStep(get, set, i + 1);
  },

  guideNext: () => get().performStep(),

  setFieldValue: (id, v) => set({ fieldValues: { ...get().fieldValues, [id]: v } }),

  saveChat: () => {
    const { doc, messages, query, history } = get();
    if (messages.length === 0) return;
    const title =
      doc?.title ||
      (messages.find((m) => m.role === 'user')?.text ?? 'Chat').slice(0, 60) ||
      'Chat';
    const chat: SavedChat = {
      id: `c${Date.now()}`,
      title,
      savedAt: Date.now(),
      url: doc?.url || query || null,
      doc: doc ? { ...doc, html: undefined } : null, // don't persist heavy page HTML
      messages,
    };
    const next = [chat, ...history].slice(0, 30);
    persistHistory(next);
    set({
      history: next,
      messages: [...messages, { id: msgId++, role: 'system', text: `Saved this chat as “${title}”.` }],
    });
  },

  loadChat: (id) => {
    const chat = get().history.find((c) => c.id === id);
    if (!chat) return;
    set({
      doc: chat.doc,
      browserView: chat.doc ? 'page' : 'empty',
      navStack: chat.url ? [chat.url] : [],
      navIndex: chat.url ? 0 : -1,
      messages: (chat.messages as ChatMessage[]) || [],
      evidence: [],
      focusedEvidence: null,
      guide: null,
      fieldValues: {},
      clicked: [],
      results: null,
      query: chat.url || '',
      historyOpen: false,
      pageError: null,
    });
  },

  deleteChat: (id) => {
    const next = get().history.filter((c) => c.id !== id);
    persistHistory(next);
    set({ history: next });
  },

  toggleHistory: (open) => set({ historyOpen: open ?? !get().historyOpen }),

  focusEvidence: (id) => set({ focusedEvidence: id }),

  clearChat: () =>
    set({ messages: [], evidence: [], focusedEvidence: null, guide: null, fieldValues: {}, clicked: [] }),
  reset: () =>
    set({
      browserView: 'empty',
      doc: null,
      results: null,
      pageError: null,
      query: '',
      navStack: [],
      navIndex: -1,
      messages: [],
      evidence: [],
      focusedEvidence: null,
      guide: null,
      fieldValues: {},
      clicked: [],
    }),
}));

function lastUserQuestion(get: () => StoreState): string {
  const msgs = get().messages;
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'user') return msgs[i].text;
  return '';
}

function goStep(get: () => StoreState, set: (p: Partial<StoreState>) => void, next: number) {
  const g = get().guide;
  if (!g) return;
  if (next >= g.steps.length) {
    set({
      guide: { ...g, current: next },
      messages: [
        ...get().messages,
        { id: msgId++, role: 'assistant', text: '✓ Walkthrough complete. PageGuide performed each step on the page.' },
      ],
    });
    return;
  }
  set({ guide: { ...g, current: next } });
  if (get().auto === 'noask') scheduleAuto(get);
}

// No-Ask mode: auto-perform the current step after a short pause so the user watches it happen.
function scheduleAuto(get: () => StoreState) {
  setTimeout(() => {
    const s = get();
    if (s.auto !== 'noask' || !s.guide) return;
    if (s.guide.current < s.guide.steps.length) s.performStep(s.guide.current);
  }, 1700);
}
