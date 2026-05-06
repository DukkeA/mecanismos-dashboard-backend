import { DocumentBuilder, type OpenAPIObject } from '@nestjs/swagger';

export const SWAGGER_TAGS = [
  'auth',
  'component-types',
  'customers',
  'vehicles',
  'components',
  'suppliers',
  'services',
  'inventory',
  'procurement',
] as const;

export function buildSwaggerDocumentConfig(): Omit<OpenAPIObject, 'paths'> {
  const builder = new DocumentBuilder()
    .setTitle('Mecanismos Dashboard Backend')
    .setDescription(
      'Backend API for authentication plus protected customer, supplier, inventory, and procurement access for ADMIN and SALES users.',
    )
    .setVersion('1.0');

  for (const tag of SWAGGER_TAGS) {
    builder.addTag(tag);
  }

  return builder.build();
}
