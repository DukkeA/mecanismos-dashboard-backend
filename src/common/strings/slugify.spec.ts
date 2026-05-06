import { slugify } from './slugify';

describe('slugify', () => {
  it('removes accents, trims edges, and lowercases the result', () => {
    expect(slugify('  Diagnóstico Premium  ')).toBe('diagnostico-premium');
  });

  it('collapses repeated spaces and punctuation into single hyphens', () => {
    expect(slugify('calibración___bomba---inyectór!!!')).toBe(
      'calibracion-bomba-inyector',
    );
  });

  it('normalizes composed and decomposed unicode accents the same way', () => {
    expect(slugify('Café diagnóstico')).toBe('cafe-diagnostico');
    expect(slugify('Cafe\u0301 diagno\u0301stico')).toBe('cafe-diagnostico');
  });

  it('normalizes spanish enye and cedilla variants', () => {
    expect(slugify('Año Ñandú Çedilla')).toBe('ano-nandu-cedilla');
  });

  it('collapses multiple separator kinds into one hyphen', () => {
    expect(slugify('///diagnóstico___---###premium:::')).toBe(
      'diagnostico-premium',
    );
  });

  it('returns an empty slug when no alphanumeric characters survive normalization', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('   ')).toBe('');
  });
});
