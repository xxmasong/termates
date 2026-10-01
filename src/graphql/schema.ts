import { builder } from './builder.js';
import './types.js';
import './queries.js';
import './mutations.js';
import './subscriptions.js';

export const schema = builder.toSchema();
