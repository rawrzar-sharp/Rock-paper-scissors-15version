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

Next steps: add React frontend + WebSocket real-time updates + a RabbitMQ consumer worker.

Rechecked all components and changes ws multiple times.