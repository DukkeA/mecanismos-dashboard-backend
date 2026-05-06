import * as fs from 'node:fs';
import * as path from 'node:path';

describe('inventory reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'inventory-procurement');

  it.each([
    [
      'overview.md',
      [
        '# Inventory procurement overview',
        'inventory-items',
        'supplier-quotes',
      ],
    ],
    [
      'api-map.md',
      [
        '# Inventory procurement API map',
        'GET /inventory-items',
        'PATCH /supplier-quotes/:id/void',
      ],
    ],
    [
      'validation-rules.md',
      [
        '# Inventory procurement validation rules',
        'Negative stock',
        'append-only',
      ],
    ],
    [
      'testing.md',
      ['# Inventory procurement testing guide', 'npm run test:e2e', 'Postman'],
    ],
  ])('ships %s with reviewer guidance', (fileName, snippets) => {
    const content = fs.readFileSync(path.join(docsDir, fileName), 'utf8');

    for (const snippet of snippets) {
      expect(content).toContain(snippet);
    }
  });
});
