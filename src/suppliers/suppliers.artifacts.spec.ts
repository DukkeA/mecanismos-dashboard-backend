import * as fs from 'node:fs';
import * as path from 'node:path';

type PostmanCollectionItem = {
  name?: string;
  item?: PostmanCollectionItem[];
  request?: {
    method?: string;
    url?: {
      raw?: string;
    };
  };
};

type PostmanCollection = {
  info?: {
    description?: string;
  };
  item?: PostmanCollectionItem[];
};

describe('supplier reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'suppliers');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-suppliers.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: [
        '# Suppliers overview',
        'ADMIN | SALES',
        'POST /suppliers',
      ],
    },
    {
      fileName: 'api-map.md',
      expectedContent: [
        '# Suppliers API map',
        'GET /suppliers',
        'PATCH /suppliers/:id',
      ],
    },
    {
      fileName: 'validation-rules.md',
      expectedContent: [
        '# Suppliers validation rules',
        'exactly one primary phone',
        'duplicate supplier names',
      ],
    },
    {
      fileName: 'testing.md',
      expectedContent: [
        '# Suppliers testing guide',
        'npm run test:e2e',
        'Postman',
      ],
    },
  ])(
    'ships $fileName with supplier reviewer guidance',
    ({ fileName, expectedContent }) => {
      const filePath = path.join(docsDir, fileName);

      expect(fs.existsSync(filePath)).toBeTruthy();

      const fileContent = fs.readFileSync(filePath, 'utf8');

      for (const expectedSnippet of expectedContent) {
        expect(fileContent).toContain(expectedSnippet);
      }
    },
  );

  it('ships a valid Postman collection for supplier reviewers', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'Create Supplier',
        'Create Duplicate Supplier Name',
        'List Suppliers',
        'Get Supplier',
        'Update Supplier',
        'Create Supplier invalid payload',
        'Supplier List forbidden for Mechanic',
      ]),
    );
    expect(findRequest(collection, 'Create Supplier')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/suppliers',
    });
    expect(findRequest(collection, 'Update Supplier')).toMatchObject({
      method: 'PATCH',
      rawUrl: '{{baseUrl}}/suppliers/{{supplierId}}',
    });
  });
});

function readCollection(collectionPath: string): PostmanCollection {
  expect(fs.existsSync(collectionPath)).toBeTruthy();

  return JSON.parse(
    fs.readFileSync(collectionPath, 'utf8'),
  ) as PostmanCollection;
}

function listRequestNames(collection: PostmanCollection): string[] {
  return flattenItems(collection.item).map((item) => item.name ?? '');
}

function findRequest(collection: PostmanCollection, requestName: string) {
  const request = flattenItems(collection.item).find(
    (item) => item.name === requestName,
  );

  expect(request).toBeDefined();

  return {
    method: request?.request?.method,
    rawUrl: request?.request?.url?.raw,
  };
}

function flattenItems(
  items: PostmanCollectionItem[] | undefined,
): PostmanCollectionItem[] {
  if (!items) {
    return [];
  }

  return items.flatMap((item) => {
    if (item.request) {
      return [item];
    }

    return flattenItems(item.item);
  });
}
