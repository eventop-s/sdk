# @eventop/sdk

AI-powered guided tours for any React or Next.js app. Drop-in, themeable, works with any component library.

---

## Install

```bash
npm install @eventop/sdk
# or
yarn add @eventop/sdk
# or
pnpm add @eventop/sdk
```

---

## How it works

You wrap any element with `<EventopTarget>` at the call site. The SDK registers it as a feature the AI can guide users to. When a user types what they need in the chat bubble, the AI picks the right features and walks them through step by step.

The wrapped component stays completely generic — `<Button>`, `<div>`, anything from shadcn, MUI, Radix, whatever. You never modify the component itself.

```jsx
// Same Button, two different features, two different places in the app
<EventopTarget id="export" name="Export Design" description="Download as PNG or SVG">
  <Button onClick={handleExport}>Export</Button>
</EventopTarget>

<EventopTarget id="share" name="Share Design" description="Share a link with teammates">
  <Button onClick={handleShare}>Share</Button>
</EventopTarget>
```

---

## React app

### 1. Set up the server endpoint

Never put API keys in the browser. Create a server route that proxies the AI call.

```js
// server.js (Express)
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/guide', async (req, res) => {
  const { systemPrompt, messages } = req.body;
  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system:     systemPrompt,
    messages,
  });
  res.json(JSON.parse(response.content[0].text));
});
```

### 2. Add the provider at the root

Pass your router's navigate function so the SDK can move users between pages automatically.

```jsx
// main.jsx
import { useNavigate } from 'react-router-dom';
import { EventopAIProvider } from '@eventop/sdk/react';

const provider = async ({ systemPrompt, messages }) => {
  const res = await fetch('/api/guide', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ systemPrompt, messages }),
  });
  return res.json();
};

export default function App() {
  const navigate = useNavigate();

  return (
    <EventopAIProvider
      provider={provider}
      router={navigate}
      appName="My App"
      assistantName="AI Guide"
      suggestions={['How do I export?', 'Invite a teammate']}
      theme={{ mode: 'auto', tokens: { accent: '#6366f1' } }}
      position={{ corner: 'bottom-right' }}
    >
      <YourApp />
    </EventopAIProvider>
  );
}
```

### 3. Wrap features anywhere in the tree

Add `route` to any feature that lives on a different page. The SDK navigates there automatically when a tour needs it.

```jsx
// ExportPanel.jsx — lives on /canvas
import { EventopTarget } from '@eventop/sdk/react';

export function ExportPanel() {
  return (
    <EventopTarget
      id="export"
      name="Export Design"
      description="Download the design as PNG, SVG or PDF"
      route="/canvas"
    >
      <div id="export-panel">
        <button>PNG</button>
        <button>SVG</button>
        <button>PDF</button>
      </div>
    </EventopTarget>
  );
}
```

That's it. The chat bubble appears automatically. Users type what they need, the SDK figures out which page the feature is on, navigates there, and walks them through step by step.

---

## Next.js app

### 1. Create the API route

```js
// app/api/guide/route.js  (App Router)
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  const { systemPrompt, messages } = await request.json();
  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system:     systemPrompt,
    messages,
  });
  return Response.json(JSON.parse(response.content[0].text));
}
```

```js
// pages/api/guide.js  (Pages Router)
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  const { systemPrompt, messages } = req.body;
  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system:     systemPrompt,
    messages,
  });
  res.json(JSON.parse(response.content[0].text));
}
```

### 2. Add the provider in a client component

The SDK touches the DOM so the provider must be a client component. Pass `router` so
the SDK can navigate between pages during a tour.

```jsx
// components/EventopProvider.jsx
'use client';

import { useRouter } from 'next/navigation'; // App Router
// import { useRouter } from 'next/router';  // Pages Router

import { EventopAIProvider } from '@eventop/sdk/react';

const provider = async ({ systemPrompt, messages }) => {
  const res = await fetch('/api/guide', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ systemPrompt, messages }),
  });
  return res.json();
};

export function EventopProvider({ children }) {
  const router = useRouter();

  return (
    <EventopAIProvider
      provider={provider}
      router={(path) => router.push(path)}
      appName="My App"
      assistantName="AI Guide"
      suggestions={['How do I export?', 'Invite a teammate']}
      theme={{ mode: 'auto', tokens: { accent: '#6366f1' } }}
      position={{ corner: 'bottom-right' }}
    >
      {children}
    </EventopAIProvider>
  );
}
```

```jsx
// app/layout.jsx
import { EventopProvider } from '@/components/EventopProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <EventopProvider>
          {children}
        </EventopProvider>
      </body>
    </html>
  );
}
```

### 3. Wrap features in client components

Any component that uses `EventopTarget`, `EventopStep`, or the hooks needs `'use client'`.
Add `route` to features that live on a different page than where tours are typically started.

```jsx
// components/Toolbar.jsx  — lives on /canvas
'use client';

import { EventopTarget } from '@eventop/sdk/react';

export function Toolbar() {
  return (
    <div className="toolbar">
      <EventopTarget
        id="export"
        name="Export Design"
        description="Download as PNG, SVG or PDF"
        route="/canvas"
      >
        <button>Export</button>
      </EventopTarget>

      <EventopTarget
        id="share"
        name="Share Design"
        description="Share a link to this design"
        route="/canvas"
      >
        <button>Share</button>
      </EventopTarget>
    </div>
  );
}
```

---

## Smart navigation

When a user asks about a feature that lives on a different page, the SDK handles
everything automatically — no manual navigation code needed.

**What the user sees:**

Before the tour starts, the chat panel tells them which pages will be visited:

> 🗺 This tour visits 2 areas: Export Design and Billing Settings. I'll navigate between them automatically.

Mid-tour, just before each page change:

> ↗ Taking you to the Billing Settings area…

The page changes, the target element appears, and the tooltip shows — all without
the user doing anything.

**How to set it up:**

Two things are required: `router` on the provider, and `route` on any `EventopTarget`
that lives on a different page.

```jsx
// Provider — pass your router once
<EventopAIProvider router={navigate} ...>

// Feature on /settings/billing
<EventopTarget id="billing" name="Billing" route="/settings/billing">
  <BillingSection />
</EventopTarget>

// Feature on /canvas — no route needed if tours always start here
<EventopTarget id="export" name="Export">
  <ExportButton />
</EventopTarget>
```

Features that share the page where tours are typically started don't need `route`.
Only add it to features on other pages.

---

## Multi-step flows

For features that require multiple actions in sequence (open a panel, toggle a switch, adjust sliders), use `<EventopStep>`. Steps can live in completely different components — they self-assemble by index.

```jsx
// CanvasStage.jsx — step 0: click an element
'use client';
import { EventopStep } from '@eventop/sdk/react';

export function CanvasStage() {
  return (
    <EventopStep
      feature="drop-shadow"
      index={0}
      advanceOn={{ selector: '.canvas-el', event: 'click', delay: 300 }}
    >
      <div className="canvas-stage">...</div>
    </EventopStep>
  );
}

// Toolbar.jsx — step 1: click Effects (different component entirely)
export function EffectsButton() {
  return (
    <EventopStep
      feature="drop-shadow"
      index={1}
      waitFor=".canvas-el.selected"
      advanceOn={{ event: 'click', delay: 200 }}
    >
      <button id="btn-effects">✨ Effects</button>
    </EventopStep>
  );
}

// EffectsPanel.jsx — step 2: toggle shadow on
export function ShadowToggle({ onToggle }) {
  return (
    <EventopStep
      feature="drop-shadow"
      index={2}
      waitFor="#effects-panel.open"
      advanceOn={{ event: 'click', delay: 300 }}
    >
      <button id="shadow-toggle" onClick={onToggle}>Shadow</button>
    </EventopStep>
  );
}

// Step 3: sliders — only rendered when shadow is on
// SDK waits for them via waitFor before showing this step
export function ShadowSliders() {
  return (
    <EventopStep feature="drop-shadow" index={3} waitFor="#shadow-controls.visible">
      <div id="shadow-controls" className="visible">...</div>
    </EventopStep>
  );
}
```

The parent feature still needs a `<EventopTarget>` somewhere:

```jsx
// In whichever component owns the canvas screen
<EventopTarget
  id="drop-shadow"
  name="Drop Shadow Effect"
  description="Apply a customisable drop shadow to a selected element"
  route="/canvas"
>
  <div className="canvas-screen">
    <CanvasStage />
    <EffectsButton />
    <ShadowToggle />
    {shadowOn && <ShadowSliders />}
  </div>
</EventopTarget>
```

---

## Async validation

Use `useEventopAI` when a tour step depends on the user completing a form action correctly before advancing.

```jsx
'use client';
import { useEventopAI } from '@eventop/sdk/react';

export function CheckoutForm() {
  const { stepComplete, stepFail } = useEventopAI();
  const [email, setEmail] = useState('');

  async function handleContinue() {
    const ok = await validateEmail(email);
    if (ok) stepComplete();
    else stepFail('Please enter a valid email address.');
  }

  return (
    <EventopTarget id="email-field" name="Email Address" description="Enter your email">
      <div>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button onClick={handleContinue}>Continue</button>
      </div>
    </EventopTarget>
  );
}
```

---

## Tour status in your own UI

```jsx
'use client';
import { useEventopTour } from '@eventop/sdk/react';

export function TourStatusBar() {
  const { isActive, isPaused, resume, cancel } = useEventopTour();

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

## API reference

### `<EventopAIProvider>`

| Prop            | Type       | Required | Default        | Description                                                    |
|-----------------|------------|----------|----------------|----------------------------------------------------------------|
| `provider`      | function   | ✓        | —              | Async function that calls your server route                    |
| `appName`       | string     | ✓        | —              | Shown in the chat header                                       |
| `assistantName` | string     |          | `'AI Guide'`   | Name shown in the chat header                                  |
| `router`        | function   |          | —              | `(path: string) => void` — your framework's navigate function. Used for cross-page tours. React Router: pass `useNavigate()`. Next.js: pass `(path) => router.push(path)`. Falls back to `history.pushState` if omitted. |
| `suggestions`   | string[]   |          | `[]`           | Clickable chips on first open                                  |
| `theme`         | object     |          | dark, default  | `{ mode, preset, tokens }`                                     |
| `position`      | object     |          | bottom-right   | `{ corner, offsetX, offsetY }`                                 |

### `<EventopTarget>`

| Prop              | Type     | Required | Description                                                                  |
|-------------------|----------|----------|------------------------------------------------------------------------------|
| `id`              | string   | ✓        | Unique feature id                                                            |
| `name`            | string   | ✓        | Human-readable name the AI reads                                             |
| `description`     | string   |          | What it does — AI uses this to match user intent                             |
| `route`           | string   |          | Pathname where this feature lives (e.g. `"/settings/billing"`). When set, the SDK auto-navigates here before showing this step and explains the navigation to the user. |
| `navigate`        | function |          | Legacy: navigate here if component is not mounted. Prefer `route` + `router`.|
| `navigateWaitFor` | string   |          | CSS selector to wait for after navigating                                    |
| `advanceOn`       | object   |          | `{ event, delay?, selector? }` — auto-advance the tour                       |
| `waitFor`         | string   |          | CSS selector to wait for before showing this step                            |

### `<EventopStep>`

| Prop        | Type   | Required | Description                                                    |
|-------------|--------|----------|----------------------------------------------------------------|
| `feature`   | string | *        | Feature id (*not needed if inside `<EventopTarget>`)           |
| `index`     | number | ✓        | Position in the flow, 0-based                                  |
| `parentStep`| number |          | Makes this a sub-step of another step                          |
| `waitFor`   | string |          | CSS selector to wait for before showing                        |
| `advanceOn` | object |          | `{ event, delay?, selector? }` — auto-advance                  |

### `useEventopAI`

| Method             | Description                                          |
|--------------------|------------------------------------------------------|
| `stepComplete()`   | Advance the active tour step                         |
| `stepFail(msg)`    | Block advancement and show error in the tooltip      |
| `open()`           | Open the chat panel                                  |
| `close()`          | Close the chat panel                                 |
| `cancelTour()`     | Hard cancel — no resume state saved                  |
| `resumeTour()`     | Resume a paused tour from where it left off          |
| `isActive()`       | Returns true if a tour is currently running          |
| `isPaused()`       | Returns true if a tour is paused                     |
| `runTour(steps)`   | Run a tour manually, bypassing the AI                |

### `useEventopTour`

| Property / Method | Type     | Description                              |
|-------------------|----------|------------------------------------------|
| `isActive`        | boolean  | True if a tour is running                |
| `isPaused`        | boolean  | True if a tour is paused                 |
| `resume()`        | function | Resume a paused tour                     |
| `cancel()`        | function | Hard cancel                              |
| `open()`          | function | Open the chat panel                      |
| `close()`         | function | Close the chat panel                     |

---

## Theme tokens

| Token             | Default (dark)   | Default (light) |
|-------------------|------------------|-----------------|
| `accent`          | `#e94560`        | `#e94560`       |
| `accentSecondary` | `#a855f7`        | `#7c3aed`       |
| `bg`              | `#0f0f1a`        | `#ffffff`       |
| `surface`         | `#1a1a2e`        | `#f8f8fc`       |
| `border`          | `#2a2a4a`        | `#e4e4f0`       |
| `text`            | `#e0e0f0`        | `#1a1a2e`       |
| `radius`          | `16px`           | `16px`          |

Override any token:

```jsx
theme={{
  mode: 'dark',
  tokens: {
    accent:     '#6366f1',
    radius:     '12px',
    fontFamily: "'Inter', sans-serif",
  }
}}
```