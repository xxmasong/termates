type ClassValue = false | 0 | null | string | undefined;

export const classNames = (...values: ClassValue[]): string => values.filter(Boolean).join(' ');
