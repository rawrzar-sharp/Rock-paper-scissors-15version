FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# CRA dev server port
EXPOSE 3000

# During container runs we use the dev server for simplicity
CMD ["npm", "start"]

