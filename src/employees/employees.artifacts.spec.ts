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

describe('employee reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'employees');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-employees.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: [
        '# Employees overview',
        'ADMIN | SALES',
        'POST /employees',
      ],
    },
    {
      fileName: 'api-map.md',
      expectedContent: [
        '# Employees API map',
        'GET /employees',
        'POST /employees/:id/bonuses',
      ],
    },
    {
      fileName: 'validation-rules.md',
      expectedContent: [
        '# Employees validation rules',
        'baseSalaryMonthly',
        '404 Not Found',
      ],
    },
    {
      fileName: 'testing.md',
      expectedContent: [
        '# Employees testing guide',
        'npm run test:e2e',
        'rollback',
      ],
    },
  ])(
    'ships $fileName with employee reviewer guidance',
    ({ fileName, expectedContent }) => {
      const filePath = path.join(docsDir, fileName);

      expect(fs.existsSync(filePath)).toBeTruthy();

      const fileContent = fs.readFileSync(filePath, 'utf8');

      for (const expectedSnippet of expectedContent) {
        expect(fileContent).toContain(expectedSnippet);
      }
    },
  );

  it('ships a valid Postman collection for employee reviewers', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'Create Employee',
        'List Employees',
        'Get Employee',
        'Deactivate Employee',
        'List Cost Center Options',
        'Create Employee Bonus',
        'List Employee Bonuses',
        'Employee List forbidden for Mechanic',
      ]),
    );
    expect(findRequest(collection, 'Create Employee')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/employees',
    });
    expect(findRequest(collection, 'Create Employee Bonus')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/employees/{{employeeId}}/bonuses',
    });
    expect(JSON.stringify(collection)).toContain('{{employeeCostCenterId}}');
    expect(JSON.stringify(collection)).not.toContain(
      'seed-cost-center-general',
    );
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
