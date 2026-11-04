// Shared types used by both the serverless routes and the client.

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'listitem'
  | 'quote'
  | 'link'
  | 'button'
  | 'input'
  | 'image';

export interface Block {
  id: string; // stable, e.g. "n12"
  type: BlockType;
  text: string;
  href?: string; // links
  src?: string; // images (absolute URL)
  level?: number; // headings 1-6
  control?: boolean; // interactive (link/button/input) — a valid Guide target
  value?: string; // observed current input value
  multiline?: boolean;
  group?: string; // layout group in trusted, data-only sandbox pages
}

export interface PageDoc {
  url: string;
  title: string;
  siteName?: string;
  favicon?: string;
  blocks: Block[];
  html?: string; // sanitized full-page HTML for faithful display in an iframe
  saved?: boolean; // original website HTML saved locally, with scripts removed
  savedAt?: string;
  sourceFile?: string;
  sandbox?: 'amazon' | 'quora' | 'soundcloud' | 'met-map';
}

export interface PageSelection {
  id: string;
  text: string;
  url: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export type Provider = 'openai' | 'openrouter';
export type Mode = 'find' | 'guide';
export type AutoMode = 'noask' | 'ask';

export interface Usage {
  prompt: number;
  completion: number;
  total: number;
  cost: number | null; // USD
  estimated: boolean; // true = computed from a price table (OpenAI); false = provider-reported (OpenRouter)
}

// A textual citation: an inline marker ([1], [2]…) tied to a page text block,
// with the exact supporting text span (quote) within that block.
export interface TextCitation {
  marker: string;
  id: string;
  quote?: string;
}

// Visual evidence: an image block plus a normalized bounding box [x, y, w, h]
// (each 0..1) the vision model returned for the region that supports the answer.
export interface VisualEvidence {
  marker: string;
  id: string;
  src: string;
  box: [number, number, number, number];
  caption?: string;
}

// Raw request/response captured for the developer inspector.
export interface AskDebug {
  provider: string;
  model: string;
  system: string;
  input: string; // the user text (page blocks + question) sent to the model
  images: string[]; // image URLs sent to the vision model
  rawOutput: string; // the model's raw JSON string
}

export interface FindResult {
  kind: 'find';
  answer: string;
  citations: TextCitation[];
  visual: VisualEvidence | null;
  usage?: Usage;
  debug?: AskDebug;
}

export type GuideAction = 'open' | 'click' | 'fill' | 'observe';

export interface GuideStep {
  id: string;
  instruction: string;
  action?: GuideAction; // open (navigate link) | click (button) | fill (input) | observe
  value?: string; // text to type for a fill action
  // the agent may emit an action AND save evidence at the same step
  evidence?: { name: string; imageId?: string; annotate?: string };
}

export interface EvidenceRequest {
  name: string;
  description?: string;
  targetId?: string;
  annotate?: string;
}

// Only agent-selected evidence goes into the scratchpad. Journey snapshots are separate.
export interface Evidence {
  name: string; // e.g. "orange-added-to-cart"
  label?: string;
  step?: number;
  annotation?: string;
  targetId?: string; // page block that is visually marked while this evidence is active
  index: number; // 1-based badge number
  imageUrl: string;
  box?: [number, number, number, number]; // annotation bounding box (normalized)
  caption?: string;
  observation?: string; // actual state at capture time, also provided to the summarizer
  url?: string;
  capturedAt?: string;
}

export interface AnnotateResult {
  box: [number, number, number, number] | null;
  caption?: string;
}

export interface GuideSummary {
  status: 'Completed' | 'Incomplete' | 'Failed';
  answer: string; // may contain [EV:name] references, rendered as 📷 badges
  reasoning: string; // the reasoning-trail text
}

export interface GuideResult {
  kind: 'guide';
  answer: string;
  steps: GuideStep[];
  usage?: Usage;
  debug?: AskDebug;
}

export type AskResult = FindResult | GuideResult;

export interface AskRequestBody {
  provider: Provider;
  model: string;
  mode: Mode;
  question: string;
  doc: PageDoc;
  selection?: PageSelection;
}

export interface SavedChat {
  id: string;
  title: string;
  savedAt: number;
  url: string | null;
  doc: PageDoc | null;
  messages: unknown[];
}
