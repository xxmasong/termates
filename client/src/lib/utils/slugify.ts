/**
 * Turn a display name into a filesystem-safe directory segment.
 *
 * "Mark Reviewer 2" -> "mark-reviewer-2"
 *
 * Returns '' when the name has no usable characters, so callers can fall back
 * to the bare project directory rather than appending an empty segment.
 */
export const slugifyName = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Sanitize a slug the user is actively typing.
 *
 * Unlike slugifyName this keeps a trailing hyphen, so typing "mark-" on the way
 * to "mark-two" is not fought by the input on every keystroke.
 */
export const sanitizeSlugInput = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '');

/** Join a fixed parent directory to a slug, without doubling the separator. */
export const joinCwd = (root: string, slug: string): string => {
  const base = root.replace(/\/+$/, '');
  return slug ? `${base}/${slug}` : base;
};
