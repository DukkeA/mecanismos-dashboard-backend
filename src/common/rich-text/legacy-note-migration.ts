import { isLexicalNoteJson, type LexicalNoteJson } from './lexical-note';

type LegacyNoteValue =
  | LexicalNoteJson
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>;

export function lexicalNoteFromLegacyValue(
  value: LegacyNoteValue,
): LexicalNoteJson | null {
  if (value === null) {
    return null;
  }

  if (isLexicalNoteJson(value)) {
    return value;
  }

  return lexicalNoteFromText(toReadableLegacyNoteText(value));
}

function lexicalNoteFromText(text: string): LexicalNoteJson {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text }],
        },
      ],
    },
  };
}

function toReadableLegacyNoteText(
  value: Exclude<LegacyNoteValue, null>,
): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}
