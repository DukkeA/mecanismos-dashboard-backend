import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isLexicalNoteJson } from './lexical-note';

const POSTMAN_DIR = join(process.cwd(), 'test', 'postman');
const AFFECTED_COLLECTIONS = [
  'mecanismos-dashboard-customer-assets.postman_collection.json',
  'mecanismos-dashboard-suppliers.postman_collection.json',
  'mecanismos-dashboard-inventory-procurement.postman_collection.json',
  'mecanismos-dashboard-expenses.postman_collection.json',
  'mecanismos-dashboard-work-orders.postman_collection.json',
];

type PostmanItem = {
  name?: string;
  item?: PostmanItem[];
  request?: {
    body?: {
      mode?: string;
      raw?: string;
    };
  };
};

type PostmanCollection = {
  item?: PostmanItem[];
};

type NoteFinding = {
  collection: string;
  request: string;
  path: string;
  value: unknown;
};

describe('Postman rich text note examples', () => {
  it('keeps affected collection raw request bodies as valid JSON examples', () => {
    const malformedBodies = AFFECTED_COLLECTIONS.flatMap((collection) =>
      collectMalformedRawBodies(collection),
    );

    expect(malformedBodies).toEqual([]);
  });

  it('keeps affected collection note payload examples as Lexical JSON, null, or omitted', () => {
    const availableCollections = new Set(readdirSync(POSTMAN_DIR));

    expect(AFFECTED_COLLECTIONS.every((collection) => availableCollections.has(collection))).toBe(
      true,
    );

    const invalidNotes = AFFECTED_COLLECTIONS.flatMap((collection) =>
      collectInvalidNotes(collection),
    );

    expect(invalidNotes).toEqual([]);
  });
});

function collectMalformedRawBodies(collectionName: string): NoteFinding[] {
  const collection = JSON.parse(
    readFileSync(join(POSTMAN_DIR, collectionName), 'utf8'),
  ) as PostmanCollection;

  return (collection.item ?? []).flatMap((item) =>
    collectMalformedRawBodiesFromItem(collectionName, item, []),
  );
}

function collectMalformedRawBodiesFromItem(
  collection: string,
  item: PostmanItem,
  parentNames: string[],
): NoteFinding[] {
  const itemPath = [...parentNames, item.name ?? '(unnamed request)'];
  const childFindings = (item.item ?? []).flatMap((child) =>
    collectMalformedRawBodiesFromItem(collection, child, itemPath),
  );
  const body = item.request?.body;

  if (body?.mode !== 'raw' || body.raw === undefined) {
    return childFindings;
  }

  try {
    JSON.parse(body.raw);
    return childFindings;
  } catch (error) {
    return [
      ...childFindings,
      {
        collection,
        request: itemPath.join(' > '),
        path: '$',
        value: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

function collectInvalidNotes(collectionName: string): NoteFinding[] {
  const collection = JSON.parse(
    readFileSync(join(POSTMAN_DIR, collectionName), 'utf8'),
  ) as PostmanCollection;

  return (collection.item ?? []).flatMap((item) =>
    collectInvalidNotesFromItem(collectionName, item, []),
  );
}

function collectInvalidNotesFromItem(
  collection: string,
  item: PostmanItem,
  parentNames: string[],
): NoteFinding[] {
  const itemPath = [...parentNames, item.name ?? '(unnamed request)'];
  const childFindings = (item.item ?? []).flatMap((child) =>
    collectInvalidNotesFromItem(collection, child, itemPath),
  );
  const body = item.request?.body;

  if (body?.mode !== 'raw' || body.raw === undefined) {
    return childFindings;
  }

  const parsedBody = JSON.parse(body.raw);
  const request = itemPath.join(' > ');

  return [...childFindings, ...findInvalidNoteValues(collection, request, parsedBody, '$')];
}

function findInvalidNoteValues(
  collection: string,
  request: string,
  value: unknown,
  path: string,
): NoteFinding[] {
  if (Array.isArray(value)) {
    return value.flatMap((child, index) =>
      findInvalidNoteValues(collection, request, child, `${path}[${index}]`),
    );
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;

    if (key === 'notes') {
      return child === null || isLexicalNoteJson(child)
        ? []
        : [{ collection, request, path: childPath, value: child }];
    }

    return findInvalidNoteValues(collection, request, child, childPath);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
