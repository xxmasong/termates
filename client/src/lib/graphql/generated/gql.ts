/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  subscription LiveAgentStatus {\n    agentStatus {\n      agentId\n    }\n  }\n": typeof types.LiveAgentStatusDocument,
    "\n  subscription LiveContentUpdated {\n    contentUpdated {\n      projectId\n    }\n  }\n": typeof types.LiveContentUpdatedDocument,
    "\n  subscription LiveOrgChanged {\n    orgChanged\n  }\n": typeof types.LiveOrgChangedDocument,
    "\n  query ProjectAgentSummaries {\n    projects {\n      id\n      agents {\n        status\n      }\n    }\n  }\n": typeof types.ProjectAgentSummariesDocument,
};
const documents: Documents = {
    "\n  subscription LiveAgentStatus {\n    agentStatus {\n      agentId\n    }\n  }\n": types.LiveAgentStatusDocument,
    "\n  subscription LiveContentUpdated {\n    contentUpdated {\n      projectId\n    }\n  }\n": types.LiveContentUpdatedDocument,
    "\n  subscription LiveOrgChanged {\n    orgChanged\n  }\n": types.LiveOrgChangedDocument,
    "\n  query ProjectAgentSummaries {\n    projects {\n      id\n      agents {\n        status\n      }\n    }\n  }\n": types.ProjectAgentSummariesDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription LiveAgentStatus {\n    agentStatus {\n      agentId\n    }\n  }\n"): typeof import('./graphql').LiveAgentStatusDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription LiveContentUpdated {\n    contentUpdated {\n      projectId\n    }\n  }\n"): typeof import('./graphql').LiveContentUpdatedDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription LiveOrgChanged {\n    orgChanged\n  }\n"): typeof import('./graphql').LiveOrgChangedDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProjectAgentSummaries {\n    projects {\n      id\n      agents {\n        status\n      }\n    }\n  }\n"): typeof import('./graphql').ProjectAgentSummariesDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
