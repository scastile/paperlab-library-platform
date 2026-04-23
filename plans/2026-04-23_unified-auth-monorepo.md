# Unified Auth + Monorepo Consolidation Plan

## Problem
- Event Flyer Studio lives outside the monorepo
- Users who log in at `lib.paperlab.xyz` must re-login at each product (Escape Room, Flyer Studio, Launchpad)
- Direct URLs (`escape.paperlab.xyz`) should still function but ideally share auth state

## Constraints
- All apps use the same Supabase project (`10.0.0.179:8001`)
- All apps are on subdomains of `paperlab.xyz`
- localStorage is origin-scoped (won't share across subdomains)
- Supabase JWT secret is shared, so tokens are valid everywhere

---

## Solution: Auth Bridge Redirect Flow

### How It Works

1. **lib.paperlab.xyz is the auth gateway**
   - User signs in once here
   - Session stored in localStorage (standard Supabase)

2. **Clicking a product card passes the session**
   - Instead of a plain `<a href="https://escape.paperlab.xyz">`, we construct:
     ```
     https://escape.paperlab.xyz/#access_token=<jwt>&refresh_token=<rt>&expires_at=<ts>
     ```
   - This uses Supabase's standard implicit grant hash format
   - Each product's `AuthContext` on mount checks for hash params, hydrates the session, then strips the hash

3. **Direct URL access still works**
   - User goes to `escape.paperlab.xyz` directly
   - No session in localStorage → redirect to:
     ```
     https://lib.paperlab.xyz/login?redirect=https://escape.paperlab.xyz
     ```
   - After login, lib.paperlab.xyz redirects back with the token in the hash
   - Result: seamless single sign-on whether coming from the dashboard or a bookmark

4. **Security**
   - Token is in URL fragment (`#`), never sent to server
   - Fragment is stripped immediately after hydration
   - All apps validate the JWT independently (same `SUPABASE_JWT_SECRET`)

---

## Implementation Tasks

### Task 1: Move Flyer Studio into Monorepo

**Files to relocate:**
```
/opt/projects/event-flyer-studio/  →  /opt/projects/paperlab-library-platform/apps/event-flyer-studio/
```

**Update root docker-compose.yml:**
- Add `event-flyer-studio-backend` and `event-flyer-studio-frontend` services
- Use `papercore` network (shared with Launchpad)
- Port mapping: `8204:80` (unchanged)

**Cleanup:**
- Stop old standalone containers
- Remove old `docker-compose.yml` or archive it

### Task 2: Build `auth-bridge.js` — Shared Session Pass-Through

**Location:** `apps/libpaper-landing/src/lib/auth-bridge.js`

**Functions:**
- `buildProductUrl(baseUrl, session)` → returns URL with session in hash
- Example output: `https://escape.paperlab.xyz/#access_token=eyJ...&refresh_token=...&expires_at=...`

**Location:** Each product's `AuthContext.jsx` (shared pattern)

**On mount:**
1. Check localStorage for existing session
2. If none, check `window.location.hash` for `access_token`
3. If found, call `supabase.auth.setSession({ access_token, refresh_token })` → stores in localStorage
4. Strip hash from URL with `history.replaceState`
5. If still no session, redirect to `https://lib.paperlab.xyz/login?redirect=<currentUrl>`

### Task 3: Update Dashboard Product Cards

In `Dashboard.jsx`, change plain `<a>` tags to use the auth bridge:

```jsx
import { buildProductUrl } from '../lib/auth-bridge'

// In card click handler:
const goToProduct = (url) => {
  const session = await supabase.auth.getSession()
  if (session?.data?.session) {
    window.location.href = buildProductUrl(url, session.data.session)
  } else {
    window.location.href = `https://lib.paperlab.xyz/login?redirect=${encodeURIComponent(url)}`
  }
}
```

**Products:**
- Launchpad: `https://launchpad.paperlab.xyz` (new subdomain, currently `lib.paperlab.xyz` or `launchpad.paperlab.xyz`?)
- Escape Room: `https://escape.paperlab.xyz`
- Flyer Studio: `https://flyer.paperlab.xyz`
- LibPDF: stays as `#` (coming soon)

### Task 4: Update Each Product's AuthContext

**Apps affected:**
- `apps/escape-room-designer/frontend/src/context/AuthContext.jsx`
- `apps/event-flyer-studio/frontend/src/context/AuthContext.jsx`
- `apps/library-launchpad/frontend/src/context/AuthContext.jsx` (if it has its own)

**Pattern to add (on init):**
```jsx
useEffect(() => {
  // Try to hydrate session from URL hash (from auth bridge)
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  
  if (accessToken && refreshToken) {
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    }).then(() => {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    })
    return
  }
  
  // Otherwise check existing session
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) {
      // No session — redirect to gateway login
      const current = encodeURIComponent(window.location.href)
      window.location.href = `https://lib.paperlab.xyz/login?redirect=${current}`
    }
  })
}, [])
```

### Task 5: Update lib.paperlab.xyz Login Page to Handle Redirects

In `apps/libpaper-landing/src/pages/Login.jsx` (or wherever login UI is):

```jsx
const [searchParams] = useSearchParams()
const redirectUrl = searchParams.get('redirect')

// After successful signIn:
if (redirectUrl && redirectUrl.includes('paperlab.xyz')) {
  const session = await supabase.auth.getSession()
  window.location.href = buildProductUrl(redirectUrl, session.data.session)
} else {
  navigate('/dashboard')
}
```

### Task 6: Add `launchpad.paperlab.xyz` Tunnel

**Current state:** Launchpad frontend is at `lib.paperlab.xyz` or directly at `:8200`?

**Plan:**
- `launchpad.paperlab.xyz` → `localhost:8200` (Cloudflare tunnel)
- Update Dashboard card href from `https://launchpad.paperlab.xyz` to the actual working URL
- Verify Launchpad backend stays on `:8000` internally, frontend on `:8200`

### Task 7: UI Polish — Unified Header & Design

**For each product (Escape Room, Flyer Studio, Launchpad):**

1. **Header component** matching Escape Room style:
   - PaperLab logo + product name
   - Credit badge (fetches `/api/credits/balance`)
   - "Back to Dashboard" link (goes to `lib.paperlab.xyz`)
   - Sign out
   - No email display in header (per user preference)

2. **Design tokens** from landing page:
   - Page bg: `#f5f5f7` (light) / `#000000` (dark)
   - Cards: white / `#1c1c1e`
   - Accent: `#6366f1`
   - Font: Inter
   - Radius: 12px
   - Shadows: `0 4px 24px rgba(0,0,0,0.08)`

3. **Footer** matching landing page:
   - `border-t`
   - Paperclip SVG (lucide 16px)
   - Centered "Powered by PaperLab"

**Priority order:**
1. Flyer Studio (needs most work — currently has basic styling)
2. Escape Room (has good header, just needs credit badge polish)
3. Launchpad (if time)

### Task 8: Update Root docker-compose.yml

Add Flyer Studio services:
```yaml
  event-flyer-studio-backend:
    build: ./apps/event-flyer-studio/backend
    env_file: ./apps/event-flyer-studio/backend/.env
    volumes:
      - ./apps/event-flyer-studio/data:/app/data
    networks:
      - papercore
    restart: unless-stopped

  event-flyer-studio-frontend:
    build: ./apps/event-flyer-studio/frontend
    networks:
      - papercore
    restart: unless-stopped
    ports:
      - "127.0.0.1:8204:80"
```

**Port mapping note:** Keep `127.0.0.1:8204:80` so Cloudflare tunnel can proxy it. Nginx inside container serves on 80.

---

## Cloudflare Tunnel Config

Current ingress (assumed):
```yaml
- hostname: lib.paperlab.xyz
  service: http://localhost:8202
- hostname: escape.paperlab.xyz
  service: http://localhost:8203
- hostname: flyer.paperlab.xyz
  service: http://localhost:8204
```

**Add:**
```yaml
- hostname: launchpad.paperlab.xyz
  service: http://localhost:8200
```

---

## Testing Checklist

1. [ ] Flyer Studio builds and runs from monorepo `docker compose up`
2. [ ] Log in at `lib.paperlab.xyz` → click Escape Room → lands on Escape Room, already logged in
3. [ ] Log in at `lib.paperlab.xyz` → click Flyer Studio → lands on Flyer Studio, already logged in
4. [ ] Direct visit to `escape.paperlab.xyz` (incognito) → redirects to `lib.paperlab.xyz/login?redirect=...` → after login → back to Escape Room, logged in
5. [ ] Credit balance shows correctly in each product header
6. [ ] "Back to Dashboard" link works from all products
7. [ ] Sign out from any product clears session and redirects to `lib.paperlab.xyz`

---

## Risks

| Risk | Mitigation |
|------|------------|
| Token in URL hash briefly visible | Fragment is never sent to server; stripped immediately |
| Redirect loops if product + landing both redirect | Check `redirect` param domain whitelist (`*.paperlab.xyz`) |
| Old standalone Flyer Studio conflicts | Stop and remove old containers before monorepo deploy |
| localStorage still separate per subdomain | By design — we bridge via URL hash on navigation |

---

## Open Questions

1. Should Launchpad frontend also live at `launchpad.paperlab.xyz` (new) or does it stay at the old URL?
2. Should we add a "sign out everywhere" button that hits all products? (Overkill for now)
3. Do we want the auth bridge to open products in new tabs or same tab? (Same tab is cleaner for token passing)

---

## Next Action

Implement Tasks 1–2 first (monorepo move + auth bridge). Once that's solid, Tasks 3–4 (product integration). UI polish last.
