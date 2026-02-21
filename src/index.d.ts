// ─── Step ────────────────────────────────────────────────────────────────────

export interface Step {
  id?:       string;
  title:     string;
  text:      string;
  selector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

// ─── AdvanceOn ───────────────────────────────────────────────────────────────

export interface AdvanceOn {
  /** CSS selector for the element to listen on. Defaults to the feature element. */
  selector?: string;
  /** DOM event name e.g. 'click', 'blur', 'change' */
  event:     string;
  /** Milliseconds to wait before advancing (default: 300) */
  delay?:    number;
}

// ─── Flow step (multi-step feature) ──────────────────────────────────────────

export interface FlowStep {
  /** CSS selector for this step's target element */
  selector?:  string;
  /** Wait for this selector to appear in the DOM before showing the step */
  waitFor?:   string | null;
  /** Auto-advance config */
  advanceOn?: AdvanceOn | null;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export interface Screen {
  /** Unique screen identifier */
  id:         string;
  /** Returns true if the user is currently on this screen */
  check:      () => boolean;
  /** Navigate to this screen. Can be async. */
  navigate?:  () => void | Promise<void>;
  /** CSS selector to wait for after navigating */
  waitFor?:   string;
}

// ─── Feature ─────────────────────────────────────────────────────────────────

export interface Feature {
  /** Unique feature id — referenced by the AI when building tour steps */
  id:                  string;
  /** Human-readable name the AI reads to understand the feature */
  name:                string;
  /** What the feature does — AI uses this to match user intent */
  description?:        string;
  /** CSS selector for the feature's primary DOM element */
  selector:            string;
  /** Additional related selectors for context */
  relatedSelectors?:   Record<string, string>;
  /** Auto-advance when this event fires */
  advanceOn?:          AdvanceOn | null;
  /** Wait for this selector before showing the step */
  waitFor?:            string | null;
  /**
   * Multi-step flow. Each entry is a sequential sub-step.
   * Developer lists selectors; AI generates the copy for each.
   */
  flow?:               FlowStep[];
  /**
   * Screen this feature lives on.
   * SDK navigates to the correct screen before showing the step.
   */
  screen?:             Screen;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export interface ThemeTokens {
  accent?:          string;
  accentSecondary?: string;
  bg?:              string;
  surface?:         string;
  border?:          string;
  text?:            string;
  textDim?:         string;
  radius?:          string;
  fontFamily?:      string;
}

export interface Theme {
  /** 'auto' reads prefers-color-scheme. Default: 'auto' */
  mode?:   'auto' | 'light' | 'dark';
  /** Named preset. Overridden by tokens if both are provided. */
  preset?: 'default' | 'minimal' | 'soft';
  /** Override individual design tokens */
  tokens?: ThemeTokens;
}

// ─── Position ────────────────────────────────────────────────────────────────

export interface Position {
  /** Which corner to anchor the chat bubble. Default: 'bottom-right' */
  corner?:  'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Horizontal offset in px. Default: 28 */
  offsetX?: number;
  /** Vertical offset in px. Default: 28 */
  offsetY?: number;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface Config {
  /** Your app's display name. Required. */
  appName:        string;
  /** Name shown in the chat header. Default: 'AI Guide' */
  assistantName?: string;
  /** Feature definitions the AI can reference. Required. */
  features:       Feature[];
  /** Clickable suggestion chips shown on first open */
  suggestions?:   string[];
  theme?:         Theme;
  position?:      Position;
  /** @internal — set by provider factories */
  _providerName?: string;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export interface ProviderArgs {
  systemPrompt: string;
  messages:     Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ProviderResult {
  message: string;
  steps:   Step[];
}

export type ProviderFn = (args: ProviderArgs) => Promise<ProviderResult>;

export interface ClaudeOptions {
  apiKey: string;
  /** Default: 'claude-sonnet-4-20250514' */
  model?: string;
}

export interface OpenAIOptions {
  apiKey: string;
  /** Default: 'gpt-4o' */
  model?: string;
}

export interface GeminiOptions {
  apiKey: string;
  /** Default: 'gemini-2.5-flash' */
  model?: string;
}

export interface Providers {
  /**
   * Anthropic Claude provider.
   * @warning Never use apiKey in client-side code. Use providers.custom() in production.
   */
  claude(opts: ClaudeOptions): ProviderFn;
  /**
   * OpenAI provider.
   * @warning Never use apiKey in client-side code. Use providers.custom() in production.
   */
  openai(opts: OpenAIOptions): ProviderFn;
  /**
   * Google Gemini provider.
   * @warning Never use apiKey in client-side code. Use providers.custom() in production.
   */
  gemini(opts: GeminiOptions): ProviderFn;
  /**
   * Custom provider — proxy through your own server.
   * Recommended for production. Keeps API keys off the browser.
   *
   * @example
   * providers.custom(async ({ systemPrompt, messages }) => {
   *   const res = await fetch('/api/guide', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify({ systemPrompt, messages }),
   *   });
   *   return res.json();
   * })
   */
  custom(fn: ProviderFn): ProviderFn;
}

// ─── Init options ─────────────────────────────────────────────────────────────

export interface InitOptions {
  provider: ProviderFn;
  config:   Config;
}

// ─── Main SDK ────────────────────────────────────────────────────────────────

export interface EventopSDK {
  providers: Providers;

  /** Initialize the SDK. Must be called once before any other method. */
  init(opts: InitOptions): void;

  /** Open the chat panel */
  open(): void;

  /** Close the chat panel */
  close(): void;

  /**
   * Run a tour manually, bypassing the AI.
   * Useful for testing or hardcoded flows.
   */
  runTour(steps: Step[], options?: { showProgress?: boolean; waitTimeout?: number }): Promise<void>;

  /**
   * Hard cancel the active tour.
   * Clears all pause state — no resume available after this.
   */
  cancelTour(): void;

  /**
   * Resume a paused tour from where the user left off.
   * Called automatically by the resume button in the chat panel.
   */
  resumeTour(): void;

  /**
   * Advance the current tour step programmatically.
   * Call after async validation succeeds.
   *
   * @example
   * const ok = await validateEmail(email);
   * if (ok) ShepherdAI.stepComplete();
   */
  stepComplete(): void;

  /**
   * Block tour advancement and show an inline error in the current step tooltip.
   *
   * @example
   * ShepherdAI.stepFail('Please enter a valid email address.');
   */
  stepFail(message: string): void;

  /** Returns true if a tour is currently running */
  isActive(): boolean;

  /** Returns true if a tour is paused (cancelled but resumable) */
  isPaused(): boolean;

  /** @internal — used by the React/Vue packages to sync live feature registry */
  _updateConfig(partial: Partial<Config>): void;
}

declare const ShepherdAI: EventopSDK;
export default ShepherdAI;