import * as fs from 'node:fs';
import * as path from 'node:path';

type PostmanCollection = {
  info?: {
    description?: string;
  };
  item?: Array<{
    name?: string;
    request?: {
      method?: string;
      url?: {
        raw?: string;
      };
    };
  }>;
};

describe('auth reviewer artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(projectRoot, 'docs', 'auth');
  const postmanCollectionPath = path.join(
    projectRoot,
    'test',
    'postman',
    'mecanismos-dashboard-auth.postman_collection.json',
  );

  it.each([
    {
      fileName: 'overview.md',
      expectedContent: [
        '# Auth v1 overview',
        'POST /auth/login',
        'GET /auth/me',
      ],
    },
    {
      fileName: 'schema.md',
      expectedContent: ['# Auth schema quick map', 'session', 'familyId'],
    },
    {
      fileName: 'security.md',
      expectedContent: ['# Auth security posture', 'CSRF posture', 'Origin'],
    },
    {
      fileName: 'testing.md',
      expectedContent: ['# Auth testing guide', 'AUTOMATED TESTS', 'Postman'],
    },
  ])(
    'ships $fileName with auth-specific reviewer guidance',
    ({ fileName, expectedContent }) => {
      const filePath = path.join(docsDir, fileName);

      expect(fs.existsSync(filePath)).toBeTruthy();

      const fileContent = fs.readFileSync(filePath, 'utf8');

      for (const expectedSnippet of expectedContent) {
        expect(fileContent).toContain(expectedSnippet);
      }
    },
  );

  it('ships a valid Postman collection for the slice 2 auth session flows', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(collection.info?.description).toContain(
      'Supplemental manual verification',
    );
    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining(['Login', 'Refresh', 'Logout']),
    );
    expect(findRequest(collection, 'Login')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/auth/login',
    });
    expect(findRequest(collection, 'Refresh')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/auth/refresh',
    });
    expect(findRequest(collection, 'Logout')).toMatchObject({
      method: 'POST',
      rawUrl: '{{baseUrl}}/auth/logout',
    });
  });

  it('extends the Postman collection with implemented protected auth endpoints', () => {
    const collection = readCollection(postmanCollectionPath);

    expect(listRequestNames(collection)).toEqual(
      expect.arrayContaining(['Me', 'Admin Smoke']),
    );
    expect(findRequest(collection, 'Me')).toMatchObject({
      method: 'GET',
      rawUrl: '{{baseUrl}}/auth/me',
    });
    expect(findRequest(collection, 'Admin Smoke')).toMatchObject({
      method: 'GET',
      rawUrl: '{{baseUrl}}/auth/admin/smoke',
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
  return collection.item?.map((item) => item.name ?? '') ?? [];
}

function findRequest(collection: PostmanCollection, requestName: string) {
  const request = collection.item?.find((item) => item.name === requestName);

  expect(request).toBeDefined();

  return {
    method: request?.request?.method,
    rawUrl: request?.request?.url?.raw,
  };
}
