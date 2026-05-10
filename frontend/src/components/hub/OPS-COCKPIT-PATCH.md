# OpsCockpit — App.jsx route patch

The `OpsCockpit.jsx` component is in place. It needs ONE small edit to
`frontend/src/App.jsx` to be reachable at `/dashboard/ops`.

## Step 1 — Add the lazy import

Open `frontend/src/App.jsx` and find this line (around line 127):

```js
const ClientDashboard = React.lazy(() => import("./components/hub/ClientDashboard.jsx"));
```

Just **AFTER** that line, add:

```js
const OpsCockpit = React.lazy(() => import("./components/hub/OpsCockpit.jsx"));
```

## Step 2 — Add the route inside `/dashboard`

Find this block (around line 638):

```jsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute roles={TEAM_ROLES}>
      <ManagementHub />
    </ProtectedRoute>
  }
>
  <Route index element={<AdminStats />} />
  <Route path="overview" element={<ClientDashboard />} />
  ...
```

Inside that `<Route path="/dashboard">` block (anywhere among its children
— logical place is right after `path="overview"`), add:

```jsx
          <Route path="ops" element={<OpsCockpit />} />
```

(Match the existing 10-space indentation of sibling sub-routes.)

## Step 3 — Optional: add to nav

If you want a sidebar/topnav link for it, find `ManagementHub.jsx` (the
parent component) and add a "Ops Cockpit" link pointing to `/dashboard/ops`.
Skip if you'll just bookmark the URL for now.

## Step 4 — Test

```powershell
cd "C:\Users\ragha\Desktop\Claude Cowork\Shinel Studios\agency-platform\frontend"
npm install   # first time only
npm run dev
```

Should start on `http://localhost:5173`.

In another terminal, also run wrangler dev for the worker:

```powershell
cd "C:\Users\ragha\Desktop\Claude Cowork\Shinel Studios\agency-platform\worker"
npx wrangler dev --local
```

Then in your browser:

1. Go to `http://localhost:5173/login` and log in as admin
2. Navigate to `http://localhost:5173/dashboard/ops`
3. You should see the cockpit with:
   - 5 clients
   - 0 pending SEO (none queued; all 4 entries we have are batch-applied)
   - 0 active spikes (we haven't migrated spike data yet — that's optional)
   - 0 overperformers (need 1 day of data first)
   - 5/5 today's research (depends on whether today's date matches; may show 0/5)

If the cockpit shows "Couldn't load snapshot" with 401, you're not logged
in as a team-role user. Log in first.

If it shows "Couldn't load snapshot" with 404, the worker patch (in
`AGENCY-PATCH.md`) wasn't applied yet. Apply that first.

## Rollback

```powershell
git checkout frontend/src/App.jsx
```

OpsCockpit.jsx stays — it's just an unreferenced component until App.jsx
imports + routes to it. Production stays safe.
