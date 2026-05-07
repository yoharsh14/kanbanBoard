# Kanban Board

A real-time collaborative Kanban board built with React, Node.js, PostgreSQL, and WebSockets.

🚀 **Live Demo:** [https://kanban-board-1-8894.onrender.com/](https://kanban-board-1-8894.onrender.com/)

---

## Project Structure

```
kanban-board/
├── client/          # React frontend (Vite)
└── server/          # Node.js backend with WebSocket support
    └── prisma/      # Prisma schema and migrations
```

---

## Prerequisites

- Node.js v18+
- PostgreSQL
- npm or yarn

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yoharsh14/kanbanBoard.git
cd kanban-board
```

---

### 2. Setup the Server

```bash
cd server
npm install
```

Create a `.env` file inside the `server/` folder:

```properties
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/kanban
NODE_ENV=development
```

Run database migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the server:

```bash
npm start
```

The server runs on `http://localhost:3001` by default (or whatever `PORT` is set to in production).

---

### 3. Setup the Client

```bash
cd client
npm install
```

Create a `.env` file inside the `client/` folder:

```properties
VITE_API_URL=http://localhost:3001/task
VITE_WS_URL=ws://localhost:3001
```

Start the client:

```bash
npm run dev
```

The React app runs on `http://localhost:5173`.

---

## Deployment

The app is deployed on **Render**:

- **Frontend:** React static site with Vite build (`dist/`)
- **Backend:** Node.js web service with root directory `/server`
- **Database:** Render managed PostgreSQL

---

## Tech Stack

- **Frontend:** React, Vite, Axios
- **Backend:** Node.js, Express, WebSockets (ws)
- **Database:** PostgreSQL, Prisma ORM
- **Deployment:** Render
