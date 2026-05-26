# Project-3-Game (Distributed Tic-Tac-Toe - Scaffold)

This repo is being built per the project overview:
React + Python + Flask + Redis + RabbitMQ + WebSockets + Docker.

## Run backend + redis + rabbitmq (scaffold)

```bash
docker compose up --build
```

Backend API:
- `POST /api/sessions` -> creates session
- `POST /api/sessions/<session_id>/join` -> join session, returns marker X/O
- `POST /api/sessions/<session_id>/move` -> submit move (validates turn)
- `GET /api/sessions/<session_id>` -> fetch state

Steps:
Do 1 Terminal with:
uvicorn backend.server:app --reload --port 8000

Other terminal with:
Docker compose up --build