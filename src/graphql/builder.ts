import SchemaBuilder from '@pothos/core';

import type { GraphQLContext } from './context.js';

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  DefaultFieldNullability: false;
  Scalars: {
    ID: { Input: string; Output: string };
  };
}>({ defaultFieldNullability: false });

builder.queryType({});
builder.mutationType({});
builder.subscriptionType({});
