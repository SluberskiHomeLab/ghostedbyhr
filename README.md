# Ghosted By HR

A React-based social media web application similar to LinkedIn, dedicated to company exposés. Share your experiences, connect with others, and hold companies accountable.

## Architecture

The application consists of four services running in Docker:

| Service | Description | Port |
|---------|-------------|------|
| **Database** | PostgreSQL 16 | 5432 |
| **Backend** | Node.js/Express REST API | 5000 |
| **App Frontend** | React social media application | 3000 |
| **Web Frontend** | React marketing/landing page | 8080 |

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Running the Application

1. Copy the example environment file and set your secrets:

```bash
cp .env.example .env
# Edit .env and set POSTGRES_PASSWORD and JWT_SECRET
```

2. Start all services:

```bash
docker compose up --build
```

Once all services are running, visit:

- **Landing Page**: http://localhost:8080
- **Application**: http://localhost:3000
- **API Health Check**: http://localhost:5000/api/health

### Stopping the Application

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

## Features

- **User Authentication** – Register, login, and JWT-based session management
- **Posts & Feed** – Create posts, view a chronological feed
- **Likes & Comments** – Interact with posts
- **User Profiles** – View and edit profile information
- **Connections** – Send, accept, and manage connection requests
- **Landing Page** – Marketing website with information about the platform

## Project Structure

```
ghostedbyhr/
├── docker-compose.yml          # Orchestrates all services
├── database/
│   └── init.sql                # PostgreSQL schema initialization
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── index.js            # Express server entry point
│       ├── config/database.js  # PostgreSQL connection pool
│       ├── middleware/auth.js   # JWT authentication middleware
│       └── routes/             # API route handlers
├── app-frontend/               # React social media application
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── context/            # Auth context provider
│       ├── components/         # Reusable UI components
│       ├── pages/              # Page components
│       └── services/           # API service layer
└── web-frontend/               # React marketing website
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── components/         # Navbar, Footer
        └── pages/              # Home, About, Features
```

## API Endpoints

### Authentication
- `POST /api/auth/register` – Create a new account
- `POST /api/auth/login` – Login and receive JWT token
- `GET /api/auth/me` – Get current user (protected)

### Posts
- `GET /api/posts` – Get all posts
- `POST /api/posts` – Create a post (protected)
- `GET /api/posts/:id` – Get a single post
- `DELETE /api/posts/:id` – Delete own post (protected)
- `POST /api/posts/:id/like` – Toggle like (protected)
- `GET /api/posts/:id/comments` – Get post comments
- `POST /api/posts/:id/comments` – Add a comment (protected)

### Users
- `GET /api/users/:id` – Get user profile
- `PUT /api/users/:id` – Update own profile (protected)

### Connections
- `POST /api/connections` – Send connection request (protected)
- `PUT /api/connections/:id` – Accept/reject request (protected)
- `GET /api/connections` – Get all connections (protected)
