'use client';

import { create } from 'zustand';
import { PROVIDERS } from './providers';
import { LOCAL_LIBRARY, snapshotId, parseLibrary, type Library } from './library';
import { sandboxSite, sandboxDoc, initialSandbox, routeSandbox, applySandboxAction, verifySandboxTask, type SandboxSite, type SandboxState, type BrowserAction } from './sandboxes';
import { cachedPage, cachePage } from './page-cache';
import { loadSavedPage } from './saved-client';
import type { VerificationResult } from './verification';
import { pageWithSelection } from './page-selection';
import type {
  AskResult,
  AutoMode,
  Evidence,
  EvidenceRequest,
  GuideStep,
  Mode,
  PageDoc,
  PageSelection,
  Provider,
  SavedChat,
  SearchResult,
} from './types';

export type JourneyStatus = 'pending' | 'running' | 'done' | 'failed';
export interface GuideRun {
  id: number;
  task: string;
  journey: { instruction: string; status: JourneyStatus; screenshot?: string; capturedAt?: string; screenshotError?: string; evidenceName?: string }[];
  journeyOpen: boolean;
  reasoningOpen: boolean;
  running: boolean;
  final: { status: string; answer: string; reasoning: string; verification?: VerificationResult } | null;
}

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
  selection?: PageSelection;
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
  selection: PageSelection | null;
  library: Library;
  sandboxSessions: Partial<Record<SandboxSite, SandboxState>>;
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
  guideRun: GuideRun | null; // the autonomous Guide run (task card + journey + answer)
  scratchpad: Evidence[]; // named evidence saved during the run
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

  loadUrl: (input: string, opts?: { push?: boolean; silent?: boolean; refresh?: boolean }) => Promise<void>;
  loadLibrary: () => Promise<void>;
  actOnSandbox: (action: BrowserAction) => string;
  resetSandbox: () => void;
  showLibrary: () => void;
  goBack: () => void;
  goForward: () => void;
  search: (query: string) => Promise<void>;
  openResult: (url: string) => Promise<void>;
  ask: (question: string, forced?: Mode) => Promise<void>;

  performStep: (index?: number) => void;
  guideNext: () => void;
  setFieldValue: (id: string, v: string) => void;
  setSelection: (selection: PageSelection | null) => void;
  focusEvidence: (id: string) => void;
  toggleJourney: () => void;
  toggleReasoning: () => void;
  closeGuideRun: () => void;

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
let runId = 0;
let navigationId = 0;
let navigationAbort: AbortController | null = null;
let agentAbort: AbortController | null = null;

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
    /\b(how (do|to|can) i|guide me|walk me|navigate|take me to|where (do|can) i (click|find)|steps to|sign ?up|log ?in|subscribe|check ?out|download the|fill (in|out)|submit)\b/.test(
      t,
    ) ||
    /\b(add|move|put).{0,30}\bto (the )?cart\b/.test(t) ||
    /\b(change|switch|set).{0,35}\blanguage\b/.test(t) ||
    /\b(browse|read).{0,25}\bposts?\b/.test(t) ||
    /\b(add to cart|buy|purchase|place an order|order|reserve|book a|book the|complete the|go to|open the)\b/.test(t)
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
  selection: null,
  library: LOCAL_LIBRARY,
  sandboxSessions: {},
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
  guideRun: null,
  scratchpad: [],
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
    try { localStorage.removeItem('pageguide.custom-sites.v1'); } catch { /* ignore */ }
    set({ settings, history, hydrated: true });
    void get().loadLibrary();
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

  loadLibrary: async () => {
    try {
      const res = await fetch('/api/library');
      const data = res.ok ? await res.json() : null;
      const library = parseLibrary(data?.library);
      // Never swap the seed under an active page/run.
      if (library && get().browserView === 'empty' && !get().guideRun) set({ library });
    } catch { /* bundled library is already available */ }
  },

  showLibrary: () => {
    navigationAbort?.abort();
    navigationId++;
    agentAbort?.abort();
    set({ browserView: 'empty', doc: null, selection: null, results: null, pageError: null, busy: false, guideRun: null, guide: null, evidence: [], focusedEvidence: null });
  },

  resetSandbox: () => {
    const site = get().doc?.sandbox;
    if (!site) return;
    agentAbort?.abort();
    const state = initialSandbox(site);
    set({ sandboxSessions: { ...get().sandboxSessions, [site]: state }, selection: null, doc: sandboxDoc(state, get().library), guide: null, guideRun: null, scratchpad: [], evidence: [], focusedEvidence: null, busy: false });
  },

  actOnSandbox: (action) => {
    const site = get().doc?.sandbox;
    if (!site) throw new Error('Open a sandbox before performing interactive actions.');
    const state = get().sandboxSessions[site];
    if (!state) throw new Error('Sandbox state is unavailable.');
    const result = applySandboxAction(state, action, get().library);
    const doc = sandboxDoc(result.state, get().library);
    let { navStack, navIndex } = get();
    // Typing updates state, not navigation history.
    if (action.type !== 'fill' && doc.url !== get().doc!.url) {
      navStack = navStack.slice(0, navIndex + 1).concat(doc.url);
      navIndex = navStack.length - 1;
    } else if (navIndex >= 0) {
      navStack = navStack.map((url, i) => i === navIndex ? doc.url : url);
    }
    set({ sandboxSessions: { ...get().sandboxSessions, [site]: result.state }, selection: null, doc, query: doc.url, navStack, navIndex, evidence: [], focusedEvidence: null });
    return result.observation;
  },

  loadUrl: async (input, opts) => {
    let url = stripCmd(input);
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const id = ++navigationId;
    navigationAbort?.abort();
    const controller = new AbortController();
    navigationAbort = controller;
    if (!opts?.silent) { agentAbort?.abort(); set({ guideRun: null, busy: false }); }
    const push = opts?.push !== false;
    const silent = opts?.silent === true;
    set({ pageError: null, selection: null, results: null, evidence: [], focusedEvidence: null, guide: null, fieldValues: {}, clicked: [], query: url });
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      new URL(url); // validate before any request
      const site = sandboxSite(url);
      let doc: PageDoc | null = null;
      if (site) {
        const state = routeSandbox(get().sandboxSessions[site] || initialSandbox(site), url, get().library);
        set({ sandboxSessions: { ...get().sandboxSessions, [site]: state } });
        doc = sandboxDoc(state, get().library);
      } else {
        doc = !opts?.refresh ? cachedPage(url) : null;
        const saved = snapshotId(url, get().library);
        if (!doc && saved) {
          set({ browserView: 'loading' });
          doc = await loadSavedPage(saved, controller.signal, opts?.refresh);
          cachePage(url, doc);
        }
      }
      if (!doc) {
        if (new URL(url).hostname.endsWith('.pageguide.test')) throw new Error('That saved page does not exist. Choose a page from the library.');
        set({ browserView: 'loading' });
        const res = await fetch('/api/fetch', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, refresh: opts?.refresh }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Could not load the page.');
        doc = data as PageDoc;
        cachePage(url, doc);
        cachePage(doc.url, doc);
      }
      if (id !== navigationId) return;
      let { navStack, navIndex } = get();
      if (push) { navStack = navStack.slice(0, navIndex + 1).concat(doc.url); navIndex = navStack.length - 1; }
      set({ doc, browserView: 'page', navStack, navIndex, messages: silent ? get().messages : [...get().messages, { id: msgId++, role: 'system', text: `Loaded “${doc.title}”. ${doc.sandbox ? 'Click any control or ask Guide to perform a task.' : 'Ask a question to Find an answer with sources.'}` }] });
    } catch (e: unknown) {
      if (id !== navigationId) return;
      const msg = controller.signal.aborted ? 'Loading timed out. Try an instant saved page below, or retry your URL.' : e instanceof Error ? e.message : 'Could not load the page.';
      set({ browserView: 'empty', doc: null, pageError: msg });
    } finally { clearTimeout(timer); }
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
    const selection = get().selection?.url === doc?.url ? get().selection : null;

    set({ messages: [...get().messages, { id: msgId++, role: 'user', text: cleanQ, mode, ...(selection ? { selection } : {}) }] });

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

    // GUIDE: run the autonomous agent loop (it can navigate across pages).
    if (mode === 'guide') {
      const id = ++runId;
      agentAbort?.abort();
      agentAbort = new AbortController();
      set({
        busy: true,
        evidence: [],
        focusedEvidence: null,
        guide: null,
        scratchpad: [],
        guideRun: {
          id,
          task: cleanQ,
          journey: [{ instruction: 'Initial state', status: 'done' }],
          journeyOpen: true,
          reasoningOpen: false,
          running: true,
          final: null,
        },
      });
      try {
        await runAgent(get, set, cleanQ, settings, selection);
      } catch (e: unknown) {
        const cur = get().guideRun;
        const msg = e instanceof Error ? e.message : 'The agent failed.';
        if (cur?.id === id) set({ guideRun: { ...cur, running: false, final: { status: 'Failed', answer: msg, reasoning: '' } } });
      } finally {
        if (get().guideRun?.id === id) set({ busy: false });
      }
      return;
    }

    // FIND
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
          doc: { ...pageWithSelection(doc, selection), html: undefined }, // no full HTML or screenshots in model input
          ...(selection ? { selection } : {}),
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
  setSelection: (selection) => {
    if (selection && (selection.url !== get().doc?.url || !selection.text.trim())) return;
    if (selection?.id === get().selection?.id && selection?.text === get().selection?.text) return;
    set({ selection });
  },

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

  toggleJourney: () => {
    const r = get().guideRun;
    if (r) set({ guideRun: { ...r, journeyOpen: !r.journeyOpen } });
  },
  toggleReasoning: () => {
    const r = get().guideRun;
    if (r) set({ guideRun: { ...r, reasoningOpen: !r.reasoningOpen } });
  },
  closeGuideRun: () => { agentAbort?.abort(); set({ guideRun: null, scratchpad: [], guide: null, busy: false }); },

  clearChat: () => {
    agentAbort?.abort();
    set({ messages: [], selection: null, evidence: [], focusedEvidence: null, guide: null, guideRun: null, scratchpad: [], fieldValues: {}, clicked: [], busy: false });
  },
  reset: () => {
    navigationAbort?.abort();
    navigationId++;
    agentAbort?.abort();
    set({
      busy: false,
      selection: null,
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
      guideRun: null,
      scratchpad: [],
      fieldValues: {},
      clicked: [],
    });
  },
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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function setJourney(
  get: () => StoreState,
  set: (p: Partial<StoreState>) => void,
  idx: number,
  status: JourneyStatus,
) {
  const r = get().guideRun;
  if (!r) return;
  set({ guideRun: { ...r, journey: r.journey.map((j, k) => (k === idx ? { ...j, status } : j)) } });
}

const MAX_AGENT_STEPS = 16;

// Autonomous Guide agent loop: observe the current page, ask the agent for ONE action
// (which may navigate to another page), perform it, save evidence, repeat — then summarize.
async function runAgent(
  get: () => StoreState,
  set: (p: Partial<StoreState>) => void,
  task: string,
  settings: Settings,
  selection: PageSelection | null,
) {
  const id = get().guideRun!.id;
  const signal = agentAbort!.signal;
  const alive = () => get().guideRun?.id === id && !signal.aborted;
  const site = get().doc?.sandbox;
  const initialState = site ? get().sandboxSessions[site] : undefined;
  const history: { instruction: string; action: string; observation: string }[] = [];
  let finished = false;
  let failure = '';
  await captureStep(get, set, 0, undefined, alive, selection);
  try {
    for (let t = 0; t < MAX_AGENT_STEPS; t++) {
      if (!alive()) return;
      const doc = get().doc;
      if (!doc) throw new Error('The page is no longer available.');
      const res = await fetch('/api/agent', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-provider-key': currentKey(settings) },
        body: JSON.stringify({ provider: settings.provider, model: currentModel(settings), task, doc: { ...pageWithSelection(doc, doc.sandbox && history.length ? null : selection), html: undefined }, selection, history, evidence: get().scratchpad.map((e) => e.name) }),
      });
      const data = await res.json();
      if (!alive()) return;
      if (!res.ok) throw new Error(data?.error || 'The agent failed.');
      const { instruction, action, evidence } = data as { instruction: string; action: BrowserAction; evidence?: EvidenceRequest };
      if (!action || !['navigate', 'click', 'fill', 'finish'].includes(action.type)) throw new Error('The agent returned an invalid action.');
      const run = get().guideRun!;
      const idx = run.journey.length;
      set({ guideRun: { ...run, journey: [...run.journey, { instruction, status: 'running' }] } });
      if (action.id) set({ guide: { steps: [{ id: action.id, instruction }], current: 0 } });
      await delay(120);
      if (!alive()) return;
      if (action.type === 'finish') {
        finished = true;
        set({ guide: null });
        await captureStep(get, set, idx, evidence, alive, selection);
        if (!alive()) return;
        setJourney(get, set, idx, 'done');
        break;
      }
      let observation = '';
      const target = doc.blocks.find((b) => b.id === action.id && b.control);
      if (action.type === 'navigate' || (action.type === 'click' && target?.type === 'link')) {
        const href = action.url || target?.href;
        if (!href || (site && sandboxSite(href) !== site)) throw new Error('Guide cannot leave this isolated sandbox.');
        await get().loadUrl(href, { silent: true });
        if (!alive()) return;
        if (!get().doc) throw new Error(get().pageError || 'Navigation failed.');
        observation = get().doc!.blocks.map((b) => b.text).join('\n');
      } else if (site) {
        observation = get().actOnSandbox(action);
      } else {
        throw new Error('This external page is a read-only snapshot. Open an interactive Guide sandbox to click buttons or submit forms.');
      }
      history.push({ instruction, action: `${action.type} ${action.id || action.url || ''}`, observation: observation.slice(0, 5000) });
      set({ guide: null });
      await captureStep(get, set, idx, evidence, alive, selection);
      if (!alive()) return;
      setJourney(get, set, idx, 'done');
    }
  } catch (e) {
    if (!alive()) return;
    failure = e instanceof Error ? e.message : 'The action failed.';
    const idx = get().guideRun!.journey.length - 1;
    setJourney(get, set, idx, 'failed');
    await captureStep(get, set, idx, undefined, alive, selection);
  }
  if (!alive()) return;
  set({ guide: null });
  const state = site ? get().sandboxSessions[site] : null;
  const known = state ? verifySandboxTask(task, state, get().library, initialState) : null;
  let verified: VerificationResult = { completed: false, reason: 'No completion check ran.', answer: '', source: 'unavailable' };
  if (failure || !finished) {
    const reason = failure || 'The step limit was reached before the agent finished the task.';
    verified = { completed: false, reason, answer: reason, source: 'unavailable' };
  } else if (known?.supported) {
    verified = { ...known, source: 'sandbox-state' };
  } else {
    try {
      const res = await fetch('/api/verify', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-provider-key': currentKey(settings) },
        body: JSON.stringify({ provider: settings.provider, model: currentModel(settings), task, doc: { ...pageWithSelection(get().doc!, get().doc?.sandbox ? null : selection), html: undefined }, selection, history }),
      });
      const result = await res.json();
      if (!alive()) return;
      if (!res.ok) throw new Error(result?.error || 'Page verification was unavailable.');
      if (typeof result.completed !== 'boolean' || typeof result.reason !== 'string' || typeof result.answer !== 'string') throw new Error('The completion check returned an invalid response.');
      verified = { completed: result.completed, reason: result.reason, answer: result.answer, source: 'page-evidence' };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Page verification was unavailable.';
      verified = { completed: false, reason, answer: `The task could not be verified: ${reason}`, source: 'unavailable' };
    }
  }
  if (!alive()) return;
  const completed = !failure && finished && verified.completed;
  const answer = verified.answer;
  const status = failure ? 'Failed' : completed ? 'Completed' : 'Incomplete';
  const selected = get().scratchpad;
  // A fallback can cite the last explicitly selected proof, not dump the whole run into the answer.
  const references = selected.slice(-1).map((e) => `[EV:${e.name}]`).join(' ');
  let finalAnswer = `${answer}${references ? ` ${references}` : ' No screenshot evidence was selected; see Journey for action snapshots.'}`;
  // The model writes the answer from actual outcomes and explicitly selected evidence.
  // The verified runtime status cannot be upgraded by the summarizer.
  if (!failure) {
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-provider-key': currentKey(settings) },
        body: JSON.stringify({ provider: settings.provider, model: currentModel(settings), task, status,
          outcome: answer, journey: history.map((h) => `${h.instruction}\nObserved: ${h.observation}`),
          evidence: selected.map((e) => ({ name: e.name, description: e.caption, observation: e.observation })),
        }),
      });
      const result = await res.json();
      if (!alive()) return;
      if (res.ok && typeof result.answer === 'string' && result.answer.trim()) {
        finalAnswer = result.answer.replace(/\[EV:([^\]]+)\]/g, (ref: string, name: string) => selected.some((e) => e.name === name) ? ref : '');
      }
    } catch { /* Keep the truthful, source-linked runtime fallback. */ }
  }
  if (!alive()) return;
  const run = get().guideRun!;
  set({ guideRun: { ...run, running: false, final: { status, answer: finalAnswer, reasoning: '', verification: verified } } });
}

async function captureStep(
  get: () => StoreState,
  set: (p: Partial<StoreState>) => void,
  step: number,
  ev: EvidenceRequest | undefined,
  alive: () => boolean,
  selection: PageSelection | null,
): Promise<void> {
  const currentDoc = get().doc;
  if (!currentDoc || !alive()) return;
  const doc = pageWithSelection(currentDoc, currentDoc.sandbox && step > 0 ? null : selection);
  const previousEvidence = get().evidence;
  const index = get().scratchpad.length + 1;
  const requestedTarget = ev?.targetId && doc.blocks.some((b) => b.id === ev.targetId) ? ev.targetId : null;
  const proofIds = requestedTarget ? [requestedTarget] : ['current-state', 'notice', 'subtotal', 'language-current', 'order-confirmation'].filter((id) => doc.blocks.some((b) => b.id === id));
  if (ev && proofIds.length) set({ evidence: proofIds.map((id) => ({ id, marker: String(index) })), focusedEvidence: null });
  try {
    const { capturePage, screenshotBox } = await import('./capture-page');
    const imageUrl = await capturePage();
    if (!alive()) return;
    const capturedAt = new Date().toISOString();
    const run = get().guideRun!;
    const instruction = run.journey[step].instruction;
    // Every step has a snapshot. Only an explicit agent request creates named evidence.
    let evidence: Evidence | undefined;
    if (ev?.name) {
      const slug = ev.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);
      evidence = {
        name: `${slug}-${index}`, label: ev.name.replace(/-/g, ' '), index, step, imageUrl,
        url: doc.url, capturedAt, caption: ev.description || ev.name.replace(/-/g, ' '),
        annotation: ev.annotate,
        box: ev.annotate && requestedTarget ? screenshotBox(requestedTarget) : undefined,
        observation: doc.blocks.filter((b) => !b.control).map((b) => b.text).join('\n'),
      };
    }
    set({ guideRun: { ...run, journey: run.journey.map((j, i) => i === step ? { ...j, screenshot: imageUrl, capturedAt, evidenceName: evidence?.name } : j) },
      ...(evidence ? { scratchpad: [...get().scratchpad, evidence] } : {}),
    });
  } catch {
    if (!alive()) return;
    const run = get().guideRun!;
    set({ evidence: previousEvidence, guideRun: { ...run, journey: run.journey.map((j, i) => i === step ? { ...j, screenshotError: 'Screenshot unavailable for this step.' } : j) } });
  }
}
