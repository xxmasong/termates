/**
 * limits.ts — validation rules that bound what one GraphQL document may ask
 * for: nesting depth and alias fan-out (cheap DoS guards), and no schema
 * introspection in production (codegen reads the SDL from the repo).
 */

import {
  GraphQLError,
  Kind,
  NoSchemaIntrospectionCustomRule,
  type ASTVisitor,
  type FieldNode,
  type FragmentDefinitionNode,
  type SelectionSetNode,
  type ValidationContext,
  type ValidationRule,
} from 'graphql';

export const MAX_DEPTH = 8;
export const MAX_FIELDS = 300;

function measure(
  set: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>,
  depth: number,
  seen: Set<string>,
  tally: { fields: number; depth: number },
): void {
  tally.depth = Math.max(tally.depth, depth);
  for (const selection of set.selections) {
    if (selection.kind === Kind.FIELD) {
      tally.fields += 1;
      const field = selection as FieldNode;
      if (field.selectionSet) measure(field.selectionSet, fragments, depth + 1, seen, tally);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      measure(selection.selectionSet, fragments, depth, seen, tally);
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const name = selection.name.value;
      const fragment = fragments[name];
      if (fragment && !seen.has(name)) {
        seen.add(name);
        measure(fragment.selectionSet, fragments, depth, seen, tally);
        seen.delete(name);
      }
    }
  }
}

/** Reject operations nested deeper than MAX_DEPTH or selecting more than MAX_FIELDS fields. */
export const QueryLimitsRule: ValidationRule = (context: ValidationContext): ASTVisitor => {
  const fragments: Record<string, FragmentDefinitionNode> = {};
  for (const definition of context.getDocument().definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) fragments[definition.name.value] = definition;
  }
  return {
    OperationDefinition(node) {
      const tally = { fields: 0, depth: 0 };
      measure(node.selectionSet, fragments, 1, new Set(), tally);
      if (tally.depth > MAX_DEPTH) {
        context.reportError(
          new GraphQLError(`Query is nested too deeply (max ${MAX_DEPTH}).`, { nodes: [node] }),
        );
      }
      if (tally.fields > MAX_FIELDS) {
        context.reportError(
          new GraphQLError(`Query selects too many fields (max ${MAX_FIELDS}).`, { nodes: [node] }),
        );
      }
    },
  };
};

export const productionRules = (): ValidationRule[] =>
  process.env.NODE_ENV === 'production'
    ? [QueryLimitsRule, NoSchemaIntrospectionCustomRule]
    : [QueryLimitsRule];
