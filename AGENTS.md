# Repository Guidelines

This project is a Next.js + Genkit application for FMEA visualization and validation.

## Development
- Use TypeScript for all source code.
- Run `npm run dev` to start the frontend on port 9002. AI flows require a separate terminal with `npm run genkit:watch`.
- Before committing, run `npm run lint` and `npm run typecheck`.

## Code Organization
- FMEA rules reside in `src/lib/fmea-rules.ts`.
- The OpenAPI specification lives in `spec.yaml` and the Pydantic models are in `models_v2.py`.
- Keep components under `src/components` and hooks under `src/hooks`.
- Commit messages should be written in English.
