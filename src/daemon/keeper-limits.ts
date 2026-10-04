/** Input limits shared by the web server's frame check and the Keeper. */

/** Longest user message accepted for one Keeper turn. */
export const MAX_KEEPER_MESSAGE = 20_000;

const MAX_MODEL_LENGTH = 100;

/**
 * Model names reach the engines' CLIs as arguments, so they are kept to plain
 * ids ("gpt-5.6", "opus[1m]", "models/gemini-3.8-flash"); '' means default.
 */
export const isValidModel = (value: string): boolean =>
  value === '' || (value.length <= MAX_MODEL_LENGTH && /^[A-Za-z0-9][\w.:[\]/-]*$/.test(value));
