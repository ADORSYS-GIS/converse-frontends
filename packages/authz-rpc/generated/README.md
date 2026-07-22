# @lightbridge/authz-rpc

Generated CrateStack TypeScript client with a fetch transport and TanStack Query hooks.

```ts
import { LightbridgeAuthzRpcClient } from "@lightbridge/authz-rpc";

const client = new LightbridgeAuthzRpcClient("https://api.example.com");
```

The generated client uses `/api` as its API base path by default.

## Runtime Setup

```ts
const client = new LightbridgeAuthzRpcClient("https://api.example.com", {
  basePath: "/api",
  headers: async () => ({
    authorization: `Bearer ${await tokenStore.getAccessToken()}`,
    "x-request-id": crypto.randomUUID(),
  }),
});
```

Per-call headers are also supported:

```ts
const headers = {
  authorization: `Bearer ${accessToken}`,
  "idempotency-key": idempotencyKey,
};
```

## Models

- `client.accounts`
- `client.projects`
- `client.apiKeys`
- `client.accountMemberships`

### List

```ts
const pageOrItems = await client.accounts.list({
  query: {
    fields: ["id"],
    include: [],
    includeFields: {},
    limit: 20,
    offset: 0,
    sort: ["-id"],
  },
});
```

### Detail

```ts
const item = await client.accounts.get(id, {
  query: {
    fields: ["id"],
  },
  headers,
});
```

### Create, Update, Delete

```ts
const created = await client.accounts.create(input, { headers });
const updated = await client.accounts.update(created.id, patch, { headers });
await client.accounts.delete(updated.id, { headers });
```

## Procedures

- `client.procedures.rotateApiKey`
- `client.procedures.createAccount`
- `client.procedures.createApiKey`
- `client.procedures.revokeApiKey`
- `client.procedures.addAccountMember`
- `client.procedures.removeAccountMember`
- `client.procedures.disableAccount`
- `client.procedures.enableAccount`
- `client.procedures.disableProject`
- `client.procedures.enableProject`

```ts
const result = await client.procedures.rotateApiKey(args, {
  headers,
});
```

## TanStack Query

```tsx
import {
  LightbridgeAuthzRpcClient,
  useAccountListQuery,
  useCreateAccountMutation,
} from "@lightbridge/authz-rpc";

function AccountList({ client }: { client: LightbridgeAuthzRpcClient }) {
  const list = useAccountListQuery(client, {
    query: {
      fields: ["id"],
      limit: 20,
    },
    queryOptions: {
      staleTime: 30_000,
    },
  });

  const create = useCreateAccountMutation(client);

  if (list.isPending) {
    return null;
  }
  if (list.isError) {
    return <ErrorState error={list.error} />;
  }

  return <ListView data={list.data} onCreate={(input) => create.mutate(input)} />;
}
```

## React Native

React Native app runtimes provide `fetch`; pass the mobile API origin and keep auth token lookup in your app layer.

```ts
export function createClient(accessToken: string | null) {
  return new LightbridgeAuthzRpcClient(process.env.EXPO_PUBLIC_API_ORIGIN!, {
    basePath: "/api",
    headers: {
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      "x-client": "sample-mobile",
    },
  });
}
```