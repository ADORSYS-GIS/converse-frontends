import type { JsonValue } from "./runtime";

export interface PageInfo {
  limit?: number;
  offset?: number;
  hasNext?: boolean;
  nextOffset?: number | null;
  total?: number | null;
}

export interface Page<T> {
  items: T[];
  pageInfo?: PageInfo;
}

export interface RotateApiKeyInput {
  keyId: string;
}

export interface ApiKeySecret {
  id: string;
  projectId: string;
  name: string;
  keyPrefix: string;
  status: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  lastIp?: string | null;
  revokedAt?: string | null;
  billingPlan: string;
  createdAt: string;
  updatedAt: string;
  secret: string;
  oauth2Url?: string | null;
}

export interface CreateAccountInput {
  billingIdentity: string;
}

export interface CreateApiKeyInput {
  projectId: string;
  name: string;
  expiresAt?: string | null;
  billingPlan: string;
}

export interface RevokeApiKeyInput {
  keyId: string;
}

export interface AddAccountMemberInput {
  accountId: string;
  subject: string;
}

export interface RemoveAccountMemberInput {
  accountId: string;
  subject: string;
}

export interface AccountStatusInput {
  accountId: string;
}

export interface ProjectStatusInput {
  projectId: string;
}

export interface Account {
  createdAt?: string;
  updatedAt?: string;
  id?: string;
  billingIdentity?: string;
  status?: string;
  projects?: Project[];
  memberships?: AccountMembership[];
}

export interface UpdateAccountInput {
  createdAt?: string;
  updatedAt?: string;
  billingIdentity?: string;
  status?: string;
}

export interface Project {
  createdAt?: string;
  updatedAt?: string;
  id?: string;
  accountId?: string;
  name?: string;
  allowedModels?: JsonValue | null;
  defaultLimits?: JsonValue;
  billingPlan?: string;
  status?: string;
  account?: Account;
  apiKeys?: ApiKey[];
}

export interface CreateProjectInput {
  id: string;
  accountId: string;
  name: string;
  allowedModels?: JsonValue | null;
  defaultLimits: JsonValue;
  billingPlan: string;
  status: string;
}

export interface UpdateProjectInput {
  createdAt?: string;
  updatedAt?: string;
  accountId?: string;
  name?: string;
  allowedModels?: JsonValue | null;
  defaultLimits?: JsonValue;
  billingPlan?: string;
  status?: string;
}

export interface ApiKey {
  createdAt?: string;
  updatedAt?: string;
  id?: string;
  projectId?: string;
  name?: string;
  keyPrefix?: string;
  status?: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  lastIp?: string | null;
  revokedAt?: string | null;
  deletedAt?: string | null;
  billingPlan?: string;
  project?: Project;
}

export interface UpdateApiKeyInput {
  createdAt?: string;
  updatedAt?: string;
  projectId?: string;
  name?: string;
  keyPrefix?: string;
  status?: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  lastIp?: string | null;
  revokedAt?: string | null;
  deletedAt?: string | null;
  billingPlan?: string;
}

export interface AccountMembership {
  id?: string;
  accountId?: string;
  subject?: string;
  createdAt?: string;
  account?: Account;
}

export interface UpdateAccountMembershipInput {
  accountId?: string;
  subject?: string;
  createdAt?: string;
}

export interface RotateApiKeyArgs {
  args: RotateApiKeyInput;
}

export interface CreateAccountArgs {
  args: CreateAccountInput;
}

export interface CreateApiKeyArgs {
  args: CreateApiKeyInput;
}

export interface RevokeApiKeyArgs {
  args: RevokeApiKeyInput;
}

export interface AddAccountMemberArgs {
  args: AddAccountMemberInput;
}

export interface RemoveAccountMemberArgs {
  args: RemoveAccountMemberInput;
}

export interface DisableAccountArgs {
  args: AccountStatusInput;
}

export interface EnableAccountArgs {
  args: AccountStatusInput;
}

export interface DisableProjectArgs {
  args: ProjectStatusInput;
}

export interface EnableProjectArgs {
  args: ProjectStatusInput;
}

