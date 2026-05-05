import type { Request } from 'express';
import { extractAccessTokenFromCookies } from './auth.jwt';

describe('extractAccessTokenFromCookies', () => {
  it('returns the access token from the configured cookie', () => {
    const request = {
      cookies: {
        md_access: 'signed-access-token',
      },
    } as unknown as Request;

    expect(extractAccessTokenFromCookies(request, 'md_access')).toBe(
      'signed-access-token',
    );
  });

  it('returns undefined when the configured access cookie is absent', () => {
    const request = {
      cookies: {
        md_refresh: 'refresh-token',
      },
    } as unknown as Request;

    expect(extractAccessTokenFromCookies(request, 'md_access')).toBeUndefined();
  });
});
