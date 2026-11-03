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
}

export interface PageDoc {
  url: string;
  title: string;
  siteName?: string;
  favicon?: string;
  blocks: Block[];
  html?: string; // sanitized full-page HTML for faithful display in an iframe
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

// A textual citation: an inline marker ([1], [2]…) tied to a page text block.
export interface TextCitation {
  marker: string;
  id: string;
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

export type GuideAction = 'open' | 'click' | 'fill';

export interface GuideStep {
  id: string;
  instruction: string;
  action?: GuideAction; // open (navigate link) | click (button) | fill (input)
  value?: string; // text to type for a fill action
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
}

export interface SavedChat {
  id: string;
  title: string;
  savedAt: number;
  url: string | null;
  doc: PageDoc | null;
  messages: unknown[];
}
