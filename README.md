# Node.js CI/CD Deployment with GitHub Actions, AWS EC2 VPS, and Docker

This project demonstrates a simple CI/CD pipeline where every push to GitHub automatically deploys the app to a VPS (AWS EC2 in this guide) using Docker and GitHub Actions.
NOTE - you can choose any vps provider.
Flow:

`GitHub Push -> GitHub Actions -> SSH into EC2 -> Pull latest code -> Rebuild Docker container -> Deploy`

## Project Architecture

```text
Developer
   |
   | git push
   v
GitHub Repository
   |
   v
GitHub Actions (CI/CD)
   |
   | SSH using private key
   v
AWS EC2 VPS
   |
   | git pull
   | docker compose up -d --build
   v
Running Node.js Docker Container
```

## Tech Stack

- Node.js
- Docker
- AWS EC2 (or any VPS)
- GitHub Actions
- SSH

## Prerequisites

- A GitHub repository with this project code
- An EC2 instance (Ubuntu recommended)
- Security group rules for the ports you need:
  - SSH: `22`
  - App port: `3000` (for this project)
  - Optional: `80` and `443` (for reverse proxy / HTTPS later)
- Local terminal with `ssh-keygen` available

## Step 1: Launch EC2 Instance

Create an EC2 instance and configure:

- OS: Ubuntu
- Enable SSH access
- Create/download key pair (`.pem`)

Security group inbound rules:

- `SSH (22)` from your IP (recommended)
- `Custom TCP (3000)` from allowed source(s)
- `HTTP (80)` and `HTTPS (443)` if needed

Note:
Opening all ports to `0.0.0.0/0` is not recommended for production. It is only acceptable for temporary testing.

## Step 2: Connect to EC2 via SSH

Use your `.pem` key:

```bash
ssh -i codeFile.pem ubuntu@your-ec2-ip
```

Example:

```bash
ssh -i codeFile.pem ubuntu@13.233.186.18
```

## Step 3: Install Docker on EC2 (Ubuntu)

Run these commands on EC2:

```bash
# Add Docker's official GPG key
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update

# Install Docker engine + compose plugin
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify
docker --version
```

Reference:
https://docs.docker.com/engine/install/ubuntu/

## Step 4: Clone and Run Project on EC2

Use `ubuntu` user (recommended) instead of root.

```bash
cd /home/ubuntu
git clone your_repo_url
cd /your_repo
sudo docker compose up -d
```

Example clone:

```bash
git clone https://github.com/ankit23-exe/backend-deploy-project-live-testing.git
```

Why `sudo`?
The `ubuntu` user not have Docker group permissions by default.

## Step 5: Generate SSH Key Pair for GitHub Actions

Run this on your local machine:

```bash
ssh-keygen -t rsa -b 4096 -C "github-action"
```

When prompted for save location, you can give a custom path, for example:

```text
C:\Users\User\Desktop\docker testing\private
```

This creates:

- `private` (private key)
- `private.pub` (public key)

Use an empty passphrase for non-interactive GitHub Actions usage.

## Step 6: Add Public Key to EC2

On EC2:

```bash
cd ~/.ssh
nano authorized_keys
```

Paste content of `private.pub`, then save.

Important location for `ubuntu` user:

```text
/home/ubuntu/.ssh/authorized_keys
```

If you log in as `root`, then it would be:

```text
/root/.ssh/authorized_keys
```

## Step 7: Add GitHub Repository Secrets

In GitHub:
`Repository -> Settings -> Secrets and variables -> Actions`

Add:

- `SSH_HOST` = your EC2 public IP (example: `13.233.186.18`)
- `SSH_KEY` = full content of your private key file (`private`)

Example private key format:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
xxxxxxxxxxxx
xxxxxxxxxxxx
-----END OPENSSH PRIVATE KEY-----
```

## Step 8: GitHub Actions Workflow

This project already includes:

- `.github/workflows/deploy.yaml`

Current workflow:

```yaml
name: Deploy NodeJS Application to EC2

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Deploy Via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /home/ubuntu/backend-deploy-project-live-testing
            sudo git pull
            sudo docker compose up -d --build
```

Make sure the `cd` path matches your project folder on EC2.

## Step 9: Trigger Deployment

Push to `main`:

```bash
git add .
git commit -m "deploy update"
git push origin main
```

GitHub Actions will automatically:

1. SSH into EC2
2. Pull latest code
3. Rebuild Docker container
4. Restart the app

## Access the Application

Open in browser:

```text
http://YOUR_EC2_IP:3000
```

Example:

```text
http://13.233.186.18:3000
```

Health endpoint:

```text
http://YOUR_EC2_IP:3000/health
```

## Common Issues and Fixes

### 1) Port not accessible

Problem:
Only `22`, `80`, `443` were open.

Fix:
Open app port in EC2 security group:

- Custom TCP `3000` -> source as needed (for testing: `0.0.0.0/0`)

### 2) GitHub Action SSH login failed

Problem:
Workflow used `username: root`.

Fix:
Use default EC2 Ubuntu user:

- `username: ubuntu`

### 3) Docker permission denied

Error:
`permission denied while trying to connect to docker.sock`

Fix:
Run Docker commands with `sudo` (or configure Docker group permissions).

### 4) SSH key added in wrong location

Fix:
For Ubuntu user, put public key in:

- `/home/ubuntu/.ssh/authorized_keys`

Not in:

- `/root/.ssh/authorized_keys` (unless you log in as root)

## Final CI/CD Flow

```text
Developer
   |
   v
GitHub push
   |
   v
GitHub Actions
   |
   v
SSH into EC2
   |
   v
git pull
docker compose build
docker compose up
   |
   v
Application updated
```

## Future Improvements

- Add Nginx reverse proxy
- Add HTTPS via Let's Encrypt
- Push image to registry (ECR / Docker Hub)
- Add zero-downtime deployment strategy
- Move to Kubernetes

