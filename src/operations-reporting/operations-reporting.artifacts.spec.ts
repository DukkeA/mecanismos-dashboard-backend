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

describe('operations-reporting reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'operations-reporting');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-operations-reporting.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: [
        '# Operations reporting overview',
        'seed-work-order-workshop-partial-payment',
        'seed-work-order-workshop-unknown-payable',
        'cash-operational',
      ],
    },
    {
      fileName: 'api-map.md',
      expectedContent: [
        '# Operations reporting API map',
        'GET /operations-reporting/summary',
        'GET /operations-reporting/mechanics',
        'GET /operations-reporting/expenses',
      ],
    },
    {
      fileName: 'validation-rules.md',
      expectedContent: [
        '# Operations reporting validation rules',
        'dateFrom',
        'dateTo',
        'null',
      ],
    },
    {
      fileName: 'testing.md',
      expectedContent: [
        '# Operations reporting testing guide',
        'npm run test',
        'Postman',
        'rollback',
      ],
    },
  ])('ships $fileName with operations-reporting reviewer guidance', ({ fileName, expectedContent }) => {
    const filePath = path.join(docsDir, fileName);

    expect(fs.existsSync(filePath)).toBeTruthy();

    const fileContent = fs.readFileSync(filePath, 'utf8');

    for (const expectedSnippet of expectedContent) {
      expect(fileContent).toContain(expectedSnippet);
    }
  });

  it('ships a valid Postman collection for all operations-reporting routes', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(listVariableKeys(collection)).toEqual(
      expect.arrayContaining([
        'seedPartialWorkOrderId',
        'seedUnknownPayableWorkOrderId',
        'seedMechanicEmployeeId',
      ]),
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'Get Summary Report',
        'Get Pending Payments Report',
        'Get Work-Order Profitability Report',
        'Get Mechanics Report',
        'Get Expenses Report',
        'Reject Invalid Summary Date Range',
        'Operations Reporting forbidden for Mechanic',
      ]),
    );
    expect(findRequest(collection, 'Get Summary Report')).toMatchObject({
      method: 'GET',
      rawUrl:
        '{{baseUrl}}/operations-reporting/summary?dateFrom=2026-04-01T00:00:00.000Z&dateTo=2026-05-31T23:59:59.999Z',
      testScriptCoverage: expect.arrayContaining([
        expect.stringContaining("pm.test('summary returns 200'"),
        expect.stringContaining("pm.test('summary is approximate cash-operational'"),
      ]),
    });
    expect(findRequest(collection, 'Get Pending Payments Report')).toMatchObject({
      method: 'GET',
      rawUrl:
        '{{baseUrl}}/operations-reporting/pending-payments?paymentStatus=PARTIAL&dateFrom=2026-04-01T00:00:00.000Z&dateTo=2026-05-31T23:59:59.999Z',
      testScriptCoverage: expect.arrayContaining([
        expect.stringContaining("pm.test('pending payments returns 200'"),
        expect.stringContaining(
          "pm.test('partial payment row exposes remaining balance'",
        ),
        expect.stringContaining(
          "pm.test('unknown payable row keeps balance null'",
        ),
      ]),
    });
    expect(findRequest(collection, 'Get Expenses Report')).toMatchObject({
      method: 'GET',
      rawUrl:
        '{{baseUrl}}/operations-reporting/expenses?dateFrom=2026-04-01T00:00:00.000Z&dateTo=2026-05-31T23:59:59.999Z',
      testScriptCoverage: expect.arrayContaining([
        expect.stringContaining("pm.test('expenses report returns 200'"),
        expect.stringContaining(
          "pm.test('expenses report includes paid and pending seeded rows'",
        ),
      ]),
    });
  });
});

function readCollection(collectionPath: string): PostmanCollection {
  expect(fs.existsSync(collectionPath)).toBeTruthy();

  return JSON.parse(fs.readFileSync(collectionPath, 'utf8')) as PostmanCollection;
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

  expect(request).toMatchObject({
    name: requestName,
    request: {
      method: expect.any(String),
      url: {
        raw: expect.stringContaining('{{baseUrl}}/operations-reporting/'),
      },
    },
  });

  const testScriptCoverage =
    request?.event
      ?.filter((event) => event.listen === 'test')
      .flatMap((event) => event.script?.exec ?? []) ?? [];

  expect(testScriptCoverage).toEqual(
    expect.arrayContaining([expect.stringContaining('pm.test(')]),
  );

  return {
    method: request?.request?.method,
    rawUrl: request?.request?.url?.raw,
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
