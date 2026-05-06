import { buildSwaggerDocumentConfig, SWAGGER_TAGS } from './swagger.config';

describe('swagger.config', () => {
  it('includes the services swagger tag in the exported config', () => {
    expect(SWAGGER_TAGS).toContain('services');

    expect(buildSwaggerDocumentConfig().tags).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'services' })]),
    );
  });
});
