import { normalizeBrandKey } from './brand-normalization';

describe('normalizeBrandKey', () => {
  it.each([
    ['Bosch', 'bosch'],
    [' BOSCH ', 'bosch'],
    ['BoScH', 'bosch'],
    ['Mecánicos  Técnicos', 'mecánicos técnicos'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeBrandKey(input)).toBe(expected);
  });
});
