# RLS Verification Checklist

> Run these checks after applying `20260217015800_rls_policies.sql` to confirm Row-Level Security is working correctly.

---

## 1. Confirm RLS is Enabled on All Tables

Run in **Supabase SQL Editor** (or psql):

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected**: All 26 rows show `rowsecurity = true`. If any show `false`, the migration failed partially.

---

## 2. Confirm Client Cannot Read Other Users' Data

### Setup
1. Register **User A** via the app (note the UUID from Supabase Auth dashboard)
2. Register **User B** via the app (note the UUID)
3. Using the **service role client** (or SQL Editor), insert a test row for User A:

```sql
INSERT INTO accounts (user_id, name, broker)
VALUES ('<user_a_uuid>', 'Test Account A', 'Tradeovate');
```

### Test as User B
4. In the browser, log in as **User B**
5. Open browser DevTools → Console, run:

```javascript
const { data, error } = await supabase.from('accounts').select('*');
console.log(data);     // Should be [] (empty array)
console.log(error);    // Should be null
```

**Expected**: User B sees **zero rows** — not an error, just empty results.

### Test as User A
6. Log in as **User A**, repeat the query:

```javascript
const { data } = await supabase.from('accounts').select('*');
console.log(data);     // Should show 1 row: "Test Account A"
```

**Expected**: User A sees exactly their own row.

---

## 3. Confirm Client Cannot Forge user_id

### Test: INSERT with wrong user_id
Logged in as **User B**, try inserting a row with User A's ID:

```javascript
const { data, error } = await supabase.from('accounts').insert({
  user_id: '<user_a_uuid>',     // Not User B's ID!
  name: 'Forged Account',
  broker: 'Tradeovate',
});
console.log(error);    // Should be a policy violation error
```

**Expected**: Insert fails with `"new row violates row-level security policy"`.

> **Note**: Even if the client sends a `user_id`, the `auto_set_user_id()` trigger overwrites it with `auth.uid()`. But the RLS `WITH CHECK` will reject the row if the trigger didn't fire (edge case).

---

## 4. Confirm Service Role Bypasses RLS

This is critical for Inngest background functions (imports, recalculations).

### Test in Node.js or SQL Editor
Use the **service role key** (not the anon key):

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

const admin = createAdminClient();
const { data, error } = await admin.from('accounts').select('*');
// Should return ALL rows across ALL users
```

**Expected**: Service role sees all rows, regardless of user_id.

---

## 5. Confirm Child Table Policies Work

### Test: trade_tags (no user_id column)
1. As User A, create a trade and a tag (via the app or service role)
2. Create a trade_tag linking them
3. As User B, query trade_tags:

```javascript
const { data } = await supabase.from('trade_tags').select('*');
console.log(data);     // Should be [] — User B owns no trades
```

**Expected**: User B sees zero trade_tags because the EXISTS subquery against `trades` fails.

---

## 6. Confirm event_log is Append-Only

```javascript
// As any authenticated user:
const { error: updateErr } = await supabase
  .from('event_log')
  .update({ event_type: 'hacked' })
  .eq('id', 1);
console.log(updateErr);   // Should fail — no UPDATE policy exists

const { error: deleteErr } = await supabase
  .from('event_log')
  .delete()
  .eq('id', 1);
console.log(deleteErr);   // Should fail — no DELETE policy exists
```

**Expected**: Both operations fail. Event log is immutable from the client.

---

## Quick Summary Table

| Check | Expected Result |
|-------|----------------|
| `pg_tables` → `rowsecurity` | All 26 = `true` |
| User B reads User A's accounts | `[]` (empty) |
| User B inserts with User A's ID | Policy violation error |
| Service role reads all accounts | All rows returned |
| User B reads User A's trade_tags | `[]` (empty) |
| User updates event_log | Fails (no policy) |
| User deletes event_log | Fails (no policy) |
