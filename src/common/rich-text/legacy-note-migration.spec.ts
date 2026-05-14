import { lexicalNoteFromLegacyValue } from './legacy-note-migration';

describe('legacy note migration helpers', () => {
  it('wraps legacy text, including blank strings, as Lexical JSON', () => {
    expect(lexicalNoteFromLegacyValue('Needs inspection')).toEqual({
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Needs inspection' }],
          },
        ],
      },
    });

    expect(lexicalNoteFromLegacyValue('   ')).toEqual({
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: '   ' }],
          },
        ],
      },
    });
  });

  it('preserves null and already-valid Lexical JSON objects', () => {
    const lexicalNote = {
      root: {
        type: 'root',
        children: [{ type: 'paragraph', children: [] }],
      },
    };

    expect(lexicalNoteFromLegacyValue(null)).toBeNull();
    expect(lexicalNoteFromLegacyValue(lexicalNote)).toBe(lexicalNote);
  });

  it('wraps JSON scalars and non-Lexical JSON objects as readable text', () => {
    expect(lexicalNoteFromLegacyValue('quoted scalar')).toMatchObject({
      root: {
        children: [
          {
            children: [{ text: 'quoted scalar' }],
          },
        ],
      },
    });

    expect(lexicalNoteFromLegacyValue(42)).toMatchObject({
      root: {
        children: [
          {
            children: [{ text: '42' }],
          },
        ],
      },
    });

    expect(lexicalNoteFromLegacyValue({ raw: 'object note' })).toMatchObject({
      root: {
        children: [
          {
            children: [{ text: '{"raw":"object note"}' }],
          },
        ],
      },
    });
  });
});
