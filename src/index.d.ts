// ─── Step ────────────────────────────────────────────────────────────────────

import { JSX } from "react";

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
  /**
   * The pathname where this feature lives (e.g. "/settings/billing").
   *
   * When a tour step targets this feature and the user is on a different
   * page, the SDK will:
   *   1. Tell the user it's navigating and why
   *   2. Call the `router` function passed to EventopAIProvider / init()
   *   3. Wait for the feature element to appear before showing the step
   *
   * Prefer `route` over the legacy `screen` API for React Router and
   * Next.js apps.
   */
  route?:              string;
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
   * @deprecated Prefer `route` + the `router` prop on EventopAIProvider.
   *             `screen` is still supported for backward compatibility.
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
  mode?:   'auto' | 'light' | 'dark' | 'glass';
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
  /**
   * Navigation function the SDK calls when a tour step lives on a different page.
   *
   * Pass your framework's navigate/push function here:
   *
   * React Router v6:
   *   const navigate = useNavigate();
   *   <EventopAIProvider router={navigate} ...>
   *
   * Next.js App Router:
   *   const router = useRouter();
   *   <EventopAIProvider router={(path) => router.push(path)} ...>
   *
   * Next.js Pages Router:
   *   const router = useRouter();
   *   <EventopAIProvider router={(path) => router.push(path)} ...>
   *
   * If omitted, the SDK falls back to window.history.pushState + popstate
   * (best-effort; works for simple SPAs that listen to popstate).
   */
  router?:        (path: string) => void | Promise<void>;
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

  /** Hard cancel the active tour. */
  cancelTour(): void;

  /** Resume a paused tour from where the user left off. */
  resumeTour(): void;

  /** Advance the current tour step programmatically. */
  stepComplete(): void;

  /** Block tour advancement and show an inline error. */
  stepFail(message: string): void;

  /** Returns true if a tour is currently running */
  isActive(): boolean;

  /** Returns true if a tour is paused */
  isPaused(): boolean;

  /** @internal — used by the React/Vue packages to sync live feature registry */
  _updateConfig(partial: Partial<Config>): void;
}

declare const EventopAI: EventopSDK;
export default EventopAI;


// ─── React bindings ───────────────────────────────────────────────────────────

export interface EventopAIProviderProps {
  children:        React.ReactNode;
  provider:        ProviderFn;
  appName:         string;
  assistantName?:  string;
  suggestions?:    string[];
  theme?:          Theme;
  position?:       Position;
  /**
   * Navigation function for cross-page tours.
   *
   * React Router v6:   pass `useNavigate()` directly
   * Next.js App Router: pass `(path) => useRouter().push(path)`
   * Next.js Pages Router: pass `(path) => useRouter().push(path)`
   */
  router?:         (path: string) => void | Promise<void>;
}

export interface EventopTargetProps {
  children:         React.ReactElement;
  id:               string;
  name:             string;
  description?:     string;
  /**
   * The pathname where this feature lives (e.g. "/settings/billing").
   * The SDK auto-navigates here when a tour step targets this feature
   * and the user is on a different page.
   */
  route?:           string;
  navigate?:        () => void | Promise<void>;
  navigateWaitFor?: string;
  advanceOn?:       Omit<AdvanceOn, 'selector'>;
  waitFor?:         string;
}

export interface EventopStepProps {
  children:    React.ReactElement;
  feature?:    string;
  index:       number;
  parentStep?: number;
  waitFor?:    string;
  advanceOn?:  Omit<AdvanceOn, 'selector'>;
}

export interface UseEventopAIReturn {
  open():              void;
  close():             void;
  cancelTour():        void;
  resumeTour():        void;
  isActive():          boolean;
  isPaused():          boolean;
  stepComplete():      void;
  stepFail(msg: string): void;
  runTour(steps: Step[]): Promise<void>;
}

export interface UseEventopTourReturn {
  isActive: boolean;
  isPaused: boolean;
  resume():  void;
  cancel():  void;
  open():    void;
  close():   void;
}

export declare function EventopAIProvider(props: EventopAIProviderProps): JSX.Element;
export declare function EventopTarget(props: EventopTargetProps): JSX.Element;
export declare function EventopStep(props: EventopStepProps): JSX.Element;
export declare function useEventopAI(): UseEventopAIReturn;
export declare function useEventopTour(): UseEventopTourReturn;