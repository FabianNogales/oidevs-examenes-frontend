# OiDevs Examenes Frontend

Frontend web application for the OiDevs massive exam entry control system.

## Frontend Stack

- React
- TypeScript
- Vite
- React Router
- Axios
- ESLint
- Prettier

## Frontend Architecture

- `src/app`: application-level configuration, routing, and providers.
- `src/features`: domain features. Code that belongs to only one feature should stay inside that feature.
- `src/layouts`: layout folders by user type.
- `src/shared`: reusable API clients, components, hooks, types, constants, and utilities shared across features.

The frontend calls the Laravel REST API through a centralized Axios client. The backend API base path is versioned under `/api/v1`.

## Environment

Create a local environment file from the example:

```bash
copy .env.example .env
```

`VITE_BACKEND_URL` must point to the Laravel backend root URL. Fortify and
Sanctum use root routes such as `/login`, `/logout`, and
`/sanctum/csrf-cookie`.

`VITE_API_URL` must point to the Laravel API base URL, including the API version:

```bash
VITE_BACKEND_URL=http://127.0.0.1:8000
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

Application code should read environment values from `src/app/config/env.ts` instead of accessing `import.meta.env` directly across the project.

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the application:

```bash
npm run build
```

Run ESLint:

```bash
npm run lint
```

Check formatting:

```bash
npm run format:check
```
