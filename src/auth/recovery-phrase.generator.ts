import { Inject, Injectable, Optional } from '@nestjs/common';
import { randomInt as cryptoRandomInt } from 'crypto';
import { wordlists } from 'bip39';

export const RECOVERY_PHRASE_WORD_COUNT = 8;
export const RECOVERY_PHRASE_RANDOM_INT = Symbol('RECOVERY_PHRASE_RANDOM_INT');

type RandomInt = (max: number) => number;

const MINIMUM_WORDLIST_SIZE = 2048;
const LOWERCASE_WORD = /^[a-z]+$/;

function loadWordlist(): readonly string[] {
  const englishWordlist = wordlists.english;

  if (!englishWordlist || englishWordlist.length < MINIMUM_WORDLIST_SIZE) {
    throw new Error('Recovery phrase wordlist is too small');
  }

  if (englishWordlist.some((word) => !LOWERCASE_WORD.test(word))) {
    throw new Error(
      'Recovery phrase wordlist must contain lowercase words only',
    );
  }

  return Object.freeze([...englishWordlist]);
}

const RECOVERY_PHRASE_WORDLIST = loadWordlist();

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
