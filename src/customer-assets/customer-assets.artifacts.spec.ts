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

describe('customer assets reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'customer-assets');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-customer-assets.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: [
        '# Customer assets overview',
        'customers, vehicles, and components',
        'ADMIN | SALES',
      ],
    },
    {
      fileName: 'api-map.md',
      expectedContent: [
        '# Customer assets API map',
        'POST /components',
        'PATCH /vehicles/:id',
      ],
    },
    {
      fileName: 'validation-rules.md',
      expectedContent: [
        '# Customer assets validation rules',
        'customerId is immutable',
        'same customer',
      ],
    },
    {
      fileName: 'testing.md',
      expectedContent: [
        '# Customer assets testing guide',
        'npm run test',
        'Postman',
      ],
    },
  ])(
    'ships $fileName with reviewer-facing customer-assets guidance',
    ({ fileName, expectedContent }) => {
      const filePath = path.join(docsDir, fileName);

      expect(fs.existsSync(filePath)).toBeTruthy();

      const fileContent = fs.readFileSync(filePath, 'utf8');

      for (const expectedSnippet of expectedContent) {
        expect(fileContent).toContain(expectedSnippet);
      }
    },
  );

  it('ships a valid Postman collection for customer-assets reviewers', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'Create Customer',
        'List Vehicles',
        'Create Component',
        'Update Component',
        'Customer List forbidden for Mechanic',
      ]),
    );
    expect(findRequest(collection, 'Create Component')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/components',
    });
    expect(findRequest(collection, 'Update Component')).toMatchObject({
      method: 'PATCH',
      rawUrl: '{{baseUrl}}/components/{{componentId}}',
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

function flattenItems(items: PostmanCollectionItem[] | undefined): PostmanCollectionItem[] {
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
