import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  GenerateRecoveryPhraseDto,
  RecoverWithPhraseDto,
  RecoveryPhraseStatusDto,
} from './recovery-phrase.dto';
import { RecoveryPhraseGenerator } from '../recovery-phrase.generator';

const recoveryPhrase = new RecoveryPhraseGenerator({
  randomInt: (max) => Math.min(1, max - 1),
}).generate();

describe('Recovery phrase DTOs', () => {
  it('accepts only currentPassword for generation and rejects caller-supplied phrase words', () => {
    const dto = plainToInstance(GenerateRecoveryPhraseDto, {
      currentPassword: ' Current123! ',
      recoveryPhrase,
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual([
      expect.objectContaining({ property: 'recoveryPhrase' }),
    ]);
    expect(dto.currentPassword).toBe('Current123!');
  });

  it('normalizes public recovery email and phrase before validation', () => {
    const dto = plainToInstance(RecoverWithPhraseDto, {
      email: ' ADMIN@MECANISMOS.TEST ',
      recoveryPhrase: recoveryPhrase.toUpperCase().replace(/ /g, '   '),
      newPassword: 'NewSecure123!',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual([]);
    expect(dto.email).toBe('admin@mecanismos.test');
    expect(dto.recoveryPhrase).toBe(recoveryPhrase);
  });

  it('rejects public recovery phrases that are not exactly eight lowercase words', () => {
    const dto = plainToInstance(RecoverWithPhraseDto, {
      email: 'admin@mecanismos.test',
      recoveryPhrase: 'ability able about above absent absorb abstract',
      newPassword: 'NewSecure123!',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual([
      expect.objectContaining({ property: 'recoveryPhrase' }),
    ]);
  });

  it('exposes only recovery status metadata without plaintext phrase or hash fields', () => {
    const generatedAt = new Date('2026-05-12T12:00:00.000Z');
    const dto = new RecoveryPhraseStatusDto({
      enabled: true,
      generatedAt,
      consumedAt: null,
    });

    expect(dto).toEqual({
      enabled: true,
      generatedAt: generatedAt.toISOString(),
      consumedAt: null,
    });
    expect(Object.keys(dto)).not.toContain('phrase');
    expect(Object.keys(dto)).not.toContain('recoveryPhraseHash');
  });
});
