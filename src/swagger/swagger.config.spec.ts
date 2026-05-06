import { buildSwaggerDocumentConfig, SWAGGER_TAGS } from './swagger.config';

describe('swagger.config', () => {
  it('includes inventory, procurement, suppliers, and services swagger tags in the exported config', () => {
    expect(SWAGGER_TAGS).toContain('services');
    expect(SWAGGER_TAGS).toContain('suppliers');
    expect(SWAGGER_TAGS).toContain('inventory');
    expect(SWAGGER_TAGS).toContain('procurement');

    expect(buildSwaggerDocumentConfig().tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'services' }),
        expect.objectContaining({ name: 'suppliers' }),
        expect.objectContaining({ name: 'inventory' }),
        expect.objectContaining({ name: 'procurement' }),
      ]),
    );
  });
});
