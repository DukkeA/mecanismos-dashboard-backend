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

describe('expense reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'expenses');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-expenses.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: [
        '# Expenses overview',
        'ADMIN | SALES',
        'POST /expenses',
      ],
    },
    {
      fileName: 'api-map.md',
      expectedContent: [
        '# Expenses API map',
        'GET /expenses',
        'PATCH /expenses/:id',
      ],
    },
    {
      fileName: 'validation-rules.md',
      expectedContent: [
        '# Expenses validation rules',
        'paymentMethod',
        '404 Not Found',
      ],
    },
    {
      fileName: 'testing.md',
      expectedContent: [
        '# Expenses testing guide',
        'npm run test:e2e',
        'rollback',
      ],
    },
  ])(
    'ships $fileName with expense reviewer guidance',
    ({ fileName, expectedContent }) => {
      const filePath = path.join(docsDir, fileName);

      expect(fs.existsSync(filePath)).toBeTruthy();

      const fileContent = fs.readFileSync(filePath, 'utf8');

      for (const expectedSnippet of expectedContent) {
        expect(fileContent).toContain(expectedSnippet);
      }
    },
  );

  it('ships a valid Postman collection for expense reviewers', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'List Cost Centers for Expense Setup',
        'Create Scheduled Expense',
        'List Expenses',
        'Get Expense',
        'Mark Expense Paid',
        'Reject Unknown Cost Center',
        'Reject Payment Method Without paidAt',
        'Expense List forbidden for Mechanic',
      ]),
    );
    expect(findRequest(collection, 'Create Scheduled Expense')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/expenses',
    });
    expect(findRequest(collection, 'Mark Expense Paid')).toMatchObject({
      method: 'PATCH',
      rawUrl: '{{baseUrl}}/expenses/{{expenseId}}',
    });
    expect(JSON.stringify(collection)).toContain('{{expenseCostCenterId}}');
    expect(JSON.stringify(collection)).not.toContain('cost-center-1');
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
