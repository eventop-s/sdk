import { ReactNode, FC } from 'react';
import { ProviderFn, Theme, Position, AdvanceOn } from '../index.js';

// ─── Provider ────────────────────────────────────────────────────────────────

export interface EventopAIProviderProps {
  children:        ReactNode;
  /** AI provider function. Use providers.custom() in production. */
  provider:        ProviderFn;
  /** Your app's display name. Shown in the chat header. */
  appName:         string;
  /** Name shown in the chat header. Default: 'AI Guide' */
  assistantName?:  string;
  /** Clickable suggestion chips shown on first open */
  suggestions?:    string[];
  theme?:          Theme;
  position?:       Position;
}

/**
 * Root provider. Drop this once at the top of your app.
 * All EventopTarget and EventopStep components anywhere in the tree
 * register with this provider automatically.
 *
 * @example
 * <EventopAIProvider
 *   provider={myServerFetcher}
 *   appName="My App"
 *   theme={{ mode: 'auto', tokens: { accent: '#6366f1' } }}
 * >
 *   <App />
 * </EventopAIProvider>
 */
export const EventopAIProvider: FC<EventopAIProviderProps>;

// ─── EventopTarget ───────────────────────────────────────────────────────────

export interface EventopTargetProps {
  /** The component to wrap. Must be a single React element. */
  children:          ReactNode;
  /** Unique feature id */
  id:                string;
  /** Human-readable name the AI reads to understand the feature */
  name:              string;
  /** What the feature does — AI uses this to match user intent */
  description?:      string;
  /**
   * Navigate to this screen if the component is not currently mounted.
   * Called when the user asks about this feature from a different screen.
   */
  navigate?:         () => void | Promise<void>;
  /** CSS selector to wait for after navigating */
  navigateWaitFor?:  string;
  /**
   * Auto-advance the tour when this event fires on the wrapped element.
   * Omit `selector` to default to the wrapped element itself.
   */
  advanceOn?:        Omit<AdvanceOn, 'selector'> & { selector?: string };
  /** CSS selector to wait for before showing this step */
  waitFor?:          string;
}

/**
 * Wraps any component and registers it as a EventopAI feature.
 * Registration happens at the CALL SITE — the wrapped component is unchanged.
 *
 * Works with any component: your own, shadcn, MUI, Radix, anything.
 * The wrapped component does not need to accept refs or know about EventopAI.
 *
 * @example
 * // Same Button, different features in different parts of the app
 * <EventopTarget id="export" name="Export Design" description="Download as PNG or SVG">
 *   <Button onClick={handleExport}>Export</Button>
 * </EventopTarget>
 *
 * <EventopTarget id="share" name="Share Document" description="Share with teammates">
 *   <Button onClick={handleShare}>Share</Button>
 * </EventopTarget>
 */
export const EventopTarget: FC<EventopTargetProps>;

// ─── EventopStep ─────────────────────────────────────────────────────────────

export interface EventopStepProps {
  /** The component to wrap. Must be a single React element. */
  children:     ReactNode;
  /**
   * Feature id this step belongs to.
   * Optional if inside a <EventopTarget> — inferred from scope context.
   */
  feature?:     string;
  /** Position in the flow sequence. 0-based. Required. */
  index:        number;
  /**
   * Parent step index — makes this a sub-step.
   * Sub-steps are inlined after their parent step in the final flow.
   *
   * @example
   * // Step 1: open font picker
   * <EventopStep feature="style-text" index={1}><FontPickerBtn /></EventopStep>
   *
   * // Sub-steps of step 1
   * <EventopStep feature="style-text" index={0} parentStep={1}><FontFamily /></EventopStep>
   * <EventopStep feature="style-text" index={1} parentStep={1}><FontWeight /></EventopStep>
   */
  parentStep?:  number;
  /** CSS selector to wait for before showing this step */
  waitFor?:     string;
  /**
   * Auto-advance when this event fires on the wrapped element.
   * Omit `selector` to default to the wrapped element.
   */
  advanceOn?:   Omit<AdvanceOn, 'selector'> & { selector?: string };
}

/**
 * Registers one step in a multi-step flow.
 * Can live anywhere in the component tree — steps self-assemble by index.
 *
 * The parent feature id comes from either:
 *  1. The `feature` prop (explicit — works anywhere in the tree)
 *  2. The nearest <EventopTarget> ancestor (implicit — via context)
 *
 * @example
 * // In CanvasStage.jsx
 * <EventopStep feature="drop-shadow" index={0}
 *   advanceOn={{ selector: '.canvas-el', event: 'click', delay: 300 }}>
 *   <div className="canvas-stage">...</div>
 * </EventopStep>
 *
 * // In Toolbar.jsx — completely separate component
 * <EventopStep feature="drop-shadow" index={1} waitFor=".canvas-el.selected">
 *   <button id="btn-effects">Effects</button>
 * </EventopStep>
 */
export const EventopStep: FC<EventopStepProps>;

// ─── Hooks ───────────────────────────────────────────────────────────────────

export interface EventopAIHook {
  open():                   void;
  close():                  void;
  cancelTour():             void;
  resumeTour():             void;
  isActive():               boolean;
  isPaused():               boolean;
  /**
   * Advance the active tour step.
   * Call after async validation succeeds.
   *
   * @example
   * const { stepComplete, stepFail } = useEventopAI();
   * const ok = await validateEmail(email);
   * if (ok) stepComplete();
   * else stepFail('Please enter a valid email address.');
   */
  stepComplete():           void;
  /** Block tour advancement and show an error in the current step tooltip. */
  stepFail(message: string): void;
  runTour(steps: import('../index.js').Step[]): Promise<void>;
}

/**
 * Access the SDK programmatic API from inside any component.
 *
 * @example
 * function CheckoutStep() {
 *   const { stepComplete, stepFail } = useEventopAI();
 *   async function handleContinue() {
 *     const ok = await validateCard(number);
 *     if (ok) stepComplete();
 *     else stepFail('Invalid card number.');
 *   }
 *   return <button onClick={handleContinue}>Continue</button>;
 * }
 */
export function useEventopAI(): EventopAIHook;

export interface EventopTourState {
  /** True if a tour is currently running */
  isActive: boolean;
  /** True if a tour is paused (cancelled but resumable) */
  isPaused: boolean;
  /** Resume a paused tour */
  resume():  void;
  /** Hard cancel — clears pause state */
  cancel():  void;
  open():    void;
  close():   void;
}

/**
 * Reactively track tour state in your own UI.
 * Updates every 300ms — lightweight for a status indicator.
 *
 * @example
 * function TourBar() {
 *   const { isActive, isPaused, resume, cancel } = useEventopTour();
 *   if (!isActive && !isPaused) return null;
 *   return (
 *     <div>
 *       {isPaused && <button onClick={resume}>Resume</button>}
 *       <button onClick={cancel}>End tour</button>
 *     </div>
 *   );
 * }
 */
export function useEventopTour(): EventopTourState;