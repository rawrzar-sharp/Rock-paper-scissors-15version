cat << 'EOF' > vpc-rps.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = "4787649586036097510"
  region  = "us-central1" 
}

# Create the Virtual Private Cloud (VPC)
resource "google_compute_network" "main_vpc" {
  name                    = "project1-vpc"
  auto_create_subnetworks = false
}

# Create Public Subnet 1
resource "google_compute_subnetwork" "public_subnet_1" {
  name          = "public-subnet-1"
  ip_cidr_range = "10.0.1.0/24"
  region        = "us-central1"
  network       = google_compute_network.main_vpc.id
}

# Create Public Subnet 2
resource "google_compute_subnetwork" "public_subnet_2" {
  name          = "public-subnet-2"
  ip_cidr_range = "10.0.2.0/24"
  region        = "us-central1"
  network       = google_compute_network.main_vpc.id
}

# Master Firewall Rule: Added Port 8000 for your Backend API
resource "google_compute_firewall" "web_firewall" {
  name    = "master-game-firewall"
  network = google_compute_network.main_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22", "80", "3000", "8000"] 
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]
  priority      = 900
}

# Firewall Rule to allow Google's secure IAP to connect via SSH
resource "google_compute_firewall" "allow_iap_ssh" {
  name    = "allow-iap-ssh"
  network = google_compute_network.main_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["web-server"]
}

# Updated Game VM Definition with full code automation built right in
resource "google_compute_instance" "game_vm" {
  name         = "rps15-game"
  machine_type = "e2-micro"
  zone         = "us-central1-a"

  tags = ["web-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network    = google_compute_network.main_vpc.name
    subnetwork = google_compute_subnetwork.public_subnet_1.name

    access_config {
      # Allocates your public, external IP address
    }
  }

  metadata_startup_script = <<-EOT
    #!/bin/bash
    # 1. Install Docker and git dependencies
    sudo apt-get update -y
    sudo apt-get install -y git docker.io docker-compose
    sudo systemctl start docker
    sudo systemctl enable docker

    # 2. Re-create html root and clone repo
    sudo rm -rf /var/www/html/*
    git clone https://github.com/rawrzar-sharp/Rock-paper-scissors-15version.git /var/www/html/
    cd /var/www/html/

    # 3. Fix the commented out code inside your docker-compose.yml file
    if [ -f docker-compose.yml ]; then
        sed -i 's/#//g' docker-compose.yml
    fi

    # 4. Patch your 'localhost' fallback path inside App.js to your actual Cloud IP
    find . -type f -name "App.js" -exec sed -i 's|http://localhost:8000|http://34.44.209.170:8000|g' {} +

    # 5. Bring down any hanging instances and start docker-compose fresh
    sudo docker-compose down --remove-orphans
    sudo docker-compose up -d --build
  EOT
}

# Output for your external IP address
output "game_server_public_ip" {
  value       = google_compute_instance.game_vm.network_interface[0].access_config[0].nat_ip
  description = "The public IP address of your game server."
}
EOF