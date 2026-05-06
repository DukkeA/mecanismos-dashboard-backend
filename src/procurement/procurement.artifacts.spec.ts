import * as fs from 'node:fs';
import * as path from 'node:path';

describe('inventory procurement postman artifact', () => {
  const collectionPath = path.join(
    path.resolve(__dirname, '..', '..'),
    'test',
    'postman',
    'mecanismos-dashboard-inventory-procurement.postman_collection.json',
  );

  it('ships runner-ready requests for reviewer happy paths', () => {
    const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8')) as {
      info?: { description?: string };
      item?: Array<{ name?: string }>;
    };

    expect(collection.info?.description).toContain(
      'Runner-ready supplemental verification',
    );
    expect(collection.item?.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        'Login as Admin',
        'List Inventory Items',
        'Reject Negative Stock Movement',
        'Create Supplier Quote Event',
        'Void Supplier Quote',
      ]),
    );
  });
});
