export const encodePathFilename = (filename: string): string =>
  filename
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

