import { readFileSync } from 'fs';
import { join } from 'path';
import {
  RECOVERY_PHRASE_WORD_COUNT,
  RecoveryPhraseGenerator,
  normalizeRecoveryPhrase,
} from './recovery-phrase.generator';

describe('RecoveryPhraseGenerator', () => {
  it('generates exactly 8 lowercase words separated by single spaces', () => {
    const generator = new RecoveryPhraseGenerator();

    const phrase = generator.generate();
    const words = phrase.split(' ');

    expect(words).toHaveLength(RECOVERY_PHRASE_WORD_COUNT);
    expect(phrase).toMatch(/^[a-z]+(?: [a-z]+){7}$/);
  });

  it('uses caller-independent CSPRNG index selection', () => {
    const randomInt = jest
      .fn<number, [number]>()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(4)
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(6)
      .mockReturnValueOnce(7);
    const generator = new RecoveryPhraseGenerator({ randomInt });

    const phrase = generator.generate();

    expect(randomInt).toHaveBeenCalledTimes(RECOVERY_PHRASE_WORD_COUNT);
    expect(randomInt).toHaveBeenNthCalledWith(1, generator.wordlistSize);
    expect(phrase).toMatch(/^[a-z]+(?: [a-z]+){7}$/);
    expect(new Set(phrase.split(' ')).size).toBe(RECOVERY_PHRASE_WORD_COUNT);
  });

  it('selects recognizable real English words from deterministic wordlist indexes', () => {
    const randomInt = jest
      .fn<number, [number]>()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(4)
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(6)
      .mockReturnValueOnce(7);
    const generator = new RecoveryPhraseGenerator({ randomInt });

    expect(generator.generate()).toBe(
      'abandon ability able about above absent absorb abstract',
    );
  });

  it('uses a built-in wordlist large enough for recovery phrase entropy', () => {
    const generator = new RecoveryPhraseGenerator();

    expect(generator.wordlistSize).toBeGreaterThanOrEqual(2048);
  });

  it('does not keep the old syllable-based pseudo-word generator', () => {
    const source = readFileSync(
      join(__dirname, 'recovery-phrase.generator.ts'),
      'utf8',
    );

    expect(source).not.toContain('ONSETS');
    expect(source).not.toContain('VOWELS');
    expect(source).not.toContain('CODAS');
  });

  it('normalizes recovery phrases to lowercase single-spaced words', () => {
    const normalizedPhrase = new RecoveryPhraseGenerator({
      randomInt: (max) => Math.min(1, max - 1),
    }).generate();

    expect(
      normalizeRecoveryPhrase(
        `  ${normalizedPhrase.toUpperCase().replace(/ /g, '   ')}  `,
      ),
    ).toBe(normalizedPhrase);
  });
});
