import type { CodegenConfig } from '@graphql-codegen/cli';

/** Typed documents for the client. Run `npm run graphql` after schema or query changes. */
const config: CodegenConfig = {
  schema: 'client/src/lib/graphql/schema.graphql',
  documents: ['client/src/**/*.{ts,tsx}', '!client/src/lib/graphql/generated/**'],
  ignoreNoDocuments: true,
  generates: {
    'client/src/lib/graphql/generated/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false },
      config: {
        // Plain strings at runtime: no graphql-js in the browser bundle.
        documentMode: 'string',
        enumsAsTypes: true,
        useTypeImports: true,
      },
    },
  },
};

export default config;
