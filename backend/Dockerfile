FROM python:3.11-slim

WORKDIR /app

# Copy and install requirements first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend source code
COPY . .

# Leave CMD blank or default to flask since docker-compose overrides it anyway
CMD ["python", "app.py"]