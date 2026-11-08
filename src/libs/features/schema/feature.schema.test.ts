// biome-ignore-all lint/suspicious/noExplicitAny: tests build features with wrongly typed values

import { Ajv2020 } from 'ajv/dist/2020';
import mapSchema from 'map/schema/map.schema.json';
import { describe, expect, test } from 'vitest';
import schema from './feature.schema.json';
import completeFeature from './samples/complete.feature.json';
import minimalFeature from './samples/minimal.feature.json';

const validate = new Ajv2020()
    .addSchema(mapSchema, 'map.schema.json')
    .compile(schema);

describe('samples', () => {
    test('accepts a feature with no participants, edits or reviews', () => {
        expect(validate(minimalFeature)).toBe(true);
    });

    test('accepts a feature using every operation, review status and participant kind', () => {
        expect(validate(completeFeature)).toBe(true);
    });
});

describe('feature', () => {
    test('rejects a feature without a schema version', () => {
        const feature: any = structuredClone(completeFeature);
        delete feature.schemaVersion;
        expect(validate(feature)).toBe(false);
    });

    test.each(['v0.2.0', 'v1.0.0', '0.1.0', 'v0.1'])(
        'rejects the schema version %s',
        (schemaVersion) => {
            const feature: any = structuredClone(completeFeature);
            feature.schemaVersion = schemaVersion;
            expect(validate(feature)).toBe(false);
        },
    );

    test.each(['id', 'parent', 'participants', 'status', 'edits', 'reviews'])(
        'rejects a feature without its %s',
        (field) => {
            const feature: any = structuredClone(completeFeature);
            delete feature[field];
            expect(validate(feature)).toBe(false);
        },
    );

    test.each(['name', 'description', '$schema'])(
        'accepts a feature without its %s',
        (field) => {
            const feature: any = structuredClone(completeFeature);
            delete feature[field];
            expect(validate(feature)).toBe(true);
        },
    );

    test.each([
        '0B7E5A52-3C1F-4D8E-A2B9-5F6C7D8E9A01',
        '0b7e5a52-3c1f-4d8e-a2b9-5f6c7d8e9a01',
    ])('accepts the id %s', (id) => {
        const feature: any = structuredClone(completeFeature);
        feature.id = id;
        expect(validate(feature)).toBe(true);
    });

    test.each([
        'FEAT-001',
        'c232ab00-9414-11ec-b3c8-9e6bdeced846',
        '0b7e5a523c1f4d8ea2b95f6c7d8e9a01',
    ])('rejects the id %s', (id) => {
        const feature: any = structuredClone(completeFeature);
        feature.id = id;
        expect(validate(feature)).toBe(false);
    });

    test('accepts a feature starting from the map', () => {
        const feature: any = structuredClone(completeFeature);
        feature.parent = 'map';
        expect(validate(feature)).toBe(true);
    });

    test.each(['layout', 'main', ''])("rejects the parent '%s'", (parent) => {
        const feature: any = structuredClone(completeFeature);
        feature.parent = parent;
        expect(validate(feature)).toBe(false);
    });

    test.each(['open', 'merged'])('accepts the status %s', (status) => {
        const feature: any = structuredClone(completeFeature);
        feature.status = status;
        expect(validate(feature)).toBe(true);
    });

    test.each(['closed', 'pending'])('rejects the status %s', (status) => {
        const feature: any = structuredClone(completeFeature);
        feature.status = status;
        expect(validate(feature)).toBe(false);
    });

    test('rejects a field it does not define', () => {
        const feature: any = structuredClone(completeFeature);
        feature.branch = 'main';
        expect(validate(feature)).toBe(false);
    });
});

describe('participants', () => {
    test.each(['id', 'name', 'kind'])(
        'rejects a participant without its %s',
        (field) => {
            const feature: any = structuredClone(completeFeature);
            delete feature.participants[0][field];
            expect(validate(feature)).toBe(false);
        },
    );

    test('rejects an unknown participant kind', () => {
        const feature: any = structuredClone(completeFeature);
        feature.participants[0].kind = 'bot';
        expect(validate(feature)).toBe(false);
    });

    test('rejects a field it does not define', () => {
        const feature: any = structuredClone(completeFeature);
        feature.participants[0].email = 'dana@example.com';
        expect(validate(feature)).toBe(false);
    });
});

describe('edits', () => {
    test.each([
        'id',
        'author',
        'source',
        'needsReview',
        'createdAt',
        'baseVersion',
        'resultingVersion',
        'transaction',
    ])('rejects an edit without its %s', (field) => {
        const feature: any = structuredClone(completeFeature);
        delete feature.edits[0][field];
        expect(validate(feature)).toBe(false);
    });

    test.each(['description', 'dependsOn', 'amendsEdit'])(
        'accepts an edit without its %s',
        (field) => {
            const feature: any = structuredClone(completeFeature);
            delete feature.edits[2][field];
            expect(validate(feature)).toBe(true);
        },
    );

    test('rejects an unknown source', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].source = 'api';
        expect(validate(feature)).toBe(false);
    });

    test('rejects a field it does not define', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].status = 'approved';
        expect(validate(feature)).toBe(false);
    });

    test.each(['2026-11-08', '2026-11-08 09:00:00Z', '2026-11-08T09:00:00'])(
        'rejects the timestamp %s',
        (createdAt) => {
            const feature: any = structuredClone(completeFeature);
            feature.edits[0].createdAt = createdAt;
            expect(validate(feature)).toBe(false);
        },
    );

    test.each([-1, 1.5, '13'])('rejects the version %s', (version) => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].baseVersion = version;
        expect(validate(feature)).toBe(false);
    });

    test('accepts an empty transaction', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].transaction = [];
        expect(validate(feature)).toBe(true);
    });

    test.each([
        { target: 'c1000000-0000-4000-8000-000000000001' },
        { target: 'layout', field: 'zoom' },
    ])('accepts the dependency %o', (dependency) => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].dependsOn = [dependency];
        expect(validate(feature)).toBe(true);
    });

    test.each([
        { field: 'summary' },
        { target: 'items' },
        { target: 'map', field: 'name', value: 'Cafe' },
    ])('rejects the dependency %o', (dependency) => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].dependsOn = [dependency];
        expect(validate(feature)).toBe(false);
    });
});

describe('operations', () => {
    test.each(['item', 'relationship', 'map', 'layout', 'layoutEntry'])(
        'accepts creating a %s',
        (kind) => {
            const feature: any = structuredClone(completeFeature);
            feature.edits[0].transaction = [
                { op: 'create', kind, newValue: {} },
            ];
            expect(validate(feature)).toBe(true);
        },
    );

    test.each(['item', 'relationship', 'map', 'layout', 'layoutEntry'])(
        'accepts deleting a %s',
        (kind) => {
            const feature: any = structuredClone(completeFeature);
            feature.edits[0].transaction = [
                { op: 'delete', kind, target: 'map', oldValue: {} },
            ];
            expect(validate(feature)).toBe(true);
        },
    );

    test('rejects an unknown entity kind', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].transaction = [
            { op: 'create', kind: 'folder', newValue: {} },
        ];
        expect(validate(feature)).toBe(false);
    });

    test('rejects an unknown operation', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].transaction = [
            { op: 'move', target: 'map', field: 'name' },
        ];
        expect(validate(feature)).toBe(false);
    });

    test.each([
        ['create', { op: 'create', kind: 'item' }],
        ['delete', { op: 'delete', kind: 'item', target: 'map' }],
        ['set', { op: 'set', target: 'map', field: 'name', newValue: 'Cafe' }],
        ['unset', { op: 'unset', target: 'map', field: 'name' }],
    ])('rejects a %s without the value it needs', (_, operation) => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].transaction = [operation];
        expect(validate(feature)).toBe(false);
    });

    test('rejects a create naming a target', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].transaction = [
            { op: 'create', kind: 'map', target: 'map', newValue: {} },
        ];
        expect(validate(feature)).toBe(false);
    });

    test('rejects a set without a field', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].transaction = [
            { op: 'set', target: 'map', newValue: {}, oldValue: {} },
        ];
        expect(validate(feature)).toBe(false);
    });

    test('rejects a target that is neither a uuid, the map nor the layout', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].transaction = [
            { op: 'unset', target: 'COM-001', field: 'label', oldValue: 'A' },
        ];
        expect(validate(feature)).toBe(false);
    });

    test.each([null, 0, 'text', [1, 2], { unknown: { nested: true } }])(
        'accepts the value %o',
        (value) => {
            const feature: any = structuredClone(completeFeature);
            feature.edits[0].transaction = [
                {
                    op: 'set',
                    target: 'map',
                    field: 'name',
                    newValue: value,
                    oldValue: value,
                },
            ];
            expect(validate(feature)).toBe(true);
        },
    );
});

describe('reviews', () => {
    test.each(['id', 'edit', 'status', 'by', 'at'])(
        'rejects a review without its %s',
        (field) => {
            const feature: any = structuredClone(completeFeature);
            delete feature.reviews[0][field];
            expect(validate(feature)).toBe(false);
        },
    );

    test('accepts a review without a comment', () => {
        const feature: any = structuredClone(completeFeature);
        delete feature.reviews[0].comment;
        expect(validate(feature)).toBe(true);
    });

    test.each(['pending', 'amended'])('rejects the status %s', (status) => {
        const feature: any = structuredClone(completeFeature);
        feature.reviews[0].status = status;
        expect(validate(feature)).toBe(false);
    });

    test('rejects a field it does not define', () => {
        const feature: any = structuredClone(completeFeature);
        feature.reviews[0].score = 5;
        expect(validate(feature)).toBe(false);
    });
});

describe('cross-entry rules are left to the code applying edits', () => {
    test('accepts a review of an edit the feature does not hold', () => {
        const feature: any = structuredClone(completeFeature);
        feature.reviews[0].edit = crypto.randomUUID();
        expect(validate(feature)).toBe(true);
    });

    test('accepts an author who is not a participant', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].author = crypto.randomUUID();
        expect(validate(feature)).toBe(true);
    });

    test('accepts a resulting version lower than the base version', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[0].resultingVersion = 1;
        expect(validate(feature)).toBe(true);
    });

    test('accepts an edit amending an approved edit', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[4].amendsEdit = feature.edits[2].id;
        expect(validate(feature)).toBe(true);
    });

    test('accepts a set whose old value does not match the map', () => {
        const feature: any = structuredClone(completeFeature);
        feature.edits[1].transaction[0].oldValue = 'Not the old summary';
        expect(validate(feature)).toBe(true);
    });
});
