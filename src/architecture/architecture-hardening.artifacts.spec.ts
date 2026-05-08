import * as fs from 'node:fs';
import * as path from 'node:path';

describe('nestjs architecture hardening artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');

  it('removes placeholder inventory drift folders from the flat inventory feature', () => {
    expect(
      fs.existsSync(
        path.join(projectRoot, 'src', 'inventory', 'inventory.module.ts'),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          projectRoot,
          'src',
          'inventory',
          'inventory-items.controller.ts',
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          projectRoot,
          'src',
          'inventory',
          'inventory-movements.controller.ts',
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(projectRoot, 'src', 'inventory', 'inventory-items'),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(projectRoot, 'src', 'inventory', 'inventory-movements'),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(projectRoot, 'src', 'inventory', 'inventory')),
    ).toBe(false);
  });

  it('keeps shared transforms and pagination helpers under src/common without cross-feature private imports', () => {
    expect(
      fs.existsSync(
        path.join(
          projectRoot,
          'src',
          'common',
          'transforms',
          'string.transforms.ts',
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          projectRoot,
          'src',
          'common',
          'pagination',
          'pagination-meta.ts',
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          projectRoot,
          'src',
          'customers',
          'dto',
          'customer-string.transforms.ts',
        ),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(
          projectRoot,
          'src',
          'suppliers',
          'dto',
          'supplier-string.transforms.ts',
        ),
      ),
    ).toBe(false);

    const customerDto = fs.readFileSync(
      path.join(
        projectRoot,
        'src',
        'customers',
        'dto',
        'create-customer.dto.ts',
      ),
      'utf8',
    );
    const supplierDto = fs.readFileSync(
      path.join(
        projectRoot,
        'src',
        'suppliers',
        'dto',
        'create-supplier.dto.ts',
      ),
      'utf8',
    );
    const inventoryDto = fs.readFileSync(
      path.join(
        projectRoot,
        'src',
        'inventory',
        'dto',
        'create-inventory-item.dto.ts',
      ),
      'utf8',
    );
    const suppliersService = fs.readFileSync(
      path.join(projectRoot, 'src', 'suppliers', 'suppliers.service.ts'),
      'utf8',
    );
    const inventoryService = fs.readFileSync(
      path.join(projectRoot, 'src', 'inventory', 'inventory.service.ts'),
      'utf8',
    );

    expect(customerDto).toContain('../../common/transforms/string.transforms');
    expect(supplierDto).toContain('../../common/transforms/string.transforms');
    expect(inventoryDto).toContain('../../common/transforms/string.transforms');
    expect(suppliersService).toContain('../common/pagination/pagination-meta');
    expect(inventoryService).toContain('../common/pagination/pagination-meta');
  });

  it.each([
    [
      'docs/architecture.md',
      ['# Backend architecture', 'PrismaModule', 'DATABASE_URL_TEST'],
    ],
    [
      'aprendizaje/modulos-y-di.md',
      ['# Módulos y DI en NestJS', 'frontend', 'providers'],
    ],
    [
      'aprendizaje/controladores-servicios-repositorios.md',
      [
        '# Controladores, servicios y repositorios',
        'Controller -> Service -> Repository',
      ],
    ],
    [
      'aprendizaje/prisma-module.md',
      ['# PrismaModule explícito', 'useExisting: PrismaService', 'non-global'],
    ],
    [
      'aprendizaje/testing.md',
      ['# Testing en este backend', 'npm run test', 'npm run test:e2e'],
    ],
  ])('ships %s with architecture guidance', (relativePath, snippets) => {
    const content = fs.readFileSync(
      path.join(projectRoot, relativePath),
      'utf8',
    );

    for (const snippet of snippets) {
      expect(content).toContain(snippet);
    }
  });
});
