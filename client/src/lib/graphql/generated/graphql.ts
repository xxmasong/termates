/* eslint-disable */
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type ActivityEvent = {
  __typename?: 'ActivityEvent';
  agentId?: Maybe<Scalars['String']['output']>;
  agentName?: Maybe<Scalars['String']['output']>;
  detail: Scalars['String']['output'];
  event: Scalars['String']['output'];
  fromAgent?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  message?: Maybe<Scalars['String']['output']>;
  projectId: Scalars['ID']['output'];
  timestamp: Scalars['String']['output'];
  toAgent?: Maybe<Scalars['String']['output']>;
};

export type Agent = {
  __typename?: 'Agent';
  autocompact?: Maybe<Scalars['String']['output']>;
  cli: AgentCli;
  cwd: Scalars['String']['output'];
  effort?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  model?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  permissionMode?: Maybe<Scalars['String']['output']>;
  /** The last lines of the terminal. */
  preview: Scalars['String']['output'];
  projectId: Scalars['ID']['output'];
  remoteControl: Scalars['Boolean']['output'];
  role?: Maybe<Scalars['String']['output']>;
  /** Live status from the daemon. */
  status: AgentStatus;
  teammates: Array<Teammate>;
  thinking?: Maybe<Scalars['String']['output']>;
};

export type AgentCli =
  | 'CLAUDE'
  | 'CODEX'
  | 'GEMINI';

export type AgentStatus =
  | 'AWAITING_INPUT'
  | 'IDLE'
  | 'RUNNING'
  | 'STOPPED';

export type AgentStatusEvent = {
  __typename?: 'AgentStatusEvent';
  agentId: Scalars['ID']['output'];
  status: AgentStatus;
};

export type ContentUpdatedEvent = {
  __typename?: 'ContentUpdatedEvent';
  filename: Scalars['String']['output'];
  projectId: Scalars['ID']['output'];
};

export type CreateAgentInput = {
  cli: AgentCli;
  cwd?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  remoteControl?: InputMaybe<Scalars['Boolean']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
};

export type CreateProjectInput = {
  cwd: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

/** A shared file or wiki page. */
export type Doc = {
  __typename?: 'Doc';
  content: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
};

export type MessageResult = {
  __typename?: 'MessageResult';
  delivered: Scalars['Boolean']['output'];
  toAgentId: Scalars['ID']['output'];
  toAgentName: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createAgent: Agent;
  createProject: Project;
  createSharedFile: Doc;
  deleteAgent: Scalars['Boolean']['output'];
  deleteProject: Scalars['Boolean']['output'];
  deleteSharedFile: Scalars['Boolean']['output'];
  initializeWiki: Scalars['Boolean']['output'];
  restartAgent: Agent;
  saveSharedFile: Doc;
  saveWikiPage: Doc;
  sendMessage: MessageResult;
  startAgent: Agent;
  stopAgent: Agent;
  updateAgent: Agent;
  updateProject: Project;
};


export type MutationCreateAgentArgs = {
  input: CreateAgentInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationCreateSharedFileArgs = {
  content?: InputMaybe<Scalars['String']['input']>;
  filename: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationDeleteAgentArgs = {
  id: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
  removeData?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationDeleteSharedFileArgs = {
  filename: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationInitializeWikiArgs = {
  projectId: Scalars['ID']['input'];
};


export type MutationRestartAgentArgs = {
  id: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationSaveSharedFileArgs = {
  content: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationSaveWikiPageArgs = {
  content: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationSendMessageArgs = {
  input: SendMessageInput;
};


export type MutationStartAgentArgs = {
  id: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationStopAgentArgs = {
  id: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationUpdateAgentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAgentInput;
  projectId: Scalars['ID']['input'];
};


export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProjectInput;
};

export type Project = {
  __typename?: 'Project';
  activity: Array<ActivityEvent>;
  agentCount: Scalars['Int']['output'];
  agents: Array<Agent>;
  createdAt: Scalars['String']['output'];
  cwd: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  sharedFiles: Array<Doc>;
  wiki: Array<Doc>;
  wikiInitialized: Scalars['Boolean']['output'];
};


export type ProjectActivityArgs = {
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type Query = {
  __typename?: 'Query';
  activity: Array<ActivityEvent>;
  agent?: Maybe<Agent>;
  project?: Maybe<Project>;
  projects: Array<Project>;
  sharedFile: Doc;
  wikiPage: Doc;
};


export type QueryActivityArgs = {
  last?: InputMaybe<Scalars['Int']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryAgentArgs = {
  id: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySharedFileArgs = {
  filename: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type QueryWikiPageArgs = {
  filename: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};

export type SendMessageInput = {
  fromAgentId: Scalars['ID']['input'];
  fromAgentName?: InputMaybe<Scalars['String']['input']>;
  message: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  target: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  activity: ActivityEvent;
  /** Every agent status change in this workspace. */
  agentStatus: AgentStatusEvent;
  contentUpdated: ContentUpdatedEvent;
  /** Projects or agents were created or changed (e.g. by the Keeper). */
  orgChanged: Scalars['Boolean']['output'];
};


export type SubscriptionActivityArgs = {
  projectId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionContentUpdatedArgs = {
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

export type Teammate = {
  __typename?: 'Teammate';
  cli: AgentCli;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  role?: Maybe<Scalars['String']['output']>;
  status: AgentStatus;
};

export type UpdateAgentInput = {
  autocompact?: InputMaybe<Scalars['String']['input']>;
  cwd?: InputMaybe<Scalars['String']['input']>;
  effort?: InputMaybe<Scalars['String']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  permissionMode?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
  thinking?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectInput = {
  cwd?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type LiveAgentStatusSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type LiveAgentStatusSubscription = { __typename?: 'Subscription', agentStatus: { __typename?: 'AgentStatusEvent', agentId: string } };

export type LiveContentUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type LiveContentUpdatedSubscription = { __typename?: 'Subscription', contentUpdated: { __typename?: 'ContentUpdatedEvent', projectId: string } };

export type LiveOrgChangedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type LiveOrgChangedSubscription = { __typename?: 'Subscription', orgChanged: boolean };

export type ProjectAgentSummariesQueryVariables = Exact<{ [key: string]: never; }>;


export type ProjectAgentSummariesQuery = { __typename?: 'Query', projects: Array<{ __typename?: 'Project', id: string, agents: Array<{ __typename?: 'Agent', status: AgentStatus }> }> };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const LiveAgentStatusDocument = new TypedDocumentString(`
    subscription LiveAgentStatus {
  agentStatus {
    agentId
  }
}
    `) as unknown as TypedDocumentString<LiveAgentStatusSubscription, LiveAgentStatusSubscriptionVariables>;
export const LiveContentUpdatedDocument = new TypedDocumentString(`
    subscription LiveContentUpdated {
  contentUpdated {
    projectId
  }
}
    `) as unknown as TypedDocumentString<LiveContentUpdatedSubscription, LiveContentUpdatedSubscriptionVariables>;
export const LiveOrgChangedDocument = new TypedDocumentString(`
    subscription LiveOrgChanged {
  orgChanged
}
    `) as unknown as TypedDocumentString<LiveOrgChangedSubscription, LiveOrgChangedSubscriptionVariables>;
export const ProjectAgentSummariesDocument = new TypedDocumentString(`
    query ProjectAgentSummaries {
  projects {
    id
    agents {
      status
    }
  }
}
    `) as unknown as TypedDocumentString<ProjectAgentSummariesQuery, ProjectAgentSummariesQueryVariables>;