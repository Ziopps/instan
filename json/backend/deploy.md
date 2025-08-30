# Deployment Guide

## Production Deployment

### 1. Environment Setup

Create `.env` file dengan production values:

```bash
# Server Configuration
PORT=8081
NODE_ENV=production
LOG_LEVEL=info

# N8N Integration (REQUIRED)
N8N_GENERATION_URL=https://xzio.app.n8n.cloud/webhook-test/novel-generation
N8N_UPLOAD_URL=https://xzio.app.n8n.cloud/webhook-test/novel-upload
N8N_TOKEN=your-n8n-token

# Database & Services
GRAPHQL_ENDPOINT=https://your-production-graphql-endpoint
NEO4J_URI=https://your-production-neo4j-instance
NEO4J_DATABASE=your-production-database
REDIS_URL=redis://your-production-redis:6379/0

# Embedding & Vector DB
EMBEDDING_SERVICE=https://your-production-embedding-service/api
EMBEDDING_MODEL_NAME=e5-large-v2
PINECONE_URL=https://your-production-pinecone-index
PINECONE_API_KEY=your-production-pinecone-key

# Security (IMPORTANT)
CALLBACK_SECRET=your-strong-callback-secret-256-bits
ALLOWED_ORIGINS=https://your-production-frontend.com,https://your-admin-panel.com
```

### 2. Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY test_novel_api.js ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8081/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# Start application
CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  novel-backend:
    build: .
    ports:
      - "8081:8081"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 3. Deploy Commands

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f novel-backend

# Run tests
docker-compose exec novel-backend npm test

# Scale if needed
docker-compose up -d --scale novel-backend=3
```

### 4. Kubernetes Deployment

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: novel-backend
  labels:
    app: novel-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: novel-backend
  template:
    metadata:
      labels:
        app: novel-backend
    spec:
      containers:
      - name: novel-backend
        image: your-registry/novel-backend:latest
        ports:
        - containerPort: 8081
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "8081"
        envFrom:
        - secretRef:
            name: novel-backend-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 8081
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: novel-backend-service
spec:
  selector:
    app: novel-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8081
  type: LoadBalancer

---
apiVersion: v1
kind: Secret
metadata:
  name: novel-backend-secrets
type: Opaque
stringData:
  N8N_GENERATION_URL: "https://xzio.app.n8n.cloud/webhook-test/novel-generation"
  N8N_UPLOAD_URL: "https://xzio.app.n8n.cloud/webhook-test/novel-upload"
  CALLBACK_SECRET: "your-strong-callback-secret"
  REDIS_URL: "redis://redis-service:6379/0"
  # Add other secrets...
```

### 5. Monitoring Setup

Create `monitoring.yaml`:

```yaml
# Prometheus monitoring
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'novel-backend'
      static_configs:
      - targets: ['novel-backend-service:80']
      metrics_path: '/metrics'
      scrape_interval: 10s

---
# Grafana dashboard config
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard
data:
  novel-backend.json: |
    {
      "dashboard": {
        "title": "Novel Backend Metrics",
        "panels": [
          {
            "title": "Request Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(http_requests_total[5m])"
              }
            ]
          },
          {
            "title": "Error Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(http_requests_total{status=~\"4..|5..\"}[5m])"
              }
            ]
          }
        ]
      }
    }
```

### 6. Load Balancer Configuration

Nginx configuration (`nginx.conf`):

```nginx
upstream novel_backend {
    server novel-backend-1:8081;
    server novel-backend-2:8081;
    server novel-backend-3:8081;
}

server {
    listen 80;
    server_name your-api-domain.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req zone=api burst=20 nodelay;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://novel_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://novel_backend/health;
        access_log off;
    }
}
```

### 7. SSL/TLS Setup

Using Let's Encrypt with Certbot:

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-api-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. Backup Strategy

Database backup script (`backup.sh`):

```bash
#!/bin/bash

# Redis backup
redis-cli --rdb /backup/redis-$(date +%Y%m%d).rdb

# Neo4j backup (if applicable)
neo4j-admin backup --backup-dir=/backup/neo4j --name=neo4j-$(date +%Y%m%d)

# Upload to cloud storage
aws s3 sync /backup/ s3://your-backup-bucket/novel-backend/

# Cleanup old backups (keep 30 days)
find /backup -name "*.rdb" -mtime +30 -delete
find /backup -name "neo4j-*" -mtime +30 -exec rm -rf {} \;
```

### 9. Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connections tested
- [ ] N8N webhook URLs verified
- [ ] SSL certificates installed
- [ ] Monitoring setup complete
- [ ] Backup strategy implemented
- [ ] Load balancer configured
- [ ] Health checks working
- [ ] Error logging configured
- [ ] Performance testing completed

### 10. Post-Deployment Testing

```bash
# Health check
curl https://your-api-domain.com/health

# Novel generation test
curl -X POST https://your-api-domain.com/novel-generation \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "test-novel",
    "chapterNumber": 1,
    "focusElements": "test",
    "stylePreference": "test",
    "mood": "test",
    "callbackUrl": "https://httpbin.org/post"
  }'

# Load test
ab -n 100 -c 10 https://your-api-domain.com/health
```

### 11. Troubleshooting

Common issues dan solutions:

**Connection Refused:**
- Check if service is running: `docker-compose ps`
- Check logs: `docker-compose logs novel-backend`
- Verify port mapping

**Database Connection Failed:**
- Check environment variables
- Test database connectivity
- Verify network configuration

**N8N Integration Issues:**
- Verify webhook URLs are accessible
- Check N8N instance status
- Test webhook endpoints manually

**High Memory Usage:**
- Monitor with `docker stats`
- Adjust memory limits in docker-compose
- Check for memory leaks in logs