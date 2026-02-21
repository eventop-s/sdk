# eventop/sdk

React integration for eventopAI. Features register at the **call site**, not
inside component definitions — so any generic component works with any feature,
and you never touch the component itself.

---

## Install

```bash
npm install @eventop/sdk
```

---

## The mental model

```jsx
// ❌ Old way — registration inside the component, breaks reusability
function ExportButton() {
  useeventopFeature({ id: 'export', name: 'Export' }); // hardcoded
  return <button>Export</button>;
}

// ✅ New way — registration at the call site, component stays generic
function Button({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>;
}

// Different features, same component, different places in the app
<eventopTarget id="export" name="Export Design" description="Download as PNG or SVG">
  <Button onClick={handleExport}>Export</Button>
</eventopTarget>

<eventopTarget id="download-report" name="Download Report" description="Save as PDF">
  <Button onClick={handleDownload}>Download</Button>
</eventopTarget>
```

---

## Quick start

```jsx
// main.jsx — provider at the root, nothing else needed here
import { EventopAIProvider } from '@eventop/sdk';
import eventopAI from 'eventop-ai-sdk';

const provider = eventopAI.providers.custom(async ({ systemPrompt, messages }) => {
  const res = await fetch('/api/guide', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ systemPrompt, messages }),
  });
  return res.json();
});

export default function App() {
  return (
    <eventopAIProvider
      provider={provider}
      appName="My App"
      assistantName="AI Guide"
      suggestions={['How do I export?', 'Invite a teammate']}
      theme={{ mode: 'auto', tokens: { accent: '#6366f1' } }}
      position={{ corner: 'bottom-right' }}
    >
      <YourApp />
    </eventopAIProvider>
  );
}
```

---

## Components

### `<eventopTarget>`

Wraps any component and registers it as a feature. Works with your own components,
shadcn, MUI, Radix — anything. The wrapped component does not need to accept refs
or know about eventopAI.

```jsx
import { EventopTarget } from '@eventop/sdk';

// Simple feature
<EventopTarget id="export" name="Export Design" description="Download as PNG or SVG">
  <Button>Export</Button>
</EventopTarget>

// With navigation — for features behind a route change
<EventopTarget
  id="effects"
  name="Effects Panel"
  description="Apply shadows, blur and glow"
  navigate={() => router.push('/canvas')}
  navigateWaitFor="#canvas-stage"
>
  <EffectsPanel />
</EventopTarget>

// Auto-advance the tour when clicked
<EventopTarget
  id="open-settings"
  name="Settings"
  description="Open the workspace settings"
  advanceOn={{ event: 'click', delay: 200 }}
>
  <SettingsButton />
</EventopTarget>
```

**Props:**

| Prop              | Type     | Required | Description                                           |
|-------------------|----------|----------|-------------------------------------------------------|
| `id`              | string   | ✓        | Unique feature id                                     |
| `name`            | string   | ✓        | Human-readable name (AI reads this)                   |
| `description`     | string   |          | What it does (AI uses this to match user intent)      |
| `navigate`        | function |          | Navigate here if component is not currently mounted   |
| `navigateWaitFor` | string   |          | CSS selector to wait for after navigating             |
| `advanceOn`       | object   |          | `{ event, delay?, selector? }` — auto-advance the tour|
| `waitFor`         | string   |          | CSS selector to wait for before showing this step     |

---

### `<eventopStep>`

Registers one step in a multi-step flow. Can live **anywhere** in the component
tree — it does not need to be inside a `eventopTarget`. Steps self-assemble
into the correct sequence via the `index` prop.

```jsx
import { EventopStep } from '@eventop/sdk';

// These three components are totally separate — different files, different parents
// They form a flow by sharing the same feature id and sequential indexes

// In CanvasStage.jsx
<EventopStep
  feature="drop-shadow"
  index={0}
  advanceOn={{ selector: '.canvas-el', event: 'click', delay: 300 }}
>
  <div className="canvas-stage">...</div>
</EventopStep>

// In Toolbar.jsx
<EventopStep
  feature="drop-shadow"
  index={1}
  waitFor=".canvas-el.selected"
  advanceOn={{ event: 'click', delay: 200 }}
>
  <button id="btn-effects">Effects</button>
</EventopStep>

// In EffectsPanel.jsx
<EventopStep
  feature="drop-shadow"
  index={2}
  waitFor="#effects-panel.open"
  advanceOn={{ event: 'click', delay: 300 }}
>
  <button id="shadow-toggle">Shadow</button>
</EventopStep>

// Only renders when shadow is on — SDK waits for it via waitFor
<EventopStep feature="drop-shadow" index={3} waitFor="#shadow-controls.visible">
  <div id="shadow-controls">...</div>
</EventopStep>
```

**Nested sub-steps:**

Pass `parentStep` to model steps that belong inside another step.
Useful for things like "open font picker → (select font family → select weight → set size)".

```jsx
// Step 1: open font picker
<EventopStep feature="style-text" index={1}>
  <FontPickerButton />
</EventopStep>

// Sub-steps of step 1 — run after step 1, in order
<EventopStep feature="style-text" index={0} parentStep={1} waitFor=".font-picker.open">
  <FontFamilyList />
</EventopStep>
<EventopStep feature="style-text" index={1} parentStep={1} waitFor=".family-selected">
  <FontWeightList />
</EventopStep>
```

**Implicit feature id from `eventopTarget` ancestor:**

If `eventopStep` is inside a `eventopTarget`, it inherits the feature id:

```jsx
<EventopTarget id="drop-shadow" name="Drop Shadow" description="...">
  <div>
    <EventopStep index={0} advanceOn={{ selector: '.el', event: 'click' }}>
      <Canvas />
    </EventopStep>
    <EventopStep index={1} waitFor=".el.selected">
      <EffectsButton />
    </EventopStep>
  </div>
</EventopTarget>
```

**Props:**

| Prop         | Type   | Required | Description                                              |
|--------------|--------|----------|----------------------------------------------------------|
| `feature`    | string | *        | Feature id this step belongs to (*not needed if inside `eventopTarget`) |
| `index`      | number | ✓        | Position in the flow (0-based)                           |
| `parentStep` | number |          | Parent step index — makes this a sub-step                |
| `waitFor`    | string |          | CSS selector to wait for before showing                  |
| `advanceOn`  | object |          | `{ event, delay?, selector? }` — auto-advance            |

---

### `useeventopAI`

Call SDK methods from inside any component. Use for `stepComplete()` and
`stepFail()` when you have async validation the tour should respect.

```jsx
import { useeventopAI } from '@eventop/sdk';

function CheckoutStep() {
  const { stepComplete, stepFail } = useeventopAI();

  async function handleContinue() {
    const ok = await validateCard(cardNumber);
    if (ok) stepComplete();            // tour advances to next step
    else stepFail('Invalid card number — please try again.');
  }

  return <button onClick={handleContinue}>Continue</button>;
}
```

**Returns:**

| Method           | Description                                         |
|------------------|-----------------------------------------------------|
| `stepComplete()` | Advance the active tour step                        |
| `stepFail(msg)`  | Block advancement and show error in the tooltip     |
| `open()`         | Open the chat panel                                 |
| `close()`        | Close the chat panel                                |
| `cancelTour()`   | Hard cancel — no resume state saved                 |
| `resumeTour()`   | Resume a paused tour from where it left off         |
| `isActive()`     | Returns true if a tour is running                   |
| `isPaused()`     | Returns true if a tour is paused                    |
| `runTour(steps)` | Run a manual tour bypassing the AI                  |

---

### `useeventopTour`

React to tour state in your own UI. Reactive — updates every 300ms.

```jsx
import { useeventopTour } from '@eventop/sdk';

function TourStatusBar() {
  const { isActive, isPaused, resume, cancel } = useeventopTour();

  if (!isActive && !isPaused) return null;

  return (
    <div className="tour-bar">
      {isPaused ? (
        <>
          <span>⏸ Tour paused</span>
          <button onClick={resume}>Resume</button>
        </>
      ) : (
        <span>▶ Guided tour running</span>
      )}
      <button onClick={cancel}>End tour</button>
    </div>
  );
}
```

---

## Screen navigation

Because `eventopTarget` only registers a feature while its component is mounted,
screen detection is automatic. If the Effects Panel is not rendered, the `effects`
feature simply does not exist in the registry — no `screen.check()` needed.

For features that live behind a route change, pass `navigate`:

```jsx
// Only rendered on /canvas route
function EffectsPanel() {
  return (
    <EventopTarget
      id="effects"
      name="Effects Panel"
      description="Apply shadows and blur"
      navigate={() => router.push('/canvas')}
      navigateWaitFor="#canvas-root"
    >
      <div id="effects-panel">...</div>
    </EventopTarget>
  );
}
```
