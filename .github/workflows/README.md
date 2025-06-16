# 🚀 Deployment Setup Guide (Quizzma)

This project uses GitHub Actions to deploy the **frontend**, **backend**, and **Prometheus monitoring stack** to remote servers. Below is a reference for the required **GitHub Secrets** and **GitHub Variables** per environment.

---

## 🔐 GitHub **Secrets & Variables by Environment**

### 🧩 `backend` (Backend + Monitoring VM)

> Used in:
> - [`backend-deploy.yml`](.github/workflows/backend-deploy.yml)
> - [`prometheus-deploy.yml`](.github/workflows/prometheus-deploy.yml)

| Type     | Name                        | Description                  |
|----------|-----------------------------|------------------------------|
| Secret   | `VM_KEY`                    | SSH private key for VM access |
| Secret   | `OPENAI_API_KEY`            | OpenAI API key               |
| Secret   | `SOURCE_TOKEN`              | Optional external API source token |
| Secret   | `BETTERSTACK_PROM_TOKEN`    | BetterStack token (used by Vector sink) |
| Variable | `VM_IP`                     | Public IP address of the EC2 VM |
| Variable | `VM_USER`                   | SSH username on the VM (e.g. `ubuntu`) |
| Variable | `DATABASE_URL`              | PostgreSQL or SQLite database connection URI |

---

### 🌐 `frontend` (Frontend Hosting)

> Used in:
> - [`frontend-deploy.yml`](.github/workflows/frontend-deploy.yml)

| Type     | Name                        | Description                                  |
|----------|-----------------------------|----------------------------------------------|
| Secret   | `SSH_HOST`                  | Hostname or IP of frontend server            |
| Secret   | `SSH_USERNAME`              | SSH username for frontend host               |
| Secret   | `SSH_PASSWORD`              | SSH password (used for deployment)           |
| Secret   | `VITE_POSTHOG_KEY`          | PostHog analytics public key                 |
| Variable | `VITE_POSTHOG_HOST`         | PostHog instance hostname    |
| Variable | `VITE_API_URL`              | URL of the deployed backend API              |
| Variable | `FRONTEND_NODE_ENV`         | Node environment (`production`, `development`) |

