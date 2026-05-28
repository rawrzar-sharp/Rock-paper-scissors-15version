# Project-3-Game: Real-Time Distributed Multiplayer Arena (15-Gesture Variant)

A highly responsive, distributed multiplayer game engine engineered for real-time state synchronization, horizontal scalability, and resilient microservices management. 

# System Architecture & Tech Stack

The platform decomposes application layers into containerized microservices to guarantee separation of concerns and optimized performance profiles:
- **Frontend Layer:** React.js Single Page Application (SPA) serving user interaction matrices.
- **Real-Time Gateway & Application Layer:** Python FastAPI integrated with asynchronous ASGI `Socket.IO` server running under Uvicorn.
- **State Hydration / Memory Layer:** Redis (In-memory key-value database caching ephemeral lobby and match structures).
- **Asynchronous Message Broker:** RabbitMQ (Managing event propagation matrices and cluster pub/sub queues).
- **Orchestration Layer:** Docker & Docker Compose.

---

# Configuration

Prior to initializing the production orchestration matrix, align the client network layer to communicate with the application gateway.

Open `frontend/src/App.js` and ensure the target engine string points directly to your deployment endpoint:

```javascript
// Ensure this matches your cloud environment's External IP
const API_BASE = process.env.REACT_APP_BACKEND_URL || '[http://34.67.224.115:8000](http://34.67.224.115:8000)';


Within the GCP:
gcloud compute ssh rps15-game --zone=us-central1-a

cd /var/www/html/

git clone https://github.com/rawrzar-sharp/Rock-paper-scissors-15version.git /var/www/html/

sudo docker-compose down --remove-orphans

sudo docker-compose build frontend

sudo docker-compose up -d redis rabbitmq

sudo docker-compose up -d game_server

sudo docker-compose up -d frontend

How to build:
cd /var/www/html
sudo git fetch --all
sudo git reset --hard origin/main
sudo docker-compose build frontend
sudo docker-compose up -d frontend

Works!