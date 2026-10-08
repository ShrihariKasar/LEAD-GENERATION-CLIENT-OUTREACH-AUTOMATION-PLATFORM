# THREADLINE — Deployment & Local Setup Guide

## 1. Quick Local Development (Zero Docker Required)

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Backend Setup
```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt

# 2. Run database initialization & API server
uvicorn backend.app.main:app --reload --port 8000
```
FastAPI interactive Swagger documentation will be live at `http://127.0.0.1:8000/api/v1/docs`.

### Frontend Setup
```bash
# 1. Install dependencies & start Vite dev server
cd frontend
npm install
node node_modules/vite/bin/vite.js
```
The operations console will be live at `http://localhost:5173`.

---

## 2. Docker Compose Production Deployment

```bash
# Start PostgreSQL, Redis, FastAPI Backend, and Frontend Nginx
docker-compose up --build -d
```

### Services
- **Frontend Console**: `http://localhost:5173` (or port 80 via reverse proxy)
- **Backend API**: `http://localhost:8000`
- **PostgreSQL**: `localhost:5432` (`threadline_db`)
- **Redis**: `localhost:6379`
