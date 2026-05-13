import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import {
  LowercaseEmail,
  TrimmedString,
} from '../../common/transforms/string.transforms';
import { normalizeRecoveryPhrase } from '../recovery-phrase.generator';

const EIGHT_LOWERCASE_WORDS = /^[a-z]+(?: [a-z]+){7}$/;

function NormalizedRecoveryPhrase() {
  return Transform(({ value }: { value: unknown }) => {
    return typeof value === 'string' ? normalizeRecoveryPhrase(value) : value;
  });
}

export class GenerateRecoveryPhraseDto {
  @ApiProperty({ example: 'CurrentSecure123!', minLength: 8 })
  @TrimmedString()
  @IsString()
  @MinLength(8)
  currentPassword!: string;
}

export class GenerateRecoveryPhraseResponseDto {
  @ApiProperty({
    example: '<generated recovery phrase returned once>',
    description:
      'Plaintext 8-word English recovery phrase returned once. Store it securely; examples are redacted to avoid publishing reusable-looking secrets.',
  })
  phrase!: string;

  @ApiProperty({
    example: [
      '<word-1>',
      '<word-2>',
      '<word-3>',
      '<word-4>',
      '<word-5>',
      '<word-6>',
      '<word-7>',
      '<word-8>',
    ],
    isArray: true,
    type: String,
  })
  words!: string[];

  @ApiProperty({ example: '2026-05-12T12:00:00.000Z' })
  generatedAt!: string;
}

export class RecoverWithPhraseDto {
  @ApiProperty({ example: 'user@mecanismos.test' })
  @LowercaseEmail()
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '<generated recovery phrase returned once>',
    description:
      'Exactly eight lowercase English words separated by single spaces.',
  })
  @NormalizedRecoveryPhrase()
  @IsString()
  @Matches(EIGHT_LOWERCASE_WORDS)
  recoveryPhrase!: string;

  @ApiProperty({ example: 'NewSecure123!', minLength: 8 })
  @TrimmedString()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class RecoveryPhraseStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: '2026-05-12T12:00:00.000Z', nullable: true })
  generatedAt: string | null;

  @ApiProperty({ example: null, nullable: true })
  consumedAt: string | null;

  constructor(input: {
    enabled: boolean;
    generatedAt: Date | string | null;
    consumedAt: Date | string | null;
  }) {
    this.enabled = input.enabled;
    this.generatedAt = toIsoString(input.generatedAt);
    this.consumedAt = toIsoString(input.consumedAt);
  }
}

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}
