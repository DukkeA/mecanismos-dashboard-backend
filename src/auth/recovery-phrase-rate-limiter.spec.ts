import { HttpException, HttpStatus } from '@nestjs/common';
import { RecoveryPhraseRateLimiter } from './recovery-phrase-rate-limiter';

describe('RecoveryPhraseRateLimiter', () => {
  it('allows attempts until the privacy-preserving email/ip key exceeds the limit', () => {
    const limiter = new RecoveryPhraseRateLimiter({
      maxFailures: 2,
      windowMs: 60_000,
      now: () => 1_000,
    });
    const input = {
      email: '  ADMIN@MECANISMOS.TEST  ',
      ipAddress: '127.0.0.1',
    };

    expect(() => limiter.assertAllowed(input)).not.toThrow();
    limiter.recordFailure(input);
    expect(() => limiter.assertAllowed(input)).not.toThrow();
    limiter.recordFailure(input);

    expect(() => limiter.assertAllowed(input)).toThrow(HttpException);
    try {
      limiter.assertAllowed(input);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('uses normalized email and request ip for the same limiter bucket and clears it after success', () => {
    const limiter = new RecoveryPhraseRateLimiter({
      maxFailures: 1,
      windowMs: 60_000,
      now: () => 1_000,
    });

    limiter.recordFailure({
      email: 'ADMIN@MECANISMOS.TEST',
      ipAddress: '10.0.0.5',
    });
    expect(() =>
      limiter.assertAllowed({
        email: ' admin@mecanismos.test ',
        ipAddress: '10.0.0.5',
      }),
    ).toThrow(HttpException);

    limiter.recordSuccess({
      email: ' admin@mecanismos.test ',
      ipAddress: '10.0.0.5',
    });

    expect(() =>
      limiter.assertAllowed({
        email: 'ADMIN@MECANISMOS.TEST',
        ipAddress: '10.0.0.5',
      }),
    ).not.toThrow();
  });
});
