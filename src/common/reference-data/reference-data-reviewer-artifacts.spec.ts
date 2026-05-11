import * as fs from 'node:fs';
import * as path from 'node:path';

describe('frontend reference-data reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const docPath = path.join(
    projectRoot,
    'docs',
    'reference-data',
    'frontend-reference-data-and-quick-create.md',
  );
  const collectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-reference-data.postman_collection.json',
  );

  it('ships a focused reviewer doc for options and quick-create', () => {
    expect(fs.existsSync(docPath)).toBeTruthy();

    const content = fs.readFileSync(docPath, 'utf8');

    expect(content).toContain('# Frontend reference data and quick create');
    expect(content).toContain('## Quick path');
    expect(content).toContain('GET /services/options');
    expect(content).toContain('POST /employees/quick-create');
    expect(content).toContain('size:exception');
    expect(content).toContain('out of scope');
  });

  it('ships a runner-friendly cross-domain Postman collection without seeded ids', () => {
    expect(fs.existsSync(collectionPath)).toBeTruthy();

    const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8')) as {
      info?: { description?: string };
      item?: Array<{
        name?: string;
        item?: unknown[];
        request?: { url?: { raw?: string } };
      }>;
    };

    expect(collection.info?.description).toContain(
      'frontend reference-data and quick-create verification',
    );

    const serialized = JSON.stringify(collection);

    expect(serialized).toContain('Login as Admin');
    expect(serialized).toContain('List Service Options');
    expect(serialized).toContain('Quick Create Employee');
    expect(serialized).toContain('Duplicate Customer Quick Create');
    expect(serialized).toContain('{{customerId}}');
    expect(serialized).not.toContain('seed-');
  });
});
