# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Supporting documents

- spec.yaml: OpenAPI for FEMA requests and responses.
- models_v2.py: Pydantic schema for FEMA requests and responses.
- rules.md: constrains on FEMA related requests and responses.
- src/lib/fmea-rules.ts: existing rules implementation.

## Running the Application

The main application runs on a single development server. For AI-specific features, a second Genkit server is required.

### 1. Run the Next.js Frontend & Standard APIs

In your terminal, run the following command to start the Next.js development server. This includes the main UI and any standard Next.js API Routes.

```bash
npm run dev
```

This will typically start the application on `http://localhost:9002`.

### 2. Run the Genkit AI Backend (for AI features)

If you are working on or using AI-powered features (Genkit flows), you will need to run the Genkit server in a separate terminal:

```bash
npm run genkit:watch
```

This starts the Genkit development UI (usually on `http://localhost:4000`) where you can see and test your flows.

## Available APIs

### FMEA Verification API (Non-AI)

This project includes a standard API endpoint to verify FMEA data against a set of rules.

- **Endpoint**: `POST /api/verify-fmea`
- **Description**: Accepts FMEA data as a JSON string and returns rule verification results.
- **Body**:
  ```json
  {
    "fmeaJson": "<Your FMEA JSON as a string>",
    "fmeaType": "dfmea"
  }
  ```
- **Note**: This is a standard Next.js API route and does **not** require the Genkit server to be running.
