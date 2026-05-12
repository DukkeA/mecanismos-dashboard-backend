import { Inject, Injectable, Optional } from '@nestjs/common';
import { randomInt as cryptoRandomInt } from 'crypto';

export const RECOVERY_PHRASE_WORD_COUNT = 8;
export const RECOVERY_PHRASE_RANDOM_INT = Symbol('RECOVERY_PHRASE_RANDOM_INT');

type RandomInt = (max: number) => number;

const FIXED_WORDS = [
  'ability',
  'able',
  'about',
  'above',
  'absent',
  'absorb',
  'abstract',
  'absurd',
] as const;

const ONSETS = [
  'b',
  'c',
  'd',
  'f',
  'g',
  'h',
  'j',
  'k',
  'l',
  'm',
  'n',
  'p',
  'r',
  's',
  't',
  'v',
] as const;
const VOWELS = [
  'a',
  'e',
  'i',
  'o',
  'u',
  'ae',
  'ai',
  'ia',
  'io',
  'oa',
  'ou',
  'ue',
  'ui',
  'ea',
  'ei',
  'au',
] as const;
const CODAS = [
  'b',
  'd',
  'f',
  'g',
  'k',
  'l',
  'm',
  'n',
  'p',
  'r',
  's',
  't',
  'v',
  'z',
  'th',
  'sh',
] as const;

const MINIMUM_WORDLIST_SIZE = 2048;

function buildWordlist(): readonly string[] {
  const words = new Set<string>(FIXED_WORDS);

  for (const onset of ONSETS) {
    for (const vowel of VOWELS) {
      for (const coda of CODAS) {
        words.add(`${onset}${vowel}${coda}`);
      }
    }
  }

  const wordlist = [...words];

  if (wordlist.length < MINIMUM_WORDLIST_SIZE) {
    throw new Error('Recovery phrase wordlist is too small');
  }

  return Object.freeze(wordlist);
}

const RECOVERY_PHRASE_WORDLIST = buildWordlist();

export function normalizeRecoveryPhrase(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, ' ');
}

@Injectable()
export class RecoveryPhraseGenerator {
  private readonly randomInt: RandomInt;

  constructor(
    @Optional()
    @Inject(RECOVERY_PHRASE_RANDOM_INT)
    options: RandomInt | { randomInt?: RandomInt } = {},
  ) {
    this.randomInt =
      typeof options === 'function'
        ? options
        : (options.randomInt ?? cryptoRandomInt);
  }

  get wordlistSize(): number {
    return RECOVERY_PHRASE_WORDLIST.length;
  }

  generate(): string {
    const words = Array.from({ length: RECOVERY_PHRASE_WORD_COUNT }, () => {
      return RECOVERY_PHRASE_WORDLIST[this.randomInt(this.wordlistSize)];
    });

    return words.join(' ');
  }
}
