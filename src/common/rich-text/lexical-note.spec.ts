import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  LEXICAL_NOTE_EXAMPLE,
  OptionalLexicalNote,
  isLexicalNoteJson,
  normalizeOptionalNoteJson,
} from './lexical-note';

class NoteDto {
  @OptionalLexicalNote()
  notes?: unknown;
}

describe('lexical-note rich text contract', () => {
  it('accepts Lexical editor state objects and preserves them unchanged', async () => {
    const dto = plainToInstance(NoteDto, { notes: LEXICAL_NOTE_EXAMPLE });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(isLexicalNoteJson(dto.notes)).toBe(true);
    expect(normalizeOptionalNoteJson(dto.notes as typeof LEXICAL_NOTE_EXAMPLE)).toEqual(
      LEXICAL_NOTE_EXAMPLE,
    );
  });

  it('accepts null and omitted values while preserving update semantics', async () => {
    const nullDto = plainToInstance(NoteDto, { notes: null });
    const omittedDto = plainToInstance(NoteDto, {});

    await expect(validate(nullDto)).resolves.toHaveLength(0);
    await expect(validate(omittedDto)).resolves.toHaveLength(0);
    expect(normalizeOptionalNoteJson(null)).toBeNull();
    expect(normalizeOptionalNoteJson(undefined)).toBeUndefined();
  });

  it.each([
    ['plain string', 'plain text'],
    ['array', []],
    ['number', 42],
    ['boolean', true],
    ['missing root', {}],
    ['wrong root type', { root: { type: 'paragraph', children: [] } }],
    ['missing root children', { root: { type: 'root' } }],
  ])('rejects %s notes', async (_name, notes) => {
    const dto = plainToInstance(NoteDto, { notes });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(isLexicalNoteJson(notes)).toBe(false);
  });
});
