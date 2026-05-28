#!/bin/bash

# 1. Install necessary tools
sudo apt update -y
sudo apt install -y git docker.io docker-compose

# 2. Prepare the directory
sudo mkdir -p /var/www/html
sudo chown -R $USER:$USER /var/www/html

# 3. Clone your code
git clone https://github.com/rawrzar-sharp/Rock-paper-scissors-15version.git /var/www/html/
cd /var/www/html/

# 4. Start the game infrastructure
sudo docker-compose up -d --build