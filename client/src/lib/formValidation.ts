export type FormErrors<T extends string = string> = Partial<Record<T, string>>;

export const isPositiveNumber = (value: string): boolean => Number.isFinite(Number(value)) && Number(value) > 0;

export const isNonNegativeNumber = (value: string): boolean => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0);

export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const required = (value: string, message: string): string | null => (value.trim() ? null : message);
