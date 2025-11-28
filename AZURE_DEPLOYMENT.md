# Azure Deployment Guide

## Overview

This application is deployed to **Azure Container Instances (ACI)** using the shared IE University resource group. Deployment is fully automated via GitHub Actions CI/CD pipeline.

## Deployment Architecture

```
GitHub Push (main branch)
    ↓
GitHub Actions Workflow
    ↓
1. Run Tests (85% coverage)
2. Build Docker Image
3. Azure Login (Service Principal)
4. Deploy to Azure Container Instances
5. Verify Health Check
    ↓
Live Application
```

## Azure Resources Used

- **Service:** Azure Container Instances (ACI)
- **Resource Group:** `sddo-shared-rg` (shared)
- **Region:** West Europe
- **Container Name:** `task-manager-erivela21`
- **DNS Label:** `task-manager-erivela21`
- **Resources:** 1 CPU, 1 GB Memory

## Deployment URL

Once deployed, the application is accessible at:

```
http://task-manager-erivela21.westeurope.azurecontainer.io:5000
```

**Endpoints:**
- Health Check: `http://task-manager-erivela21.westeurope.azurecontainer.io:5000/health`
- Metrics: `http://task-manager-erivela21.westeurope.azurecontainer.io:5000/metrics`
- Tasks API: `http://task-manager-erivela21.westeurope.azurecontainer.io:5000/tasks`

## Automated Deployment Process

### Trigger
Deployment happens automatically when code is pushed to the `main` branch:
```bash
git push origin main
```

### Pipeline Steps

1. **Test Stage:**
   - Runs 35 unit and integration tests
   - Checks for 85% code coverage
   - Fails if coverage < 70%

2. **Build Stage:**
   - Builds Docker image from Dockerfile
   - Tests container health endpoint
   - Only runs if tests pass

3. **Deploy Stage (Azure):**
   - Authenticates with Azure using Service Principal
   - Creates/updates Azure Container Instance
   - Configures public DNS name
   - Sets environment variables
   - Verifies deployment with health check

### GitHub Secrets Required

The following secrets must be configured in GitHub repository settings:

| Secret Name | Purpose |
|-------------|---------|
| `AZURE_CLIENT_ID` | Service Principal Application ID |
| `AZURE_CLIENT_SECRET` | Service Principal Secret Value |
| `AZURE_TENANT_ID` | Azure Active Directory Tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID |
| `AZURE_RESOURCE_GROUP` | Resource group name (e.g., `sddo-shared-rg`) |
| `AZURE_LOCATION` | Azure region (e.g., `westeurope`) |

**⚠️ SECURITY NOTE:** These credentials are stored as GitHub Secrets and NEVER committed to the repository.

## Manual Deployment (Optional)

If you need to deploy manually using Azure CLI:

### Prerequisites
```bash
# Install Azure CLI
# Windows: Download from https://aka.ms/installazurecliwindows
# macOS: brew install azure-cli
# Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login --service-principal \
  --username $AZURE_CLIENT_ID \
  --password $AZURE_CLIENT_SECRET \
  --tenant $AZURE_TENANT_ID
```

### Deploy Container
```bash
# Build Docker image
docker build -t task-manager-backend .

# Deploy to Azure Container Instances
az container create \
  --resource-group sddo-shared-rg \
  --name task-manager-erivela21 \
  --image task-manager-backend:latest \
  --cpu 1 \
  --memory 1 \
  --ports 5000 \
  --dns-name-label task-manager-erivela21 \
  --environment-variables \
    TASK_API_HOST=0.0.0.0 \
    TASK_API_PORT=5000 \
    FLASK_ENV=production \
  --restart-policy Always
```

### Check Deployment Status
```bash
# Get container status
az container show \
  --resource-group sddo-shared-rg \
  --name task-manager-erivela21 \
  --query "{Status:instanceView.state, FQDN:ipAddress.fqdn}" \
  --output table

# View logs
az container logs \
  --resource-group sddo-shared-rg \
  --name task-manager-erivela21
```

## Monitoring Deployed Application

### Health Check
```bash
curl http://task-manager-erivela21.westeurope.azurecontainer.io:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-28T10:30:00",
  "version": "1.0.0",
  "service": "Task Manager API"
}
```

### Metrics
```bash
curl http://task-manager-erivela21.westeurope.azurecontainer.io:5000/metrics
```

### View Container Logs
```bash
az container logs \
  --resource-group sddo-shared-rg \
  --name task-manager-erivela21 \
  --follow
```

## Troubleshooting

### Deployment Failed
1. Check GitHub Actions logs: https://github.com/Erivela21/ToDoTaskManagerErivela21/actions
2. Verify all secrets are configured correctly
3. Check Azure resource group has available quota

### Container Not Responding
```bash
# Restart container
az container restart \
  --resource-group sddo-shared-rg \
  --name task-manager-erivela21

# Check container state
az container show \
  --resource-group sddo-shared-rg \
  --name task-manager-erivela21 \
  --query instanceView.state
```

### View Container Logs
```bash
# Real-time logs
az container logs \
  --resource-group sddo-shared-rg \
  --name task-manager-erivela21 \
  --follow

# Logs with timestamps
az container attach \
  --resource-group sddo-shared-rg \
  --name task-manager-erivela21
```

## Cost Considerations

**Azure Container Instances Pricing:**
- 1 vCPU: ~€0.0000125/second (~€32/month if running 24/7)
- 1 GB Memory: ~€0.0000014/second (~€3.60/month if running 24/7)

**For shared resource group:** Costs are shared across all students. Be mindful of resource usage.

## Cleanup (After Assignment)

To delete the deployment:
```bash
az container delete \
  --resource-group sddo-shared-rg \
  --name task-manager-erivela21 \
  --yes
```

## Security Best Practices

✅ **Implemented:**
- Service Principal authentication (not personal credentials)
- Secrets stored in GitHub Secrets (encrypted)
- No credentials in code or commit history
- HTTPS for production (configure Azure App Service for SSL)
- Environment variables for configuration
- Health checks for monitoring

❌ **Not Implemented (Future Improvements):**
- Azure Key Vault for secret management
- Azure Monitor for advanced logging
- Rate limiting and API throttling
- Database for persistent storage (currently JSON file)

## Assignment Requirements Met

✅ **Deployment Automation (CD):**
- ✅ Containerized with Docker
- ✅ Deployed to Azure (cloud platform)
- ✅ Secrets configured in GitHub
- ✅ Only main branch triggers deployment
- ✅ Automated via CI/CD pipeline

✅ **Monitoring:**
- ✅ `/health` endpoint exposed
- ✅ `/metrics` endpoint with performance data
- ✅ Azure Container Instances monitoring available

## References

- Azure Container Instances Documentation: https://learn.microsoft.com/en-us/azure/container-instances/
- GitHub Actions for Azure: https://github.com/Azure/actions
- Azure CLI Reference: https://learn.microsoft.com/en-us/cli/azure/

---

**Deployed by:** Erivela21  
**Last Updated:** November 28, 2025  
**Assignment:** Individual Assignment 2 - IE University BCSAI SDDO 2025
