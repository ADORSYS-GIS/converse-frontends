import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { LightbridgeAuthzRpcClient } from "./client";
import type {
  RotateApiKeyInput,
  ApiKeySecret,
  CreateAccountInput,
  CreateApiKeyInput,
  RevokeApiKeyInput,
  AddAccountMemberInput,
  RemoveAccountMemberInput,
  AccountStatusInput,
  ProjectStatusInput,
  Account,
  UpdateAccountInput,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ApiKey,
  UpdateApiKeyInput,
  AccountMembership,
  UpdateAccountMembershipInput,
  RotateApiKeyArgs,
  CreateAccountArgs,
  CreateApiKeyArgs,
  RevokeApiKeyArgs,
  AddAccountMemberArgs,
  RemoveAccountMemberArgs,
  DisableAccountArgs,
  EnableAccountArgs,
  DisableProjectArgs,
  EnableProjectArgs,
  Page,
} from "./models";
import type { CratestackRpcCallOptions } from "./runtime";

export const cratestackQueryKeys = {
  accountList: (input?: Record<string, unknown>) => ["model.Account.list", input] as const,
  accountDetail: (id: string) => ["model.Account.get", id] as const,
  projectList: (input?: Record<string, unknown>) => ["model.Project.list", input] as const,
  projectDetail: (id: string) => ["model.Project.get", id] as const,
  apiKeyList: (input?: Record<string, unknown>) => ["model.ApiKey.list", input] as const,
  apiKeyDetail: (id: string) => ["model.ApiKey.get", id] as const,
  accountMembershipList: (input?: Record<string, unknown>) => ["model.AccountMembership.list", input] as const,
  accountMembershipDetail: (id: string) => ["model.AccountMembership.get", id] as const,
};

export function useAccountListQuery(
  client: LightbridgeAuthzRpcClient,
  input: Record<string, unknown> = {},
  options: CratestackRpcCallOptions & {
    queryOptions?: Omit<UseQueryOptions<Account[]>, "queryKey" | "queryFn">;
  } = {},
) {
  return useQuery({
    ...options.queryOptions,
    queryKey: cratestackQueryKeys.accountList(input),
    queryFn: ({ signal }) => client.accounts.list(input, { ...options, signal }),
  });
}

export function useAccountQuery(
  client: LightbridgeAuthzRpcClient,
  id: string,
  options: CratestackRpcCallOptions & {
    queryOptions?: Omit<UseQueryOptions<Account>, "queryKey" | "queryFn">;
  } = {},
) {
  return useQuery({
    ...options.queryOptions,
    queryKey: cratestackQueryKeys.accountDetail(id),
    queryFn: ({ signal }) => client.accounts.get(id, { ...options, signal }),
  });
}

export function useUpdateAccountMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<Account, Error, { id: string; input: UpdateAccountInput }>,
) {
  return useMutation({
    ...options,
    mutationKey: ["accountUpdate"],
    mutationFn: ({ id, input }) => client.accounts.update(id, input),
  });
}

export function useDeleteAccountMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<void, Error, { id: string }>,
) {
  return useMutation({
    ...options,
    mutationKey: ["accountDelete"],
    mutationFn: ({ id }) => client.accounts.delete(id),
  });
}

export function useProjectListQuery(
  client: LightbridgeAuthzRpcClient,
  input: Record<string, unknown> = {},
  options: CratestackRpcCallOptions & {
    queryOptions?: Omit<UseQueryOptions<Project[]>, "queryKey" | "queryFn">;
  } = {},
) {
  return useQuery({
    ...options.queryOptions,
    queryKey: cratestackQueryKeys.projectList(input),
    queryFn: ({ signal }) => client.projects.list(input, { ...options, signal }),
  });
}

export function useProjectQuery(
  client: LightbridgeAuthzRpcClient,
  id: string,
  options: CratestackRpcCallOptions & {
    queryOptions?: Omit<UseQueryOptions<Project>, "queryKey" | "queryFn">;
  } = {},
) {
  return useQuery({
    ...options.queryOptions,
    queryKey: cratestackQueryKeys.projectDetail(id),
    queryFn: ({ signal }) => client.projects.get(id, { ...options, signal }),
  });
}

export function useCreateProjectMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<Project, Error, CreateProjectInput>,
) {
  return useMutation({
    ...options,
    mutationKey: ["projectCreate"],
    mutationFn: (input) => client.projects.create(input),
  });
}

export function useUpdateProjectMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<Project, Error, { id: string; input: UpdateProjectInput }>,
) {
  return useMutation({
    ...options,
    mutationKey: ["projectUpdate"],
    mutationFn: ({ id, input }) => client.projects.update(id, input),
  });
}

export function useDeleteProjectMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<void, Error, { id: string }>,
) {
  return useMutation({
    ...options,
    mutationKey: ["projectDelete"],
    mutationFn: ({ id }) => client.projects.delete(id),
  });
}

export function useApiKeyListQuery(
  client: LightbridgeAuthzRpcClient,
  input: Record<string, unknown> = {},
  options: CratestackRpcCallOptions & {
    queryOptions?: Omit<UseQueryOptions<ApiKey[]>, "queryKey" | "queryFn">;
  } = {},
) {
  return useQuery({
    ...options.queryOptions,
    queryKey: cratestackQueryKeys.apiKeyList(input),
    queryFn: ({ signal }) => client.apiKeys.list(input, { ...options, signal }),
  });
}

export function useApiKeyQuery(
  client: LightbridgeAuthzRpcClient,
  id: string,
  options: CratestackRpcCallOptions & {
    queryOptions?: Omit<UseQueryOptions<ApiKey>, "queryKey" | "queryFn">;
  } = {},
) {
  return useQuery({
    ...options.queryOptions,
    queryKey: cratestackQueryKeys.apiKeyDetail(id),
    queryFn: ({ signal }) => client.apiKeys.get(id, { ...options, signal }),
  });
}

export function useUpdateApiKeyMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<ApiKey, Error, { id: string; input: UpdateApiKeyInput }>,
) {
  return useMutation({
    ...options,
    mutationKey: ["apiKeyUpdate"],
    mutationFn: ({ id, input }) => client.apiKeys.update(id, input),
  });
}

export function useDeleteApiKeyMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<void, Error, { id: string }>,
) {
  return useMutation({
    ...options,
    mutationKey: ["apiKeyDelete"],
    mutationFn: ({ id }) => client.apiKeys.delete(id),
  });
}

export function useAccountMembershipListQuery(
  client: LightbridgeAuthzRpcClient,
  input: Record<string, unknown> = {},
  options: CratestackRpcCallOptions & {
    queryOptions?: Omit<UseQueryOptions<AccountMembership[]>, "queryKey" | "queryFn">;
  } = {},
) {
  return useQuery({
    ...options.queryOptions,
    queryKey: cratestackQueryKeys.accountMembershipList(input),
    queryFn: ({ signal }) => client.accountMemberships.list(input, { ...options, signal }),
  });
}

export function useAccountMembershipQuery(
  client: LightbridgeAuthzRpcClient,
  id: string,
  options: CratestackRpcCallOptions & {
    queryOptions?: Omit<UseQueryOptions<AccountMembership>, "queryKey" | "queryFn">;
  } = {},
) {
  return useQuery({
    ...options.queryOptions,
    queryKey: cratestackQueryKeys.accountMembershipDetail(id),
    queryFn: ({ signal }) => client.accountMemberships.get(id, { ...options, signal }),
  });
}

export function useUpdateAccountMembershipMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<AccountMembership, Error, { id: string; input: UpdateAccountMembershipInput }>,
) {
  return useMutation({
    ...options,
    mutationKey: ["accountMembershipUpdate"],
    mutationFn: ({ id, input }) => client.accountMemberships.update(id, input),
  });
}

export function useDeleteAccountMembershipMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<void, Error, { id: string }>,
) {
  return useMutation({
    ...options,
    mutationKey: ["accountMembershipDelete"],
    mutationFn: ({ id }) => client.accountMemberships.delete(id),
  });
}

export function useRotateApiKeyMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<ApiKeySecret, Error, RotateApiKeyArgs>,
) {
  return useMutation({
    ...options,
    mutationKey: ["rotateApiKeyProcedure"],
    mutationFn: (args) => client.procedures.rotateApiKey(args),
  });
}

export function useCreateAccountMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<Account, Error, CreateAccountArgs>,
) {
  return useMutation({
    ...options,
    mutationKey: ["createAccountProcedure"],
    mutationFn: (args) => client.procedures.createAccount(args),
  });
}

export function useCreateApiKeyMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<ApiKeySecret, Error, CreateApiKeyArgs>,
) {
  return useMutation({
    ...options,
    mutationKey: ["createApiKeyProcedure"],
    mutationFn: (args) => client.procedures.createApiKey(args),
  });
}

export function useRevokeApiKeyMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<ApiKey, Error, RevokeApiKeyArgs>,
) {
  return useMutation({
    ...options,
    mutationKey: ["revokeApiKeyProcedure"],
    mutationFn: (args) => client.procedures.revokeApiKey(args),
  });
}

export function useAddAccountMemberMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<Account, Error, AddAccountMemberArgs>,
) {
  return useMutation({
    ...options,
    mutationKey: ["addAccountMemberProcedure"],
    mutationFn: (args) => client.procedures.addAccountMember(args),
  });
}

export function useRemoveAccountMemberMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<Account, Error, RemoveAccountMemberArgs>,
) {
  return useMutation({
    ...options,
    mutationKey: ["removeAccountMemberProcedure"],
    mutationFn: (args) => client.procedures.removeAccountMember(args),
  });
}

export function useDisableAccountMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<Account, Error, DisableAccountArgs>,
) {
  return useMutation({
    ...options,
    mutationKey: ["disableAccountProcedure"],
    mutationFn: (args) => client.procedures.disableAccount(args),
  });
}

export function useEnableAccountMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<Account, Error, EnableAccountArgs>,
) {
  return useMutation({
    ...options,
    mutationKey: ["enableAccountProcedure"],
    mutationFn: (args) => client.procedures.enableAccount(args),
  });
}

export function useDisableProjectMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<Project, Error, DisableProjectArgs>,
) {
  return useMutation({
    ...options,
    mutationKey: ["disableProjectProcedure"],
    mutationFn: (args) => client.procedures.disableProject(args),
  });
}

export function useEnableProjectMutation(
  client: LightbridgeAuthzRpcClient,
  options?: UseMutationOptions<Project, Error, EnableProjectArgs>,
) {
  return useMutation({
    ...options,
    mutationKey: ["enableProjectProcedure"],
    mutationFn: (args) => client.procedures.enableProject(args),
  });
}

