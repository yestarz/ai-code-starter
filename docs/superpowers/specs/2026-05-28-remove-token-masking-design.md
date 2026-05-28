# Design: Remove Token Masking in Claude Config API

## Problem

The current implementation masks `ANTHROPIC_AUTH_TOKEN` values when returning Claude configuration data through the API. The `maskToken` function displays tokens as `sk****ab`, which causes a critical bug:

When users edit a Claude profile without modifying the masked token field, the masked string (`sk****ab`) gets saved as the actual token value, corrupting the configuration.

## Solution

Remove all token masking logic. The API will return the original plaintext token values. This is acceptable because:

1. This is a local CLI tool running on the user's machine
2. The Web UI is accessed via localhost only
3. Simpler implementation eliminates the masking/demasking complexity

## Changes

### File: `src/ui/routes.ts`

1. **Remove `maskToken` function** (lines 24-34)
   - This function is no longer needed

2. **Simplify `toDisplayClaudeEnv` function** (lines 36-44)
   - Change from:
     ```typescript
     ANTHROPIC_AUTH_TOKEN: maskToken(env?.ANTHROPIC_AUTH_TOKEN),
     ```
   - To:
     ```typescript
     ANTHROPIC_AUTH_TOKEN: env?.ANTHROPIC_AUTH_TOKEN ?? "-",
     ```

## Affected API Endpoints

- `GET /api/config/claude/current` - Returns current Claude profile
- `GET /api/config/claude/list` - Returns all Claude profiles

Both endpoints will now return the actual token value instead of the masked version.

## Testing

1. Start the Web UI: `npm run dev` then `acs ui`
2. Navigate to Claude configuration page
3. Verify token values are displayed in plaintext
4. Edit a profile, change only the model field, save
5. Verify the token value is preserved correctly
