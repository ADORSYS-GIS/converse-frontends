# Kubernetes Deployment Guide

This document explains how to deploy the self-service frontend container in Kubernetes with proper security configurations.

## Container Security Features

The container is built with Kubernetes security best practices:

1. **Non-root user**: Runs as UID 101 by default
2. **Arbitrary UID support**: Uses group permissions pattern (GID 0)
3. **Non-privileged port**: Listens on port 8080 (not 80)
4. **Minimal attack surface**: Alpine-based with security patches

## Permission Model

The container uses the **OpenShift/Kubernetes group permissions pattern**:

- Files are owned by `root:root` (UID 0, GID 0)
- Group permissions match user permissions (`chmod g=u`)
- Any UID in the root group (GID 0) can access files
- Kubernetes can assign arbitrary UIDs via `securityContext.runAsUser`

### Why This Works

When Kubernetes runs a container with `runAsUser: 1000` and `runAsGroup: 0`:
- The process runs as UID 1000 (non-root)
- The process is in GID 0 (root group)
- Files with group permissions allow access
- No permission errors occur

## Deployment Configuration

### Minimal Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: self-service-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: self-service-frontend
  template:
    metadata:
      labels:
        app: self-service-frontend
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000      # Any non-root UID
        runAsGroup: 0        # MUST be root group (GID 0)
        fsGroup: 0           # For volume mounts
      
      containers:
      - name: frontend
        image: ghcr.io/your-org/self-service:latest
        ports:
        - containerPort: 8080  # Container listens on 8080
        
        env:
        - name: EXPO_PUBLIC_BACKEND_URL
          value: "https://api.example.com"
        - name: EXPO_PUBLIC_KEYCLOAK_ISSUER
          value: "https://keycloak.example.com/realms/app"
        - name: EXPO_PUBLIC_KEYCLOAK_CLIENT_ID
          value: "app-client"
        - name: EXPO_PUBLIC_KEYCLOAK_SCHEME
          value: "openid-connect"
```

### Production Example

See `.docker/k8s-deployment-example.yaml` for a complete production-ready example with:
- Security contexts (pod and container level)
- Resource limits
- Liveness and readiness probes
- Service and Ingress configuration
- Security best practices

## Security Context Requirements

### Pod-Level Security Context

```yaml
securityContext:
  runAsNonRoot: true       # Enforce non-root
  runAsUser: 1000          # Any non-root UID (can be arbitrary)
  runAsGroup: 0            # MUST be GID 0 for file access
  fsGroup: 0               # For volume mounts
  seccompProfile:
    type: RuntimeDefault   # Enable seccomp
```

**Critical:** `runAsGroup: 0` is required for the container to access files. This is safe because:
- The process still runs as a non-root UID
- Group 0 doesn't grant root privileges
- It only allows file access via group permissions

### Container-Level Security Context

```yaml
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: false  # nginx needs write access to /var/cache, /var/log, /var/run
  capabilities:
    drop:
    - ALL
```

**Note:** `readOnlyRootFilesystem: false` is required because nginx needs to write to:
- `/var/cache/nginx` - Cache files
- `/var/log/nginx` - Access logs
- `/var/run/nginx.pid` - PID file

If you need `readOnlyRootFilesystem: true`, mount emptyDir volumes for these paths.

## Port Configuration

- **Container Port**: 8080 (non-privileged)
- **Service Port**: 80 (standard HTTP)
- **Ingress**: Standard HTTPS (443)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: self-service-frontend
spec:
  ports:
  - port: 80           # Service exposes port 80
    targetPort: 8080   # Routes to container port 8080
```

## Environment Variables

### Required

- `EXPO_PUBLIC_BACKEND_URL` - Backend API URL
- `EXPO_PUBLIC_KEYCLOAK_ISSUER` - Keycloak issuer URL
- `EXPO_PUBLIC_KEYCLOAK_CLIENT_ID` - Keycloak client ID
- `EXPO_PUBLIC_KEYCLOAK_SCHEME` - Auth scheme (usually "openid-connect")

### Optional

- `EXPO_PUBLIC_USAGE_URL` - Usage API URL
- `EXPO_PUBLIC_GATEWAY_URL` - Gateway URL
- `EXPO_PUBLIC_ANALYTICS_URL` - Analytics URL

See `.docker/README.md` for detailed environment variable documentation.

## Health Checks

The container includes a built-in health check on port 8080:

```yaml
livenessProbe:
  httpGet:
    path: /
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Resource Recommendations

```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "100m"
  limits:
    memory: "128Mi"
    cpu: "200m"
```

Adjust based on your traffic patterns and monitoring data.

## Troubleshooting

### Permission Denied Errors

**Symptom:** Container fails with "Permission denied" errors

**Solution:** Ensure `runAsGroup: 0` is set in the pod security context:

```yaml
securityContext:
  runAsUser: 1000
  runAsGroup: 0    # This is required!
```

### Container Won't Start

**Symptom:** Container exits immediately or fails health checks

**Possible causes:**
1. Missing required environment variables
2. Wrong port configuration (should be 8080)
3. Security context preventing execution

**Debug:**
```bash
# Check logs
kubectl logs <pod-name>

# Check environment
kubectl exec <pod-name> -- env | grep EXPO_PUBLIC

# Check nginx config
kubectl exec <pod-name> -- cat /etc/nginx/conf.d/default.conf

# Check file permissions
kubectl exec <pod-name> -- ls -la /usr/share/nginx/html
```

### Health Check Failures

**Symptom:** Readiness/liveness probes failing

**Solution:** Ensure probes use port 8080:

```yaml
livenessProbe:
  httpGet:
    path: /
    port: 8080  # Not 80!
```

## OpenShift Compatibility

This container is fully compatible with OpenShift's security constraints:

- Supports arbitrary UIDs (OpenShift assigns random UIDs)
- Uses group permissions pattern (OpenShift standard)
- Runs on non-privileged port (8080)
- No root privileges required

OpenShift will automatically assign a random UID in the root group (GID 0), and the container will work without modification.

## Testing Locally

Test the container with different UIDs to verify Kubernetes compatibility:

```bash
# Test with UID 1000
docker run --rm --user 1000:0 -p 8080:8080 \
  -e EXPO_PUBLIC_BACKEND_URL="https://api.example.com" \
  -e EXPO_PUBLIC_KEYCLOAK_ISSUER="https://keycloak.example.com/realms/app" \
  -e EXPO_PUBLIC_KEYCLOAK_CLIENT_ID="app-client" \
  -e EXPO_PUBLIC_KEYCLOAK_SCHEME="openid-connect" \
  ghcr.io/your-org/self-service:latest

# Test with arbitrary UID (simulating OpenShift)
docker run --rm --user 1234567:0 -p 8080:8080 \
  -e EXPO_PUBLIC_BACKEND_URL="https://api.example.com" \
  -e EXPO_PUBLIC_KEYCLOAK_ISSUER="https://keycloak.example.com/realms/app" \
  -e EXPO_PUBLIC_KEYCLOAK_CLIENT_ID="app-client" \
  -e EXPO_PUBLIC_KEYCLOAK_SCHEME="openid-connect" \
  ghcr.io/your-org/self-service:latest

# Access at http://localhost:8080
```

Both should work without permission errors.

## Security Scanning

The container passes Trivy security scans with:
- No HIGH or CRITICAL vulnerabilities
- Non-root user (DS-0002 compliant)
- Latest Alpine security patches
- Updated dependencies

Run security scan:
```bash
trivy image ghcr.io/your-org/self-service:latest
```

## References

- [Kubernetes Security Context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [OpenShift Guidelines for Creating Images](https://docs.openshift.com/container-platform/latest/openshift_images/create-images.html)
- [Support Arbitrary User IDs](https://docs.openshift.com/container-platform/latest/openshift_images/create-images.html#use-uid_create-images)
