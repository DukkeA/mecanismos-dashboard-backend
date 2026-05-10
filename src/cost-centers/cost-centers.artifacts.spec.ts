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

describe('cost-center reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'cost-centers');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-cost-centers.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: [
        '# Cost centers overview',
        'ADMIN | SALES',
        'POST /cost-centers',
      ],
    },
    {
      fileName: 'api-map.md',
      expectedContent: [
        '# Cost centers API map',
        'GET /cost-centers',
        'PATCH /cost-centers/:id',
      ],
    },
    {
      fileName: 'validation-rules.md',
      expectedContent: [
        '# Cost centers validation rules',
        'trim().toUpperCase()',
        '409 Conflict',
      ],
    },
    {
      fileName: 'testing.md',
      expectedContent: [
        '# Cost centers testing guide',
        'npm run test:e2e',
        'rollback',
      ],
    },
  ])(
    'ships $fileName with cost-center reviewer guidance',
    ({ fileName, expectedContent }) => {
      const filePath = path.join(docsDir, fileName);

      expect(fs.existsSync(filePath)).toBeTruthy();

      const fileContent = fs.readFileSync(filePath, 'utf8');

      for (const expectedSnippet of expectedContent) {
        expect(fileContent).toContain(expectedSnippet);
      }
    },
  );

  it('ships a valid Postman collection for cost-center reviewers', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'Create Cost Center',
        'Create Duplicate Canonical Cost Center',
        'List Cost Centers',
        'Get Cost Center',
        'Update Cost Center',
        'Cost Center List forbidden for Mechanic',
      ]),
    );
    expect(findRequest(collection, 'Create Cost Center')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/cost-centers',
    });
    expect(findRequest(collection, 'Update Cost Center')).toMatchObject({
      method: 'PATCH',
      rawUrl: '{{baseUrl}}/cost-centers/{{costCenterId}}',
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
