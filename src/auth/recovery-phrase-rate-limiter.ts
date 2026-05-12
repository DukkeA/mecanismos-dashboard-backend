import {
  HttpException,
  HttpStatus,
  Injectable,
  Optional,
} from '@nestjs/common';
import { createHash } from 'crypto';

type RecoveryPhraseRateLimiterInput = {
  email: string;
  ipAddress?: string;
};

type RecoveryPhraseRateLimiterOptions = {
  maxFailures?: number;
  windowMs?: number;
  now?: () => number;
};

type Bucket = {
  failures: number;
  firstFailureAt: number;
};

@Injectable()
export class RecoveryPhraseRateLimiter {
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly buckets = new Map<string, Bucket>();

  constructor(@Optional() options: RecoveryPhraseRateLimiterOptions = {}) {
    this.maxFailures = options.maxFailures ?? 5;
    this.windowMs = options.windowMs ?? 15 * 60 * 1_000;
    this.now = options.now ?? Date.now;
  }

  assertAllowed(input: RecoveryPhraseRateLimiterInput): void {
    const key = this.buildKey(input);
    const bucket = this.currentBucket(key);

    if (bucket && bucket.failures >= this.maxFailures) {
      throw new HttpException(
        'Too many recovery attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(input: RecoveryPhraseRateLimiterInput): void {
    const key = this.buildKey(input);
    const existing = this.currentBucket(key);

    if (!existing) {
      this.buckets.set(key, { failures: 1, firstFailureAt: this.now() });
      return;
    }

    existing.failures += 1;
  }

  recordSuccess(input: RecoveryPhraseRateLimiterInput): void {
    this.buckets.delete(this.buildKey(input));
  }

  private currentBucket(key: string): Bucket | undefined {
    const bucket = this.buckets.get(key);

    if (!bucket) {
      return undefined;
    }

    if (this.now() - bucket.firstFailureAt >= this.windowMs) {
      this.buckets.delete(key);
      return undefined;
    }

    return bucket;
  }

  private buildKey(input: RecoveryPhraseRateLimiterInput): string {
    const normalizedEmail = input.email.trim().toLowerCase();
    const ipAddress = input.ipAddress?.trim() || 'unknown-ip';

    return createHash('sha256')
      .update(`${normalizedEmail}|${ipAddress}`)
      .digest('hex');
  }
}
