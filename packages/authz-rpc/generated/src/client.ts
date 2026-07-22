import {
  CratestackRpcRuntime,
  type CratestackRpcCallOptions,
  type CratestackRpcClientOptions,
} from "./runtime";
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

export class LightbridgeAuthzRpcClient {
  readonly runtime: CratestackRpcRuntime;
  readonly procedures: ProceduresApi;
  readonly accounts: AccountApi;
  readonly projects: ProjectApi;
  readonly apiKeys: ApiKeyApi;
  readonly accountMemberships: AccountMembershipApi;

  constructor(originOrRuntime: string | CratestackRpcRuntime, options: CratestackRpcClientOptions = {}) {
    this.runtime = typeof originOrRuntime === "string"
      ? new CratestackRpcRuntime(originOrRuntime, options)
      : originOrRuntime;
    this.procedures = new ProceduresApi(this.runtime);
    this.accounts = new AccountApi(this.runtime);
    this.projects = new ProjectApi(this.runtime);
    this.apiKeys = new ApiKeyApi(this.runtime);
    this.accountMemberships = new AccountMembershipApi(this.runtime);
  }
}

export class AccountApi {
  constructor(private readonly runtime: CratestackRpcRuntime) {}

  list(input: Record<string, unknown> = {}, options: CratestackRpcCallOptions = {}): Promise<Account[]> {
    return this.runtime.call<Record<string, unknown>, Account[]>(
      "model.Account.list",
      input,
      options,
    );
  }

  get(id: string, options: CratestackRpcCallOptions = {}): Promise<Account> {
    return this.runtime.call<{ id: string }, Account>(
      "model.Account.get",
      { id },
      options,
    );
  }

  update(
    id: string,
    patch: UpdateAccountInput,
    options: CratestackRpcCallOptions = {},
  ): Promise<Account> {
    return this.runtime.call<{ id: string; patch: UpdateAccountInput }, Account>(
      "model.Account.update",
      { id, patch },
      options,
    );
  }

  delete(id: string, options: CratestackRpcCallOptions = {}): Promise<void> {
    return this.runtime.call<{ id: string }, void>(
      "model.Account.delete",
      { id },
      options,
    );
  }
}

export class ProjectApi {
  constructor(private readonly runtime: CratestackRpcRuntime) {}

  list(input: Record<string, unknown> = {}, options: CratestackRpcCallOptions = {}): Promise<Project[]> {
    return this.runtime.call<Record<string, unknown>, Project[]>(
      "model.Project.list",
      input,
      options,
    );
  }

  get(id: string, options: CratestackRpcCallOptions = {}): Promise<Project> {
    return this.runtime.call<{ id: string }, Project>(
      "model.Project.get",
      { id },
      options,
    );
  }

  create(input: CreateProjectInput, options: CratestackRpcCallOptions = {}): Promise<Project> {
    return this.runtime.call<CreateProjectInput, Project>(
      "model.Project.create",
      input,
      options,
    );
  }

  update(
    id: string,
    patch: UpdateProjectInput,
    options: CratestackRpcCallOptions = {},
  ): Promise<Project> {
    return this.runtime.call<{ id: string; patch: UpdateProjectInput }, Project>(
      "model.Project.update",
      { id, patch },
      options,
    );
  }

  delete(id: string, options: CratestackRpcCallOptions = {}): Promise<void> {
    return this.runtime.call<{ id: string }, void>(
      "model.Project.delete",
      { id },
      options,
    );
  }
}

export class ApiKeyApi {
  constructor(private readonly runtime: CratestackRpcRuntime) {}

  list(input: Record<string, unknown> = {}, options: CratestackRpcCallOptions = {}): Promise<ApiKey[]> {
    return this.runtime.call<Record<string, unknown>, ApiKey[]>(
      "model.ApiKey.list",
      input,
      options,
    );
  }

  get(id: string, options: CratestackRpcCallOptions = {}): Promise<ApiKey> {
    return this.runtime.call<{ id: string }, ApiKey>(
      "model.ApiKey.get",
      { id },
      options,
    );
  }

  update(
    id: string,
    patch: UpdateApiKeyInput,
    options: CratestackRpcCallOptions = {},
  ): Promise<ApiKey> {
    return this.runtime.call<{ id: string; patch: UpdateApiKeyInput }, ApiKey>(
      "model.ApiKey.update",
      { id, patch },
      options,
    );
  }

  delete(id: string, options: CratestackRpcCallOptions = {}): Promise<void> {
    return this.runtime.call<{ id: string }, void>(
      "model.ApiKey.delete",
      { id },
      options,
    );
  }
}

export class AccountMembershipApi {
  constructor(private readonly runtime: CratestackRpcRuntime) {}

  list(input: Record<string, unknown> = {}, options: CratestackRpcCallOptions = {}): Promise<AccountMembership[]> {
    return this.runtime.call<Record<string, unknown>, AccountMembership[]>(
      "model.AccountMembership.list",
      input,
      options,
    );
  }

  get(id: string, options: CratestackRpcCallOptions = {}): Promise<AccountMembership> {
    return this.runtime.call<{ id: string }, AccountMembership>(
      "model.AccountMembership.get",
      { id },
      options,
    );
  }

  update(
    id: string,
    patch: UpdateAccountMembershipInput,
    options: CratestackRpcCallOptions = {},
  ): Promise<AccountMembership> {
    return this.runtime.call<{ id: string; patch: UpdateAccountMembershipInput }, AccountMembership>(
      "model.AccountMembership.update",
      { id, patch },
      options,
    );
  }

  delete(id: string, options: CratestackRpcCallOptions = {}): Promise<void> {
    return this.runtime.call<{ id: string }, void>(
      "model.AccountMembership.delete",
      { id },
      options,
    );
  }
}

export class ProceduresApi {
  constructor(private readonly runtime: CratestackRpcRuntime) {}

  rotateApiKey(args: RotateApiKeyArgs, options: CratestackRpcCallOptions = {}): Promise<ApiKeySecret> {
    return this.runtime.call<RotateApiKeyArgs, ApiKeySecret>(
      "procedure.rotateApiKey",
      args,
      options,
    );
  }

  createAccount(args: CreateAccountArgs, options: CratestackRpcCallOptions = {}): Promise<Account> {
    return this.runtime.call<CreateAccountArgs, Account>(
      "procedure.createAccount",
      args,
      options,
    );
  }

  createApiKey(args: CreateApiKeyArgs, options: CratestackRpcCallOptions = {}): Promise<ApiKeySecret> {
    return this.runtime.call<CreateApiKeyArgs, ApiKeySecret>(
      "procedure.createApiKey",
      args,
      options,
    );
  }

  revokeApiKey(args: RevokeApiKeyArgs, options: CratestackRpcCallOptions = {}): Promise<ApiKey> {
    return this.runtime.call<RevokeApiKeyArgs, ApiKey>(
      "procedure.revokeApiKey",
      args,
      options,
    );
  }

  addAccountMember(args: AddAccountMemberArgs, options: CratestackRpcCallOptions = {}): Promise<Account> {
    return this.runtime.call<AddAccountMemberArgs, Account>(
      "procedure.addAccountMember",
      args,
      options,
    );
  }

  removeAccountMember(args: RemoveAccountMemberArgs, options: CratestackRpcCallOptions = {}): Promise<Account> {
    return this.runtime.call<RemoveAccountMemberArgs, Account>(
      "procedure.removeAccountMember",
      args,
      options,
    );
  }

  disableAccount(args: DisableAccountArgs, options: CratestackRpcCallOptions = {}): Promise<Account> {
    return this.runtime.call<DisableAccountArgs, Account>(
      "procedure.disableAccount",
      args,
      options,
    );
  }

  enableAccount(args: EnableAccountArgs, options: CratestackRpcCallOptions = {}): Promise<Account> {
    return this.runtime.call<EnableAccountArgs, Account>(
      "procedure.enableAccount",
      args,
      options,
    );
  }

  disableProject(args: DisableProjectArgs, options: CratestackRpcCallOptions = {}): Promise<Project> {
    return this.runtime.call<DisableProjectArgs, Project>(
      "procedure.disableProject",
      args,
      options,
    );
  }

  enableProject(args: EnableProjectArgs, options: CratestackRpcCallOptions = {}): Promise<Project> {
    return this.runtime.call<EnableProjectArgs, Project>(
      "procedure.enableProject",
      args,
      options,
    );
  }

}