import * as fs from 'node:fs';
import * as path from 'node:path';

type PostmanCollectionItem = {
  name?: string;
  item?: PostmanCollectionItem[];
  request?: {
    method?: string;
    body?: {
      raw?: string;
    };
    url?: {
      raw?: string;
    };
  };
};

type PostmanCollection = {
  info?: {
    description?: string;
  };
  variable?: Array<{ key?: string; value?: string }>;
  item?: PostmanCollectionItem[];
};

describe('app-settings reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'app-settings');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-app-settings.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: [
        '# App settings overview',
        'pricing/labor singleton',
        'ADMIN | SALES',
      ],
    },
    {
      fileName: 'api-map.md',
      expectedContent: [
        '# App settings API map',
        'GET /app-settings/pricing-labor',
        'PATCH /app-settings/pricing-labor',
      ],
    },
    {
      fileName: 'validation-rules.md',
      expectedContent: [
        '# App settings validation rules',
        'currencyCode',
        'defaultLaborHourlyRate',
      ],
    },
    {
      fileName: 'testing.md',
      expectedContent: [
        '# App settings testing guide',
        'npm run test',
        'no-retroactive snapshot semantics',
      ],
    },
  ])(
    'ships $fileName with app-settings reviewer guidance',
    ({ fileName, expectedContent }) => {
      const filePath = path.join(docsDir, fileName);

      expect(fs.existsSync(filePath)).toBeTruthy();

      const fileContent = fs.readFileSync(filePath, 'utf8');

      for (const expectedSnippet of expectedContent) {
        expect(fileContent).toContain(expectedSnippet);
      }
    },
  );

  it('ships a valid Postman collection for app-settings reviewers', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(listVariableKeys(collection)).toEqual(
      expect.arrayContaining([
        'adminEmail',
        'salesEmail',
        'mechanicEmail',
        'currencyCode',
      ]),
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'Login as Sales',
        'Login as Mechanic',
        'Get Pricing Labor Settings as Sales',
        'Patch Pricing Labor Settings as Admin',
        'Patch Pricing Labor Settings as Sales is Forbidden',
        'Patch Pricing Labor Settings with Invalid Payload',
        'Re-read Pricing Labor Settings as Sales',
      ]),
    );
    expect(
      findRequest(collection, 'Get Pricing Labor Settings as Sales'),
    ).toMatchObject({
      method: 'GET',
      rawUrl: '{{baseUrl}}/app-settings/pricing-labor',
    });
    expect(
      findRequest(collection, 'Patch Pricing Labor Settings as Admin'),
    ).toMatchObject({
      method: 'PATCH',
      rawUrl: '{{baseUrl}}/app-settings/pricing-labor',
    });
    expect(
      findRawBody(collection, 'Patch Pricing Labor Settings as Admin'),
    ).toContain('"defaultLaborHourlyRate": 65000');
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

function listVariableKeys(collection: PostmanCollection): string[] {
  return (collection.variable ?? []).map((variable) => variable.key ?? '');
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

function findRawBody(collection: PostmanCollection, requestName: string) {
  const request = flattenItems(collection.item).find(
    (item) => item.name === requestName,
  );

  expect(request).toBeDefined();

  return request?.request?.body?.raw ?? '';
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
