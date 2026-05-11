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

const UNBOUND_SUPPLIER_QUOTE_ID = 'seed-supplier-quote-bosch-central-v1';

describe('work-order reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'work-orders');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-work-orders.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: [
        '# Work orders overview',
        'seed-work-order-sale-counter-quote',
        'seed-work-order-workshop-injector-repair',
      ],
    },
    {
      fileName: 'api-map.md',
      expectedContent: [
        '# Work orders API map',
        'PUT /work-orders/:id/estimates/:phase',
        'POST /work-orders/:id/payments',
      ],
    },
    {
      fileName: 'validation-rules.md',
      expectedContent: [
        '# Work orders validation rules',
        'WORKSHOP',
        'generated IDs',
      ],
    },
    {
      fileName: 'testing.md',
      expectedContent: [
        '# Work orders testing guide',
        'npm run test',
        'Postman',
      ],
    },
  ])(
    'ships $fileName with work-order reviewer guidance',
    ({ fileName, expectedContent }) => {
      const filePath = path.join(docsDir, fileName);

      expect(fs.existsSync(filePath)).toBeTruthy();

      const fileContent = fs.readFileSync(filePath, 'utf8');

      for (const expectedSnippet of expectedContent) {
        expect(fileContent).toContain(expectedSnippet);
      }
    },
  );

  it('ships a valid Postman collection for work-order reviewers', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(listVariableKeys(collection)).toEqual(
      expect.arrayContaining([
        'seedSaleWorkOrderId',
        'seedWorkshopWorkOrderId',
        'createdWorkOrderId',
        'estimatePhase',
        'unboundSupplierQuoteId',
      ]),
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'Get Seeded Sale Work Order',
        'Get Seeded Workshop Work Order',
        'Create Workshop Work Order',
        'Upsert Initial Estimate',
        'Create Actual Cost',
        'Create Payment',
        'Work Orders list forbidden for Mechanic',
      ]),
    );
    expect(findRequest(collection, 'Create Workshop Work Order')).toMatchObject(
      {
        method: 'POST',
        rawUrl: '{{baseUrl}}/work-orders',
      },
    );
    expect(findRequest(collection, 'Upsert Initial Estimate')).toMatchObject({
      method: 'PUT',
      rawUrl:
        '{{baseUrl}}/work-orders/{{createdWorkOrderId}}/estimates/{{estimatePhase}}',
    });
    expect(findRawBody(collection, 'Upsert Initial Estimate')).toContain(
      '"supplierQuoteHistoryId": "{{unboundSupplierQuoteId}}"',
    );
    expect(findRawBody(collection, 'Create Actual Cost')).toContain(
      '"supplierQuoteHistoryId": "{{unboundSupplierQuoteId}}"',
    );
    expect(findRawBody(collection, 'Upsert Initial Estimate')).not.toContain(
      'seed-supplier-quote-bosch-central-v2',
    );
    expect(findRawBody(collection, 'Create Actual Cost')).not.toContain(
      'seed-supplier-quote-bosch-central-v2',
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
