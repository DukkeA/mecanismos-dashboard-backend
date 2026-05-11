import * as fs from 'node:fs';
import * as path from 'node:path';

type PostmanCollectionItem = {
  name?: string;
  item?: PostmanCollectionItem[];
  request?: {
    method?: string;
    body?: { raw?: string };
    url?: { raw?: string };
  };
};

type PostmanCollection = {
  info?: { description?: string };
  item?: PostmanCollectionItem[];
  variable?: Array<{ key?: string; value?: string }>;
};

describe('employee-monthly-payroll reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'employee-monthly-payroll');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-employee-monthly-payroll.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: ['# Employee monthly payroll overview', 'DRAFT', 'FINALIZED'],
    },
    {
      fileName: 'api.md',
      expectedContent: ['# Employee monthly payroll API map', 'POST /employee-monthly-payroll/generate', 'POST /employee-monthly-payroll/:id/finalize'],
    },
    {
      fileName: 'rules.md',
      expectedContent: ['# Employee monthly payroll rules', 'UTC month window', 'immutable finalized periods'],
    },
    {
      fileName: 'testing.md',
      expectedContent: ['# Employee monthly payroll testing guide', 'npm run test', 'npm run test:e2e'],
    },
  ])('ships $fileName with payroll reviewer guidance', ({ fileName, expectedContent }) => {
    const filePath = path.join(docsDir, fileName);

    expect(fs.existsSync(filePath)).toBeTruthy();

    const fileContent = fs.readFileSync(filePath, 'utf8');

    for (const expectedSnippet of expectedContent) {
      expect(fileContent).toContain(expectedSnippet);
    }
  });

  it('ships a valid Postman collection for payroll reviewers', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(listVariableKeys(collection)).toEqual(
      expect.arrayContaining(['payrollId', 'payrollYear', 'payrollMonth']),
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'Login as Sales',
        'Login as Mechanic',
        'Generate Monthly Payroll',
        'Regenerate Monthly Payroll',
        'List Monthly Payroll',
        'Get Monthly Payroll Detail',
        'Finalize Monthly Payroll',
        'Generate Monthly Payroll as Mechanic is Forbidden',
        'Regenerate Finalized Monthly Payroll is Rejected',
      ]),
    );
    expect(findRequest(collection, 'Generate Monthly Payroll')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/employee-monthly-payroll/generate',
    });
    expect(findRequest(collection, 'Finalize Monthly Payroll')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/employee-monthly-payroll/{{payrollId}}/finalize',
    });
    expect(findRawBody(collection, 'Generate Monthly Payroll')).toContain(
      '"month": {{payrollMonth}}',
    );
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
