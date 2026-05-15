import type { LexicalNoteJson } from '../../src/common/rich-text/lexical-note';

export function lexicalTestNote(text: string): LexicalNoteJson {
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
