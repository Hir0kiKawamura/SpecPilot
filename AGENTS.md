# AGENTS.md

## Project Overview

SpecPilot is a portfolio-oriented AI design support tool.

The goal is to help users create structured software requirements and generate test cases from those requirements using AI.

Current stack:
- Next.js App Router
- TypeScript
- React
- localStorage for current MVP persistence
- Gemini API for AI generation
- CSV export
- Editable test case table

## Main Product Goals

Prioritize:
1. Clear requirement input flow
2. AI-assisted requirement structuring
3. Test case generation from acceptance criteria
4. Editable table UI
5. CSV export
6. Simple, portfolio-quality UX

Do not over-engineer authentication, billing, teams, or enterprise features unless explicitly requested.

## Coding Rules

- Use TypeScript.
- Avoid `any`.
- Prefer explicit types.
- Keep components small and readable.
- Prefer Server Components by default.
- Use Client Components only when state, events, or browser APIs are required.
- Do not introduce unnecessary global state.
- Do not add heavy dependencies without explaining why.
- Keep implementation simple enough for an MVP.

## UI Rules

- shadcn/ui may be used.
- Tailwind CSS may be used.
- UI should look like a clean SaaS dashboard.
- Prioritize readability over flashy animation.
- Use accessible labels for forms and buttons.
- Tables should remain editable and easy to scan.

## AI/API Rules

- Use Gemini API for AI generation.
- Do not switch to OpenAI API unless explicitly requested.
- Validate AI responses before using them.
- Prefer structured JSON outputs.
- Handle invalid or malformed AI responses gracefully.
- Never expose API keys to the client.

## Data Rules

- Current MVP uses localStorage.
- Do not migrate to IndexedDB, Supabase, PostgreSQL, or Prisma unless explicitly requested.
- Keep stored data versionable if possible.
- Avoid destructive data changes.

## File/Folder Guidelines

- Keep reusable UI components under `components/`.
- Keep app routes under `app/`.
- Keep shared types under `types/` or near the feature if small.
- Keep AI-related logic separated from UI components.
- Avoid mixing API calls directly into presentation components.

## Testing / Quality

Before finishing a task, check:
- TypeScript errors
- ESLint errors
- Broken imports
- Runtime errors in obvious flows
- Whether existing features still work

If tests are not available, explain what was manually checked.

## Git / Change Style

- Prefer small, focused changes.
- Explain the changed files briefly.
- Do not rewrite unrelated files.
- Do not reformat the whole project unless asked.
- When proposing changes, show diffs or file-level summaries.

## Communication Style

When responding:
- Explain what changed.
- Mention any assumptions.
- Mention any remaining risks.
- Suggest the next practical step.
- Keep explanations concise and implementation-focused.

## Important Constraints

This project is intended to be shown as a portfolio.

Therefore:
- Avoid fake enterprise complexity.
- Avoid unfinished-looking placeholder features.
- Prefer polished MVP features over broad but shallow features.
- Make the README and UI understandable to recruiters and engineers.