import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional, type ApiPropertyOptions } from '@nestjs/swagger';
import { ValidateBy, ValidateIf, ValidationOptions } from 'class-validator';

export type LexicalNoteJson = {
  root: {
    type: 'root';
    children: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export const LEXICAL_NOTE_EXAMPLE = {
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Nota enriquecida' }],
      },
    ],
  },
} satisfies LexicalNoteJson;

export const LEXICAL_EMPTY_NOTE_EXAMPLE = {
  root: {
    type: 'root',
    children: [],
  },
} satisfies LexicalNoteJson;

export const LEXICAL_NOTE_SWAGGER_SCHEMA: ApiPropertyOptions = {
  type: 'object',
  nullable: true,
  required: ['root'],
  properties: {
    root: {
      type: 'object',
      required: ['type', 'children'],
      properties: {
        type: { type: 'string', enum: ['root'] },
        children: { type: 'array', items: {} },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
  example: LEXICAL_NOTE_EXAMPLE,
};

export function isLexicalNoteJson(value: unknown): value is LexicalNoteJson {
  if (!isPlainObject(value)) {
    return false;
  }

  const root = value.root;

  return (
    isPlainObject(root) &&
    root.type === 'root' &&
    Array.isArray(root.children)
  );
}

export function IsLexicalNote(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isLexicalNote',
      validator: {
        validate: isLexicalNoteJson,
        defaultMessage: () =>
          'notes must be a Lexical editor-state JSON object with root.type "root" and root.children array',
      },
    },
    validationOptions,
  );
}

export function OptionalLexicalNote(validationOptions?: ValidationOptions) {
  return applyDecorators(
    ApiPropertyOptional(LEXICAL_NOTE_SWAGGER_SCHEMA),
    ValidateIf((_object, value) => value !== undefined && value !== null),
    IsLexicalNote({
      ...validationOptions,
      each: false,
    }),
  );
}

export function normalizeOptionalNoteJson<T extends LexicalNoteJson | null | undefined>(
  value: T,
): T {
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
