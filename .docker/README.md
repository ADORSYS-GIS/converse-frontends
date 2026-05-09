# Runtime Environment Variables

This document explains the runtime environment variables for the Lightbridge Self-Service app container, including which are required and which are optional, along with how to interpret their required status from the codebase.

## Environment Variables Overview

The container uses environment variables to configure the app at runtime. These variables are substituted into the `config.json` file when the container starts up.

## Determining Required vs Optional Variables

The required status of each variable is defined in two key places in the codebase:

### 1. Runtime Config Types (`runtime-config-types.ts`)

Located at `apps/self-service/src/configs/runtime-config-types.ts`, this file defines the TypeScript type for the configuration:

```typescript
export type AppRuntimeConfig = {
  backendUrl: string;
  usageUrl?: string;
  gatewayUrl?: string;
  analyticsUrl?: string;
  keycloak: {
    issuer: string;
    clientId: string;
    scheme: string;
  };
};

export function isAppRuntimeConfig(value: unknown): value is AppRuntimeConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const config = value as AppRuntimeConfig;

  return (
    typeof config.backendUrl === 'string' &&
    (config.usageUrl === undefined || typeof config.usageUrl === 'string') &&
    typeof config.keycloak?.issuer === 'string' &&
    typeof config.keycloak?.clientId === 'string' &&
    typeof config.keycloak?.scheme === 'string'
  );
}
```

- Variables without `?` are **required**
- Variables with `?` are **optional**

### 2. Config Validator (`runtime-config.tsx`)

Located at `apps/self-service/src/configs/runtime-config.tsx`, this file contains the validation logic:

```typescript
function getEnvConfig(): AppRuntimeConfig {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  const usageUrl = process.env.EXPO_PUBLIC_USAGE_URL;
  const gatewayUrl = process.env.EXPO_PUBLIC_GATEWAY_URL;
  const analyticsUrl = process.env.EXPO_PUBLIC_ANALYTICS_URL;
  const issuer = process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER;
  const clientId = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID;
  const scheme = process.env.EXPO_PUBLIC_KEYCLOAK_SCHEME;

  if (!backendUrl || !issuer || !clientId || !scheme) {
    throw new Error('Missing required EXPO_PUBLIC_* config values.');
  }

  return {
    backendUrl,
    usageUrl,
    gatewayUrl,
    analyticsUrl,
    keycloak: {
      issuer,
      clientId,
      scheme,
    },
  };
}
```

This function explicitly checks for the presence of required variables and throws an error if any are missing.

## Required Environment Variables

These variables must be provided for the app to function properly.

### Backend API Configuration

- **`EXPO_PUBLIC_BACKEND_URL`** - Base URL for the backend API
  - Example: `https://api.example.com`
  - Required: Yes (checked in `getEnvConfig()`)

### Keycloak Authentication Configuration

- **`EXPO_PUBLIC_KEYCLOAK_ISSUER`** - Keycloak issuer URL for authentication
  - Example: `https://keycloak.example.com/realms/lightbridge`
  - Required: Yes (checked in `getEnvConfig()`)

- **`EXPO_PUBLIC_KEYCLOAK_CLIENT_ID`** - Keycloak client ID
  - Example: `lightbridge-ss`
  - Required: Yes (checked in `getEnvConfig()`)

- **`EXPO_PUBLIC_KEYCLOAK_SCHEME`** - Keycloak authentication scheme
  - Example: `openid-connect`
  - Required: Yes (checked in `getEnvConfig()`)

## Optional Environment Variables

These variables are optional but can be configured if needed.

### API Configuration

- **`EXPO_PUBLIC_USAGE_URL`** - URL for usage reporting API (defaults to backend URL if not provided)
  - Example: `https://usage.example.com`
  - Required: No (marked as optional in type definition)

- **`EXPO_PUBLIC_GATEWAY_URL`** - URL for API gateway
  - Example: `https://gateway.example.com`
  - Required: No (marked as optional in type definition)

- **`EXPO_PUBLIC_ANALYTICS_URL`** - URL for analytics service
  - Example: `https://analytics.example.com`
  - Required: No (marked as optional in type definition)

## Usage in Kubernetes

### Security Context

The container is designed to run with arbitrary UIDs in Kubernetes. It uses the **group permissions pattern** where files are owned by `root:root` but group-writable (GID 0). This allows any UID to run the container as long as it's in the root group.

**Important:** The container listens on port **8080** (not 80) to support non-root users.

See `.docker/k8s-deployment-example.yaml` for a complete example with proper security contexts.

### Environment Variables

To use these variables in a Kubernetes deployment, define them in a ConfigMap and reference them in your Deployment:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lightbridge-config
data:
  backendUrl: 'https://api.example.com'
  keycloakIssuer: 'https://keycloak.example.com/realms/lightbridge'
  keycloakClientId: 'lightbridge-ss'
  keycloakScheme: 'openid-connect'
  usageUrl: 'https://usage.example.com' # Optional
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lightbridge-ss
spec:
  template:
    spec:
      containers:
        - name: lightbridge-ss
          image: ghcr.io/adorsys-gis/converse-frontends:latest
          ports:
            - containerPort: 8080  # Container listens on 8080, not 80
              name: http
          env:
            - name: EXPO_PUBLIC_BACKEND_URL
              valueFrom:
                configMapKeyRef:
                  name: lightbridge-config
                  key: backendUrl
            - name: EXPO_PUBLIC_KEYCLOAK_ISSUER
              valueFrom:
                configMapKeyRef:
                  name: lightbridge-config
                  key: keycloakIssuer
            - name: EXPO_PUBLIC_KEYCLOAK_CLIENT_ID
              valueFrom:
                configMapKeyRef:
                  name: lightbridge-config
                  key: keycloakClientId
            - name: EXPO_PUBLIC_KEYCLOAK_SCHEME
              valueFrom:
                configMapKeyRef:
                  name: lightbridge-config
                  key: keycloakScheme
            - name: EXPO_PUBLIC_USAGE_URL
              valueFrom:
                configMapKeyRef:
                  name: lightbridge-config
                  key: usageUrl
```

## Local Development

For local development, you can set these variables in a `.env` file:

```
EXPO_PUBLIC_BACKEND_URL=https://api.example.com
EXPO_PUBLIC_KEYCLOAK_ISSUER=https://keycloak.example.com/realms/lightbridge
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=lightbridge-ss
EXPO_PUBLIC_KEYCLOAK_SCHEME=openid-connect
EXPO_PUBLIC_USAGE_URL=https://usage.example.com
```

## Verification

To verify that your configuration is correct, you can run the container locally and check the generated `config.json` file:

```bash
docker run -d --name lightbridge-ss \
  -p 8080:8080 \
  -e EXPO_PUBLIC_BACKEND_URL="https://api.example.com" \
  -e EXPO_PUBLIC_KEYCLOAK_ISSUER="https://keycloak.example.com/realms/lightbridge" \
  -e EXPO_PUBLIC_KEYCLOAK_CLIENT_ID="lightbridge-ss" \
  -e EXPO_PUBLIC_KEYCLOAK_SCHEME="openid-connect" \
  ghcr.io/adorsys-gis/converse-frontends:latest

# Check the generated config.json
docker exec lightbridge-ss cat /usr/share/nginx/html/config.json

# Access the app at http://localhost:8080
```

This will show the actual configuration being used by the app.
