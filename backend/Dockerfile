# Use an official Python runtime
FROM python:3.12-slim

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy current directory code
COPY . .

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["python", "server.py"]