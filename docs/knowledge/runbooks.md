# Runbooks — Converse-frontends

> Sources: `charts/converse-frontend/values.yaml`, `Dockerfile`, `AGENTS.md`, `openapi/`

Actionable, step-by-step instructions for common operational tasks and incidents. Each runbook is:
- Single-purpose (5–10 min to execute)
- Tied to specific failure modes observable in the system
- Based on what is defined in this codebase

---

## Index

- [Rollback to a Previous Image](#rollback-to-a-previous-image)
- [Pod Not Starting / CrashLoopBackOff](#pod-not-starting--crashloopbackoff)
- [Config Not Applied at Runtime](#config-not-applied-at-runtime)
- [API Calls Returning 401 Unauthorized](#api-calls-returning-401-unauthorized)
- [API Calls Returning 403 Forbidden](#api-calls-returning-403-forbidden)
- [Login / OAuth2 Redirect Failing](#login--oauth2-redirect-failing)
- [Usage Tab Shows No Data](#usage-tab-shows-no-data)
- [Rebuild and Push Docker Image Manually](#rebuild-and-push-docker-image-manually)

---

## Rollback to a Previous Image

**Severity:** P2
**Related:** Helm deployment, `docker-image.yml` workflow

**1) Context**
A recent deployment introduced a regression. The previous image tag must be restored.

**2) Immediate Actions (Mitigation)**

```bash
# Find the previous revision
helm history converse-frontend -n <namespace>

# Roll back to the previous revision
helm rollback converse-frontend <revision> -n <namespace>

# Or pin a specific image tag
helm upgrade converse-frontend ./charts/converse-frontend \
  -n <namespace> \
  --set conversefrontend.controllers.main.containers.frontend.image.tag=sha-<previous-sha>
```

**3) Diagnosis**
```bash
kubectl get pods -n <namespace> -l app=converse-frontend-app
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
```

**4) Validation**
- Pods reach `Running` and `Ready` state
- Health check endpoint responds: `curl http://<pod-ip>/`

---

## Pod Not Starting / CrashLoopBackOff

**Severity:** P1

**1) Context**
The container is crashing on startup. Most likely cause: `entrypoint.sh` fails due to a missing or malformed environment variable.

**2) Diagnosis**
```bash
kubectl logs <pod-name> -n <namespace> --previous
kubectl describe pod <pod-name> -n <namespace>
```

Look for: `envsubst` errors, missing `config.template.json`, or nginx startup failures.

**3) Remediation**

Check that all required environment variables are set in the Helm values:
- `EXPO_PUBLIC_BACKEND_URL`
- `EXPO_PUBLIC_USAGE_URL`
- `EXPO_PUBLIC_KEYCLOAK_ISSUER`
- `EXPO_PUBLIC_KEYCLOAK_CLIENT_ID`

```bash
kubectl get deployment converse-frontend -n <namespace> -o jsonpath='{.spec.template.spec.containers[0].env}'
```

Fix the missing variable in Helm values, then re-deploy:
```bash
helm upgrade converse-frontend ./charts/converse-frontend -n <namespace> -f values-prod.yaml
```

**4) Validation**
Pod transitions to `Running`. Liveness probe passes.

---

## Config Not Applied at Runtime

**Severity:** P2

**1) Context**
The app is loading but using wrong backend URLs or Keycloak config. The `config.json` in the container may be stale or incorrectly generated.

**2) Diagnosis**
```bash
# Exec into the running pod
kubectl exec -it <pod-name> -n <namespace> -- sh

# Check the generated config
cat /usr/share/nginx/html/config.json

# Check the template
cat /usr/share/nginx/html/config.template.json
```

**3) Remediation**
If the generated `config.json` content is wrong, the environment variables passed to the container are wrong. Update Helm values and redeploy:

```bash
helm upgrade converse-frontend ./charts/converse-frontend \
  -n <namespace> \
  --set 'conversefrontend.controllers.main.containers.frontend.env.EXPO_PUBLIC_BACKEND_URL=https://correct-url'
```

**4) Validation**
Re-exec into pod and confirm `config.json` contains the correct values.

---

## API Calls Returning 401 Unauthorized

**Severity:** P2

**1) Context**
The frontend is sending requests without a valid Bearer token, or the token has expired and refresh failed.

**2) Diagnosis**
- Open browser DevTools → Network tab → inspect request headers for `Authorization: Bearer ...`
- Check if `accessToken` is present in the browser's IndexedDB: DevTools → Application → IndexedDB → `lightbridge-web-storage` → `auth` → `lightbridge.auth.session`
- Check if the Keycloak issuer URL is reachable from the browser

**3) Remediation**
- If session is missing: user must log in again
- If token refresh is failing: verify `EXPO_PUBLIC_KEYCLOAK_ISSUER` is correct and the Keycloak realm is reachable
- If Keycloak is down: escalate to infrastructure team

**4) Validation**
After re-login, API calls succeed with `200 OK`.

---

## API Calls Returning 403 Forbidden

**Severity:** P3

**1) Context**
The user is authenticated but not authorized. Most common cause: the user's Keycloak account is not associated with the account/project they are trying to access.

**2) Diagnosis**
- Confirm the user's `sub` (Keycloak user ID) is in the `owners_admins` list of the target account
- Check via: `GET /api/v1/accounts/{account_id}` → inspect `owners_admins`

**3) Remediation**
- Add the user to `owners_admins` via `PATCH /api/v1/accounts/{account_id}` with:
```json
{ "owners_admins": ["<existing-ids>", "<new-user-sub>"] }
```

**4) Validation**
Retry the failing operation — it should return `200`.

---

## Login / OAuth2 Redirect Failing

**Severity:** P1

**1) Context**
The user is stuck on the login screen or gets a redirect error. Possible causes:
- Keycloak is unreachable
- Redirect URI is not registered in the Keycloak client
- `EXPO_PUBLIC_KEYCLOAK_ISSUER` or `EXPO_PUBLIC_KEYCLOAK_CLIENT_ID` is wrong

**2) Diagnosis**
```bash
# Check Keycloak reachability (from inside the cluster or browser)
curl https://<EXPO_PUBLIC_KEYCLOAK_ISSUER>/.well-known/openid-configuration

# Check current env vars in the container
kubectl exec -it <pod-name> -n <namespace> -- cat /usr/share/nginx/html/config.json
```

**3) Remediation**
- If Keycloak unreachable: escalate to Keycloak/infra team
- If wrong redirect URI: register `https://self-service.ai.camer.digital/auth` as a valid redirect URI in the Keycloak client settings
- If wrong config values: fix Helm values and redeploy

**4) Validation**
Complete a login flow end-to-end in the browser.

---

## Usage Tab Shows No Data

**Severity:** P3

**1) Context**
The Usage tab renders "coming soon" — this is the **expected current state**. The `UsageView` (at `apps/self-service/src/views/usage-view.tsx`) only renders a placeholder; the UI has not been connected to the `useQueryUsage` hook yet.

**Action:** No incident action needed. This is a known feature gap. Track via the relevant GitHub issue.

**2) If usage is implemented and data is missing:**
- Verify `EXPO_PUBLIC_USAGE_URL` is correctly set
- Verify the current project ID is set (the hook only fires when `project.id` is available)
- Check browser DevTools → Network for the `POST /usage/v1/usage/query` request
- Confirm the LightBridge Usage backend is receiving OTEL data from the AI gateway

---

## Rebuild and Push Docker Image Manually

**Severity:** P4 (operational task)

**1) Trigger**
Manual image rebuild is needed outside of the CI pipeline.

**2) Steps**

```bash
# Authenticate to GHCR
echo $GHCR_TOKEN | docker login ghcr.io -u <github-username> --password-stdin

# Build multi-platform image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --push \
  -t ghcr.io/adorsys-gis/converse-frontends:manual-$(git rev-parse --short HEAD) \
  .
```

**3) Validation**
```bash
docker manifest inspect ghcr.io/adorsys-gis/converse-frontends:manual-<sha>
```
Confirm both `linux/amd64` and `linux/arm64` manifests are present.
