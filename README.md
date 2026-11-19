# Dream Home 3D Planner

A web application for planning house layouts, visualizing designs in 3D, and estimating construction costs. The project includes a React/Vite frontend and an Express API with optional MongoDB persistence.

## Features

- Plot measurement and site planning tools.
- Multi-floor 2D floor plan generation and editing.
- Interactive 3D house visualization with camera, lighting, and design controls.
- Construction cost estimates and PDF export.
- Design gallery and project dashboard.
- User registration and login.

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS, Three.js, React Three Fiber
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose (optional for local development)

## Requirements

- Node.js 18 or later and npm
- MongoDB, if persistent user and design data is needed

## Run locally

Open two terminals from the project root.

### 1. Configure and start the backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` as needed:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/
JWT_SECRET=replace_this_with_a_long_random_secret
```

Start the API:

```powershell
npm start
```

The API runs at `http://localhost:5000`. If MongoDB is unavailable, the server can start in limited in-memory mode; data stored in memory is not persistent.

### 2. Start the frontend

In the second terminal, from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Vite proxies `/api` requests to the backend on port `5000`.

## Useful commands

Run these from their respective directories:

| Directory | Command | Description |
| --- | --- | --- |
| `frontend` | `npm run dev` | Start the Vite development server |
| `frontend` | `npm run build` | Create a production build in `frontend/dist` |
| `frontend` | `npm run preview` | Preview the production build |
| `backend` | `npm start` | Start the API server |
| `backend` | `npm run dev` | Start the API server with nodemon |

## API endpoints

- `GET /api/health` - API health check
- `/api/auth` - Registration, login, and authenticated user endpoints
- `/api/designs` - Authenticated design management endpoints

## Project layout

```text
backend/
  config/       Database configuration
  middleware/   Authentication middleware
  models/       MongoDB models
  routes/       API routes
  server.js     Express entry point
frontend/
  src/
    components/ Reusable UI components
    context/    Application contexts
    pages/      Application pages
    three/      3D visualization
    utils/      Planning and calculation utilities
```

## Disclaimer

Plans, dimensions, and cost estimates are for conceptual planning and visualization only. They are not certified construction documents or structural engineering calculations. Consult qualified architectural and engineering professionals before building.
