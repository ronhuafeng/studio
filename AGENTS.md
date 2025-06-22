# Repository Guidelines

This project is a Next.js + Genkit application for FMEA visualization and validation.

## Development
- Use TypeScript for all source code.
- Run `npm run dev` to start the frontend on port 9002. AI flows require a separate terminal with `npm run genkit:watch`.
- Before committing, run `npm run lint` and `npm run typecheck`.

## Style
- Follow the style guidance in `docs/blueprint.md`:
  - Primary color: `#94D0CC`
  - Background color: `#E9E9E9`
  - Accent color: `#64B2CD`
  - Fonts: use `Inter` for body and headlines.
- Graph layouts should remain hierarchical (use Dagre or similar).

## Code Organization
- FMEA rules reside in `src/lib/fmea-rules.ts`.
- The OpenAPI specification lives in `spec.yaml` and the Pydantic models are in `models_v2.py`.
- Keep components under `src/components` and hooks under `src/hooks`.
- Commit messages should be written in English.
