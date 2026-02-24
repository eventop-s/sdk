# Smart Navigation — Usage Guide
## @eventop/sdk v1.2.10

---

## What changed

The SDK now navigates users to the correct page automatically when a tour step lives
on a different route. Before the tour starts, the chat panel explains which pages
will be visited. Before each cross-page step, it explains why it's navigating.

No more "the feature doesn't exist on this page" failures.

---

## Setup — two changes required

### 1. Pass `router` to the provider

The SDK needs your framework's navigate function so it can actually change pages.

**React Router v6**
```jsx
// main.jsx or wherever your provider lives
import { useNavigate } from 'react-router-dom';
import { EventopAIProvider } from '@eventop/sdk/react';

function Root() {
  const navigate = useNavigate();   // ← must be inside a Router

  return (
    <EventopAIProvider
      router={navigate}              // ← pass it here
      provider={myServerProvider}
      appName="My App"
    >
      <App />
    </EventopAIProvider>
  );
}
```

**Next.js App Router**
```jsx
// components/EventopProvider.jsx
'use client';
import { useRouter } from 'next/navigation';
import { EventopAIProvider } from '@eventop/sdk/react';

export function EventopProvider({ children }) {
  const router = useRouter();

  return (
    <EventopAIProvider
      router={(path) => router.push(path)}   // ← wrap push() in a plain function
      provider={myServerProvider}
      appName="My App"
    >
      {children}
    </EventopAIProvider>
  );
}
```

**Next.js Pages Router**
```jsx
// components/EventopProvider.jsx
'use client';
import { useRouter } from 'next/router';
import { EventopAIProvider } from '@eventop/sdk/react';

export function EventopProvider({ children }) {
  const router = useRouter();

  return (
    <EventopAIProvider
      router={(path) => router.push(path)}
      provider={myServerProvider}
      appName="My App"
    >
      {children}
    </EventopAIProvider>
  );
}
```

---

### 2. Add `route` to `EventopTarget`

Tell each feature which pathname it lives on.

```jsx
// settings/BillingSection.jsx
import { EventopTarget } from '@eventop/sdk/react';

export function BillingSection() {
  return (
    <EventopTarget
      id="billing"
      name="Billing Settings"
      description="Manage your subscription and payment method"
      route="/settings/billing"      // ← the pathname for this feature
    >
      <div>...</div>
    </EventopTarget>
  );
}
```

```jsx
// canvas/ExportPanel.jsx
export function ExportPanel() {
  return (
    <EventopTarget
      id="export"
      name="Export Design"
      description="Download as PNG, SVG or PDF"
      route="/canvas"               // ← only needed if this is a different page
    >
      <button>Export</button>
    </EventopTarget>
  );
}
```

Features that share the current page don't need `route` — it's only required for
features that live on a different page than where the tour is started from.

---

## What the user sees

**Before the tour starts** (in the chat panel):

> 🗺 This tour will navigate you to the Billing Settings area automatically — no need to go there yourself.

Or for multi-page tours:

> 🗺 This tour visits 3 areas: Export Design, Billing Settings and Team Members. I'll navigate between them automatically.

**When navigating mid-tour** (as a chat message while the tour is active):

> ↗ Taking you to the Billing Settings area…

The tour then waits for the target element to appear in the DOM before showing the
next step tooltip. The user sees the page change happen, then the tooltip appears.

---

## How it works internally

```
User asks → AI returns steps → SDK previews routes needed
                                        ↓
                          Chat: "I'll visit X pages…"
                                        ↓
                            Panel closes, tour starts
                                        ↓
                    For each step in beforeShowPromise:
                      ├── Already on correct route? → continue
                      └── Wrong route?
                            ├── Chat: "Taking you to X…"
                            ├── Call router(route)
                            ├── Wait for URL to change
                            ├── Re-merge step with now-registered feature
                            ├── Update Shepherd's attachTo selector
                            └── Wait for element to appear in DOM
                                        ↓
                              Shepherd shows tooltip ✓
```

The lazy re-merge in `beforeShowPromise` is key: when the tour starts, features on
other pages aren't mounted yet so their selectors aren't known. After navigation,
the new page's `EventopTarget` components mount and register, and the re-merge
picks up the correct selector.

---

## Fallback (no `router` prop)

If you don't pass `router`, the SDK falls back to:

```js
window.history.pushState({}, '', route);
window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
```

This works for SPAs that listen to `popstate` (e.g. vanilla JS apps, some older
setups). It does **not** trigger a React Router or Next.js re-render on its own —
always pass `router` for React/Next.js apps.

---

## Backward compatibility

The existing `screen` / `navigate` API still works. `route` + `router` is the
preferred approach for React/Next.js apps going forward. Both can coexist.

| API            | When to use                                    |
|----------------|------------------------------------------------|
| `route`        | React Router, Next.js — simple pathname-based  |
| `screen`       | Complex check logic, non-URL-based navigation  |
| Both           | Fine — `route` is checked first                |