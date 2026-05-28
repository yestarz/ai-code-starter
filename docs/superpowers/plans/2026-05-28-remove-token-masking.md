# Remove Token Masking in Claude Config API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove token masking logic from Claude config API to prevent token corruption when editing profiles

**Architecture:** Remove `maskToken` function and simplify `toDisplayClaudeEnv` to return raw token values. This eliminates the bug where masked values get saved as actual tokens.

**Tech Stack:** TypeScript, Node.js, Vitest

---

## File Structure

- **Modify:** `src/ui/routes.ts` - Remove masking functions, simplify env display
- **Test:** `test/routes.test.ts` - Add tests for Claude config API responses (if doesn't exist, create)

---

### Task 1: Remove maskToken Function

**Files:**
- Modify: `src/ui/routes.ts:24-34`

- [ ] **Step 1: Read current implementation**

Read `src/ui/routes.ts` lines 24-34 to see the `maskToken` function:
```typescript
function maskToken(value?: string): string {
  if (!value || value === "-") {
    return "-";
  }
  if (value.length <= 4) {
    return "*".repeat(value.length);
  }
  const head = value.slice(0, 2);
  const tail = value.slice(-2);
  return `${head}****${tail}`;
}
```

- [ ] **Step 2: Delete the maskToken function**

Remove lines 24-34 entirely (the `maskToken` function).

- [ ] **Step 3: Commit**

```bash
git add src/ui/routes.ts
git commit -m "refactor: remove maskToken function from routes"
```

---

### Task 2: Simplify toDisplayClaudeEnv Function

**Files:**
- Modify: `src/ui/routes.ts:36-44`

- [ ] **Step 1: Read current implementation**

Read `src/ui/routes.ts` lines 36-44 to see the `toDisplayClaudeEnv` function:
```typescript
function toDisplayClaudeEnv(
  env: Record<string, string> | undefined
): Record<string, string> {
  return {
    ...(env ?? {}),
    ANTHROPIC_BASE_URL: env?.ANTHROPIC_BASE_URL ?? "-",
    ANTHROPIC_AUTH_TOKEN: maskToken(env?.ANTHROPIC_AUTH_TOKEN),
  };
}
```

- [ ] **Step 2: Update toDisplayClaudeEnv to return raw values**

Change the function to return the actual token value:
```typescript
function toDisplayClaudeEnv(
  env: Record<string, string> | undefined
): Record<string, string> {
  return {
    ...(env ?? {}),
    ANTHROPIC_BASE_URL: env?.ANTHROPIC_BASE_URL ?? "-",
    ANTHROPIC_AUTH_TOKEN: env?.ANTHROPIC_AUTH_TOKEN ?? "-",
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/routes.ts
git commit -m "fix: return raw token values in Claude config API"
```

---

### Task 3: Verify Changes Work

**Files:**
- Test: Manual verification

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: Build succeeds without errors

- [ ] **Step 2: Start the Web UI**

Run: `npm run dev` (in one terminal)
Then: `acs ui` (in another terminal)
Expected: Web UI starts on http://127.0.0.1:8888

- [ ] **Step 3: Test Claude config API**

Run: `curl http://127.0.0.1:8888/api/config/claude/list`
Expected: Response contains actual token values (not masked with `****`)

- [ ] **Step 4: Test editing preserves token**

1. Open Web UI in browser
2. Go to Claude configuration
3. Edit a profile, change only the model field
4. Save the profile
5. Verify the token value is still correct (not corrupted)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: remove token masking to prevent config corruption"
```

---

## Summary

This plan removes the token masking logic that was causing a bug where masked values (`sk****ab`) would get saved as the actual token when users edited Claude profiles without modifying the token field. The fix is simple: remove the `maskToken` function and have the API return the raw token values directly.
