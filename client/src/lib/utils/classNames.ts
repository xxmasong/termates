type ClassValue = false | null | string | undefined;

export const classNames = (...values: ClassValue[]): string => values.filter(Boolean).join(' ');
