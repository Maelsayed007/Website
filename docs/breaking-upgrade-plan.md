# Breaking Dependency Upgrade Plan

## Stage A: Toolchain coherence

1. Lock and verify compatible set:
   - `next`
   - `eslint`
   - `eslint-config-next`
2. Validate workspace consistency:
   - `npm ls next --workspaces`
   - `npm ls eslint eslint-config-next --workspaces`
3. Resolve current `genkit` mismatch before major bumps:
   - `npm ls @genkit-ai/next genkit --workspaces`

## Stage B: jsPDF chain

1. Upgrade `jspdf` and `jspdf-autotable` together.
2. Run PDF smoke checks for:
   - check-in manifest
   - fuel manifest
3. Confirm no `jspdf` imports exist outside PDF modules.

## Stage C: Next.js chain

1. Upgrade `next` in lockstep across workspaces.
2. Re-verify middleware/proxy behavior and route handlers.
3. Run:
   - `npm run typecheck --workspaces --if-present`
   - `npm run lint --workspaces --if-present`
   - workspace builds

## Stage D: Freeze and smoke

1. Pin final versions in lockfile.
2. Execute full green gate:
   - `npm run verify:green`
3. Capture baseline perf:
   - `npm run perf:k6`
   - `npm run perf:lighthouse`
