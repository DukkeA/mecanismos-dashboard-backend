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
  event?: Array<{
    listen?: string;
    script?: {
      exec?: string[];
    };
  }>;
};

type PostmanCollection = {
  info?: {
    description?: string;
  };
  variable?: Array<{ key?: string; value?: string }>;
  item?: PostmanCollectionItem[];
};

describe('customer asset history reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'customer-asset-history');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-customer-asset-history.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: [
        '# Customer asset history overview',
        'read-only',
        'customers, vehicles, and components',
        'ADMIN | SALES',
      ],
    },
    {
      fileName: 'api-map.md',
      expectedContent: [
        '# Customer asset history API map',
        'GET /customer-asset-history/customers/:customerId',
        'GET /customer-asset-history/vehicles/:vehicleId',
        'GET /customer-asset-history/components/:componentId',
      ],
    },
    {
      fileName: 'validation-rules.md',
      expectedContent: [
        '# Customer asset history validation rules',
        'dateField',
        'createdAt',
        'completedAt',
        'estimatedCollectionAt',
      ],
    },
    {
      fileName: 'testing.md',
      expectedContent: [
        '# Customer asset history testing guide',
        'npm run test',
        'npm run test:e2e',
        'Postman',
      ],
    },
  ])(
    'ships $fileName with reviewer-facing history guidance',
    ({ fileName, expectedContent }) => {
      const filePath = path.join(docsDir, fileName);

      expect(fs.existsSync(filePath)).toBeTruthy();

      const fileContent = fs.readFileSync(filePath, 'utf8');

      for (const expectedSnippet of expectedContent) {
        expect(fileContent).toContain(expectedSnippet);
      }
    },
  );

  it('ships a valid Postman collection for customer asset history reviewers', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(listVariableKeys(collection)).toEqual(
      expect.arrayContaining([
        'seedCustomerId',
        'seedVehicleId',
        'seedComponentId',
      ]),
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'Get Customer History',
        'Get Vehicle History Page 1',
        'Get Completed Component History',
        'Reject Invalid History Query',
        'Customer Asset History forbidden for Mechanic',
      ]),
    );

    const customerRequest = findRequest(collection, 'Get Customer History');
    expect(customerRequest.method).toBe('GET');
    expect(customerRequest.rawUrl).toBe(
      '{{baseUrl}}/customer-asset-history/customers/{{seedCustomerId}}',
    );
    expect(customerRequest.testScriptCoverage).toEqual(
      expect.arrayContaining([
        expect.stringContaining("pm.test('customer history returns 200'"),
        expect.stringContaining(
          "pm.test('customer history returns scoped totals'",
        ),
      ]),
    );

    const vehicleRequest = findRequest(
      collection,
      'Get Vehicle History Page 1',
    );
    expect(vehicleRequest.method).toBe('GET');
    expect(vehicleRequest.rawUrl).toBe(
      '{{baseUrl}}/customer-asset-history/vehicles/{{seedVehicleId}}?page=1&limit=1&dateField=estimatedCollectionAt&dateFrom=2026-05-01T00:00:00.000Z&dateTo=2026-05-31T23:59:59.000Z',
    );

    const componentRequest = findRequest(
      collection,
      'Get Completed Component History',
    );
    expect(componentRequest.method).toBe('GET');
    expect(componentRequest.rawUrl).toBe(
      '{{baseUrl}}/customer-asset-history/components/{{seedComponentId}}?dateField=completedAt&dateFrom=2026-05-09T00:00:00.000Z&dateTo=2026-05-09T23:59:59.999Z&status=COMPLETED',
    );
  });
});

function readCollection(collectionPath: string): PostmanCollection {
  expect(fs.existsSync(collectionPath)).toBeTruthy();

  return JSON.parse(
    fs.readFileSync(collectionPath, 'utf8'),
  ) as PostmanCollection;
}

function listVariableKeys(collection: PostmanCollection): string[] {
  return (collection.variable ?? []).map((variable) => variable.key ?? '');
}

function listRequestNames(collection: PostmanCollection): string[] {
  return flattenItems(collection.item).map((item) => item.name ?? '');
}

function findRequest(collection: PostmanCollection, requestName: string) {
  const request = flattenItems(collection.item).find(
    (item) => item.name === requestName,
  );

  expect(request?.name).toBe(requestName);
  expect(request?.request?.method).toEqual(expect.any(String));
  expect(request?.request?.url?.raw).toEqual(
    expect.stringContaining('{{baseUrl}}/customer-asset-history/'),
  );

  const testScriptCoverage =
    request?.event
      ?.filter((event) => event.listen === 'test')
      .flatMap((event) => event.script?.exec ?? []) ?? [];

  expect(testScriptCoverage).toEqual(
    expect.arrayContaining([expect.stringContaining('pm.test(')]),
  );

  return {
    method: request?.request?.method ?? '',
    rawUrl: request?.request?.url?.raw ?? '',
    testScriptCoverage,
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
