import { Transform } from 'class-transformer';

export function TrimmedString() {
  return Transform(({ value }: { value: unknown }) => trimString(value));
}

export function LowercaseEmail() {
  return Transform(({ value }: { value: unknown }) => {
    const trimmedValue = trimString(value);

    if (typeof trimmedValue !== 'string') {
      return trimmedValue;
    }

    const normalized = trimmedValue.toLowerCase();

    return normalized.length > 0 ? normalized : undefined;
  });
}

export function OptionalTrimmedString() {
  return Transform(({ value }: { value: unknown }) => {
    const normalized = trimString(value);

    if (typeof normalized !== 'string') {
      return normalized;
    }

    return normalized.length > 0 ? normalized : undefined;
  });
}

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
