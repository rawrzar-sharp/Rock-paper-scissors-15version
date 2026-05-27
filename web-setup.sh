#!/bin/bash

# Update package list and install Nginx and Git
sudo apt-get update -y
sudo apt-get install nginx git -y

# Remove the default Nginx welcome page
sudo rm -rf /var/www/html/*

# Clone your specific Rock-Paper-Scissors repository
git clone https://github.com/rawrzar-sharp/Rock-paper-scissors-15version.git

# Move the game files into the public web directory
sudo cp -r Rock-paper-scissors-15version/* /var/www/html/

# Clean up the cloned folder to save space
rm -rf Rock-paper-scissors-15version

# Ensure Nginx is enabled on boot and restart it to apply the changes
sudo systemctl enable nginx
sudo systemctl restart nginx