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

describe('service reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'services');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-services.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: [
        '# Services overview',
        'ADMIN | SALES',
        'POST /services',
      ],
    },
    {
      fileName: 'api-map.md',
      expectedContent: [
        '# Services API map',
        'GET /services',
        'PATCH /services/:id',
      ],
    },
    {
      fileName: 'validation-rules.md',
      expectedContent: [
        '# Services validation rules',
        'canonical slug',
        '409 Conflict',
      ],
    },
    {
      fileName: 'testing.md',
      expectedContent: [
        '# Services testing guide',
        'npm run test:e2e',
        'rollback',
      ],
    },
  ])(
    'ships $fileName with service reviewer guidance',
    ({ fileName, expectedContent }) => {
      const filePath = path.join(docsDir, fileName);

      expect(fs.existsSync(filePath)).toBeTruthy();

      const fileContent = fs.readFileSync(filePath, 'utf8');

      for (const expectedSnippet of expectedContent) {
        expect(fileContent).toContain(expectedSnippet);
      }
    },
  );

  it('ships a valid Postman collection for service reviewers', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'Create Service',
        'Create Duplicate Canonical Service',
        'List Services',
        'Get Service',
        'Update Service',
        'Service List forbidden for Mechanic',
      ]),
    );
    expect(findRequest(collection, 'Create Service')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/services',
    });
    expect(findRequest(collection, 'Update Service')).toMatchObject({
      method: 'PATCH',
      rawUrl: '{{baseUrl}}/services/{{serviceId}}',
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
