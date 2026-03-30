# CodePylot Kubernetes Deployment

Deploy CodePylot to any Kubernetes cluster using Helm.

## Prerequisites

- [kubectl](https://kubernetes.io/docs/tasks/tools/) (v1.28+)
- [Helm](https://helm.sh/docs/intro/install/) (v3.12+)
- A Kubernetes cluster (k3s, DigitalOcean, Hetzner, GKE, EKS, AKS, etc.)
- An ingress controller (nginx-ingress recommended)
- cert-manager (for automatic TLS certificates)

## Quick Start

### 1. Generate required secrets

```bash
# Generate secrets (save these values)
AUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 16)

echo "AUTH_SECRET: $AUTH_SECRET"
echo "ENCRYPTION_KEY: $ENCRYPTION_KEY"
echo "CRON_SECRET: $CRON_SECRET"
```

### 2. Install with Helm

```bash
helm install codepylot ./deploy/helm/codepylot \
  --set env.AUTH_SECRET="$AUTH_SECRET" \
  --set env.ENCRYPTION_KEY="$ENCRYPTION_KEY" \
  --set env.CRON_SECRET="$CRON_SECRET" \
  --set env.NEXTAUTH_URL="https://your-domain.com" \
  --set ingress.hosts[0].host="your-domain.com" \
  --set ingress.hosts[0].paths[0].path="/" \
  --set ingress.hosts[0].paths[0].pathType="Prefix" \
  --set ingress.tls[0].secretName="codepylot-tls" \
  --set ingress.tls[0].hosts[0]="your-domain.com"
```

### 3. Verify deployment

```bash
kubectl get pods
kubectl get svc
kubectl get ingress
```

## Configuration Reference

### Image

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Docker image repository | `codepylot` |
| `image.tag` | Docker image tag | `latest` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |

### Service

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `3000` |

### Ingress

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class | `nginx` |
| `ingress.hosts` | Ingress hosts configuration | See values.yaml |
| `ingress.tls` | TLS configuration | See values.yaml |

### PostgreSQL

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Deploy PostgreSQL StatefulSet | `true` |
| `postgresql.image` | PostgreSQL image | `postgres:16-alpine` |
| `postgresql.auth.username` | Database username | `codepylot` |
| `postgresql.auth.password` | Database password | `codepylot` |
| `postgresql.auth.database` | Database name | `codepylot` |
| `postgresql.storage.size` | PVC size | `10Gi` |

### External Database

| Parameter | Description | Default |
|-----------|-------------|---------|
| `externalDatabase.url` | Full PostgreSQL connection URL | `""` |

Set `postgresql.enabled=false` and provide `externalDatabase.url` to use an external database.

### Ollama (Local AI)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ollama.enabled` | Deploy Ollama | `false` |
| `ollama.image` | Ollama image | `ollama/ollama:latest` |
| `ollama.storage.size` | PVC size for models | `20Gi` |

### Required Secrets

| Parameter | Description | Generate With |
|-----------|-------------|---------------|
| `env.AUTH_SECRET` | NextAuth session secret | `openssl rand -base64 32` |
| `env.ENCRYPTION_KEY` | AES-256-GCM key | `openssl rand -hex 32` |
| `env.CRON_SECRET` | Cron job auth token | `openssl rand -hex 16` |

### OAuth (Optional)

| Parameter | Description |
|-----------|-------------|
| `env.GITHUB_ID` | GitHub OAuth App Client ID |
| `env.GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `env.GOOGLE_ID` | Google OAuth Client ID |
| `env.GOOGLE_SECRET` | Google OAuth Client Secret |

### Autoscaling

| Parameter | Description | Default |
|-----------|-------------|---------|
| `autoscaling.enabled` | Enable HPA | `false` |
| `autoscaling.minReplicas` | Minimum replicas | `1` |
| `autoscaling.maxReplicas` | Maximum replicas | `5` |
| `autoscaling.targetCPUUtilizationPercentage` | CPU target | `80` |

### Backups

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backup.enabled` | Enable daily backups | `true` |
| `backup.schedule` | Backup cron schedule | `0 2 * * *` |
| `backup.retention.days` | Daily backup retention | `7` |

## Provider-Specific Setup

### Hetzner Cloud (hcloud + k3s)

```bash
# Create a k3s cluster with hetzner-k3s or manually
# Install nginx ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: you@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF

# Deploy CodePylot
helm install codepylot ./deploy/helm/codepylot \
  --set env.AUTH_SECRET="$(openssl rand -base64 32)" \
  --set env.ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  --set env.CRON_SECRET="$(openssl rand -hex 16)"
```

### DigitalOcean Kubernetes (DOKS)

```bash
# Create cluster via doctl or web UI
doctl kubernetes cluster create codepylot --region fra1 --size s-2vcpu-4gb --count 2

# Install nginx ingress (DigitalOcean automatically provisions a LoadBalancer)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/do/deploy.yaml

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml

# Deploy CodePylot
helm install codepylot ./deploy/helm/codepylot \
  --set env.AUTH_SECRET="$(openssl rand -base64 32)" \
  --set env.ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  --set env.CRON_SECRET="$(openssl rand -hex 16)"
```

### Local Development (k3s)

```bash
# Install k3s
curl -sfL https://get.k3s.io | sh -

# k3s includes Traefik by default; switch to nginx if preferred
# or adjust ingress.className to "traefik"

# Build and load image locally
docker build -t codepylot:latest .
k3s ctr images import <(docker save codepylot:latest)

# Deploy
helm install codepylot ./deploy/helm/codepylot \
  --set ingress.enabled=false \
  --set service.type=NodePort \
  --set env.AUTH_SECRET="$(openssl rand -base64 32)" \
  --set env.ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  --set env.CRON_SECRET="$(openssl rand -hex 16)" \
  --set env.NEXTAUTH_URL="http://localhost:3000"
```

### Using External Database

```bash
helm install codepylot ./deploy/helm/codepylot \
  --set postgresql.enabled=false \
  --set externalDatabase.url="postgresql://user:pass@db-host:5432/codepylot" \
  --set env.AUTH_SECRET="$(openssl rand -base64 32)" \
  --set env.ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  --set env.CRON_SECRET="$(openssl rand -hex 16)"
```

## Upgrading

```bash
# Update values and upgrade
helm upgrade codepylot ./deploy/helm/codepylot \
  --reuse-values \
  --set image.tag="v1.1.0"

# Or with a values file
helm upgrade codepylot ./deploy/helm/codepylot -f my-values.yaml
```

## Backup and Restore

### Manual Backup

```bash
# Get the PostgreSQL pod name
PG_POD=$(kubectl get pods -l "app.kubernetes.io/name=codepylot-postgresql" -o jsonpath="{.items[0].metadata.name}")

# Run pg_dump
kubectl exec $PG_POD -- pg_dump -U codepylot -Fc codepylot > backup.dump
```

### Restore from Backup

```bash
# Copy backup to pod
kubectl cp backup.dump $PG_POD:/tmp/backup.dump

# Restore
kubectl exec $PG_POD -- pg_restore -U codepylot -d codepylot --clean --if-exists /tmp/backup.dump
```

### Automated Backups

Automated daily backups are enabled by default (`backup.enabled=true`). Backups are stored in a PVC and old backups are cleaned up based on `backup.retention.days`.

## Troubleshooting

### Pods not starting

```bash
# Check pod status and events
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>
```

### Database connection issues

```bash
# Verify PostgreSQL is running
kubectl get pods -l "app.kubernetes.io/name=codepylot-postgresql"

# Check PostgreSQL logs
kubectl logs -l "app.kubernetes.io/name=codepylot-postgresql"

# Test connectivity from app pod
kubectl exec -it <app-pod> -- node -e "
const net = require('net');
const s = new net.Socket();
s.connect(5432, 'codepylot-postgresql', () => { console.log('OK'); s.destroy(); });
s.on('error', (e) => console.log('FAIL:', e.message));
"
```

### Ingress not working

```bash
# Check ingress status
kubectl get ingress
kubectl describe ingress <ingress-name>

# Check nginx ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

### CronJobs not firing

```bash
# Check CronJob status
kubectl get cronjobs

# Check recent job runs
kubectl get jobs --sort-by=.metadata.creationTimestamp

# Check job logs
kubectl logs job/<job-name>
```

## Uninstalling

```bash
helm uninstall codepylot

# PVCs are NOT deleted automatically (to protect data)
# To delete all data:
kubectl delete pvc -l app.kubernetes.io/instance=codepylot
```
