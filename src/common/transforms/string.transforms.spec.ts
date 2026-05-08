import { plainToInstance } from 'class-transformer';
import {
  LowercaseEmail,
  OptionalTrimmedString,
  TrimmedString,
} from './string.transforms';

class TrimmedStringFixture {
  @TrimmedString()
  value!: string;
}

class LowercaseEmailFixture {
  @LowercaseEmail()
  email!: string | undefined;
}

class OptionalTrimmedStringFixture {
  @OptionalTrimmedString()
  notes?: string;
}

describe('common string transforms', () => {
  it('trims required string values', () => {
    const result = plainToInstance(TrimmedStringFixture, {
      value: '  Repuestos Central  ',
    });

    expect(result.value).toBe('Repuestos Central');
  });

  it('lowercases emails and converts blank values to undefined', () => {
    const normalized = plainToInstance(LowercaseEmailFixture, {
      email: '  COMPRAS@REPUESTOS.TEST  ',
    });
    const blank = plainToInstance(LowercaseEmailFixture, {
      email: '   ',
    });

    expect(normalized.email).toBe('compras@repuestos.test');
    expect(blank.email).toBeUndefined();
  });

  it('keeps non-string values untouched while normalizing optional strings', () => {
    const normalized = plainToInstance(OptionalTrimmedStringFixture, {
      notes: '  contacto principal  ',
    });
    const blank = plainToInstance(OptionalTrimmedStringFixture, {
      notes: '   ',
    });
    const numeric = plainToInstance(OptionalTrimmedStringFixture, {
      notes: 42,
    }) as OptionalTrimmedStringFixture & { notes: unknown };

    expect(normalized.notes).toBe('contacto principal');
    expect(blank.notes).toBeUndefined();
    expect(numeric.notes).toBe(42);
  });
});
