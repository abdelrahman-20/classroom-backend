# Classroom

A full-stack classroom management application for organizing departments, subjects, and classes. The project is split into a **React admin dashboard** (frontend) and an **Express REST API** (backend), connected through a typed data layer.

## Features

- **Dashboard** — landing page with quick access to management tools
- **Subjects** — browse, search, and filter subjects by department (paginated API)
- **Classes** — classroom listing and creation UI (in progress)
- **Authentication** — Better Auth configured with role-based users (`student`, `teacher`, `admin`)
- **API documentation** — interactive Swagger UI at `/api-docs`
- **Image uploads** — Cloudinary integration on the frontend

## Tech Stack

| Layer    | Technologies |
| -------- | ------------ |
| Frontend | React 19, Refine, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend  | Express 5, TypeScript, Drizzle ORM, Better Auth |
| Database | PostgreSQL (Neon serverless) |
| Tooling  | Drizzle Kit, Swagger, Cloudinary |

## Project Structure

```
classroom/
├── classroom-backend/     # Express API server
│   ├── src/
│   │   ├── server.ts          # App entry point
│   │   ├── routes/            # API route definitions
│   │   ├── controllers/       # Request handlers
│   │   ├── database/          # Drizzle schema & connection
│   │   ├── lib/               # Auth configuration
│   │   └── config/            # Swagger setup
│   └── drizzle/               # Database migrations
│
└── classroom-frontend/    # Refine admin dashboard
    └── src/
        ├── pages/             # Dashboard, Subjects, Classes
        ├── providers/         # Refine data provider
        ├── components/        # UI & layout components
        └── constants/         # Environment helpers
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A [Neon](https://neon.tech/) PostgreSQL database (or any PostgreSQL instance)
- A [Cloudinary](https://cloudinary.com/) account (optional, for image uploads)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/abdelrahman-20/classroom-backend.git
cd classroom
```

> The backend and frontend may live in separate repositories. Clone or copy both folders into the same parent directory if needed.

### 2. Set up the backend

```bash
cd classroom-backend
npm install
```

Create a `.env` file in `classroom-backend/`:

```env
PORT=8000

# PostgreSQL connection string (Neon or local)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Allowed frontend origin for CORS
FRONTEND_URL="http://localhost:5173"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:8000"

# Optional social login providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

Run database migrations:

```bash
npm run db:migrate
```

Start the development server:

```bash
npm run dev
```

The API will be available at **http://localhost:8000**.

### 3. Set up the frontend

Open a new terminal:

```bash
cd classroom-frontend
npm install
```

Create a `.env` file in `classroom-frontend/`:

```env
VITE_BACKEND_URL="http://localhost:8000/api/"

# Cloudinary (optional — required for image uploads)
VITE_CLOUDINARY_CLOUD_NAME="your-cloud-name"
VITE_CLOUDINARY_UPLOAD_PRESET="your-upload-preset"
VITE_CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
```

Start the development server:

```bash
npm run dev
```

The dashboard will be available at **http://localhost:5173**.

## Available Scripts

### Backend (`classroom-backend`)

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start dev server with hot reload     |
| `npm run build`    | Compile TypeScript to `dist/`        |
| `npm start`        | Run the compiled production server   |
| `npm run db:generate` | Generate a new Drizzle migration  |
| `npm run db:migrate`  | Apply pending migrations          |

### Frontend (`classroom-frontend`)

| Command         | Description                        |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start Vite dev server              |
| `npm run build` | Type-check and build for production |
| `npm start`     | Serve the production build         |

## API Endpoints

| Method | Endpoint         | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| GET    | `/`              | Health check                             |
| GET    | `/api/subjects`  | List subjects (search, filter, paginate) |
| GET    | `/api-docs`      | Swagger API documentation                |

### Subjects query parameters

| Parameter    | Type    | Description                              |
| ------------ | ------- | ---------------------------------------- |
| `search`     | string  | Filter by subject name or code           |
| `department` | string  | Filter by department name or ID          |
| `page`       | integer | Page number (default: `1`)               |
| `limit`      | integer | Items per page, max 100 (default: `10`)  |

## Database Schema

The backend uses Drizzle ORM with PostgreSQL. Main tables:

- **departments** — academic departments (`name`, `code`, `description`)
- **subjects** — courses linked to a department
- **user**, **session**, **account** — Better Auth tables with user roles

To regenerate the schema after changes:

```bash
cd classroom-backend
npm run db:generate
npm run db:migrate
```

## Production Build

**Backend:**

```bash
cd classroom-backend
npm run build
npm start
```

**Frontend:**

```bash
cd classroom-frontend
npm run build
npm start
```

Make sure production environment variables point to your deployed backend URL and database.

## License

ISC
