# Frontend

This project was bootstrapped with [Vite](https://vitejs.dev/).
We recommend using Bun as a task runner for Vite projects. Install it from https://bun.sh

The project uses `shadcn/ui` for the UI components. https://ui.shadcn.com/docs/components/

## How to run

```bash
bun i
bun dev
```

### Api Service

Generate the API service with the following command:

```bash
bun run api:generate
```

The generated service will be located in `src/apiService`. You can now use the service to make requests to the backend through the exported api const in `/src/api.ts`.
