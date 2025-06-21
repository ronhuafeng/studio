# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Running the Application

This project requires two separate development servers running concurrently: one for the Next.js frontend and one for the Genkit AI backend.

### 1. Run the Next.js Frontend

In your terminal, run the following command to start the Next.js development server:

```bash
npm run dev
```

This will typically start the application on `http://localhost:9002`.

### 2. Run the Genkit AI Backend

In a second, separate terminal window, run the following command to start the Genkit development server, which provides the AI-powered API endpoints:

```bash
npm run genkit:watch
```

This will start the Genkit development UI (usually on `http://localhost:4000`) where you can see your flows and make test calls. The API endpoints themselves will be available under `/api/flows/*` on your Next.js server (e.g., `http://localhost:9002/api/flows/verifyFmeaFlow`).
