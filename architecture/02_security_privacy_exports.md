# Security, Privacy & Exports

## 1. Authentication & Authorization

### Auth Flow (Supabase Auth)
- **Supabase Auth** manages all authentication — no custom JWT logic
- Email + password signup/login (expandable to OAuth later)
- Session managed via Supabase SSR cookies (`@supabase/ssr`)
- Next.js middleware refreshes session on every request
- All API routes and Server Actions use `createServerClient()` → auto-injected user

### Password Security
- Supabase Auth default: bcrypt hashing
- Minimum 6 characters (Supabase default — configurable in dashboard)
- Rate limiting handled by Supabase (built-in brute-force protection)

### Session Management
- Sessions stored server-side by Supabase
- "Sign out everywhere" via `supabase.auth.admin.signOut(userId, 'global')`
- Refresh tokens auto-rotated by Supabase

### Authorization Model
- **Single-tenant**: each user sees only their own data
- **Row-Level Security (RLS)** on every table:
  ```sql
  CREATE POLICY "Users own their data"
  ON [table_name] FOR ALL
  USING (user_id = auth.uid());
  ```
- Defense-in-depth: even if app code has a bug, Postgres blocks cross-user reads

---

## 2. Data Privacy

### PII Inventory
| Data | Sensitivity | Storage |
|------|-------------|---------|
| Email | Medium | Supabase `auth.users` (encrypted at rest) |
| Password | High | Supabase-managed bcrypt hash |
| Trade data | Low (financial) | Supabase PostgreSQL |
| Screenshots | Low | Supabase Storage (private bucket) |
| Account IDs | Low | `accounts` table |

### Data Isolation
- All queries scoped by `auth.uid()` via RLS policies
- No cross-user data access possible at the database level
- Supabase Storage: private bucket with RLS policies per user

### Data Retention
- User can delete all data ("danger zone" in settings)
- Import batches can be individually rolled back
- Soft-delete for accounts (is_archived); hard-delete available
- **All destructive operations require explicit confirmation dialog**

---

## 3. API Security

### Transport
- HTTPS only (Vercel enforces by default)
- HSTS header auto-configured

### Input Validation
- Zod schemas for all request bodies and Server Action inputs
- Parameterized queries via Drizzle ORM (SQL injection prevention)
- File upload: CSV only, max 50 MB, content-type validation via Supabase Storage policies

### Rate Limiting
- Supabase built-in rate limiting for auth endpoints
- Vercel Edge Middleware: 100 requests/minute per user (custom)
- Import: 10 uploads/hour per user (enforced in API route)
- AI Coach: 20 requests/hour per user (enforced in API route)

### CORS
- Vercel handles CORS automatically for same-origin
- API routes inherit Next.js CORS config

### Security Headers (via `next.config.ts`)
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 4. Destructive Operation Policy

> [!CAUTION]
> All destructive database operations require explicit user confirmation before execution.

| Operation | Confirmation UX |
|-----------|----------------|
| Import batch rollback | "This will delete N fills and M trades. Are you sure?" + confirm button |
| Account deletion | "Type the account name to confirm permanent deletion" |
| Trade split | Preview of resulting 2 trades shown before confirm |
| Trade merge | Preview of merged trade shown before confirm |
| Rollover time change | "This will reassign trading days for ALL trades. Confirm?" |
| Full data wipe | "Type DELETE to confirm permanent removal of all data" |
| Supabase migration (destructive) | CLI prompt — developer must approve |

---

## 5. Export Capabilities

### Data Export Formats

| Export | Format | Scope | Method |
|--------|--------|-------|--------|
| Full backup | JSON | All user data | `GET /api/export/full` |
| Trades | CSV | Filtered by GlobalContext | `GET /api/export/trades` |
| Daily summaries | CSV | Filtered | `GET /api/export/summaries` |
| Business ledger | CSV | Filtered | `GET /api/export/ledger` |
| Analytics snapshot | PNG/PDF | Current view | Client-side (html2canvas) |
| Charts | PNG | Individual chart | Client-side |

### Full Backup Schema
```json
{
  "version": "1.0",
  "exported_at": "ISO-8601",
  "user": { "...": "..." },
  "accounts": [],
  "instruments": [],
  "strategies": [],
  "tags": [],
  "fills": [],
  "trades": [],
  "grades": [],
  "goals": [],
  "routines": [],
  "business_entries": [],
  "prop_evaluations": [],
  "dashboard_layouts": [],
  "settings": {}
}
```

### Import from Backup
- Upload JSON backup → validate schema → restore all entities
- Conflict resolution: skip duplicates by hash/ID
- **Requires confirmation**: "This will restore N entities. Existing data will not be overwritten."

---

## 6. Encryption

### At Rest
- Supabase PostgreSQL: encrypted at rest (AES-256, managed by Supabase)
- Supabase Storage: encrypted at rest
- Backups: encrypted by Supabase

### In Transit
- All traffic over HTTPS (Vercel + Supabase enforce TLS 1.2+)
- Supabase connections use SSL by default

---

## 7. Audit Trail
- `event_log` table captures all mutations with user_id, entity, action, and payload delta
- Retained for 90 days (configurable via cron cleanup Inngest function)
- Not exposed via API (debug/admin only)
