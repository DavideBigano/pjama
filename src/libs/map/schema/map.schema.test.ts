// biome-ignore-all lint/suspicious/noExplicitAny: tests build maps with wrongly typed values

import { Ajv2020 } from 'ajv/dist/2020';
import { describe, expect, test } from 'vitest';
import schema from './map.schema.json';
import completeMap from './samples/complete.map.json';
import minimalMap from './samples/minimal.map.json';

const validate = new Ajv2020().compile(schema);

describe('samples', () => {
    test('accepts a map with empty collections', () => {
        expect(validate(minimalMap)).toBe(true);
    });

    test('accepts a map using every item and relationship type', () => {
        expect(validate(completeMap)).toBe(true);
    });
});

describe('map', () => {
    test('rejects a map without a schema version', () => {
        const map: any = structuredClone(completeMap);
        delete map.schemaVersion;
        expect(validate(map)).toBe(false);
    });

    test.each(['v0.2.0', 'v1.0.0', 'v0.0.9', '0.1.0', 'v0.1'])(
        'rejects the schema version %s',
        (schemaVersion) => {
            const map: any = structuredClone(completeMap);
            map.schemaVersion = schemaVersion;
            expect(validate(map)).toBe(false);
        },
    );

    test.each([
        '2d5e4def-29b8-4222-8faa-108e21b7cc65',
        '2D5E4DEF-29B8-4222-8FAA-108E21B7CC65',
    ])('accepts the id %s', (id) => {
        const map: any = structuredClone(completeMap);
        map.id = id;
        expect(validate(map)).toBe(true);
    });

    test.each([
        'MAP-001',
        'c232ab00-9414-11ec-b3c8-9e6bdeced846',
        '2d5e4def29b842228faa108e21b7cc65',
        '2d5e4def-29b8-4222-8faa-108e21b7cc6',
    ])('rejects the id %s', (id) => {
        const map: any = structuredClone(completeMap);
        map.id = id;
        expect(validate(map)).toBe(false);
    });

    test.each(['cafe-orders', 'orders', 'v2-api'])(
        'accepts the slug %s',
        (slug) => {
            const map: any = structuredClone(completeMap);
            map.slug = slug;
            expect(validate(map)).toBe(true);
        },
    );

    test.each([
        'Cafe-orders',
        'cafe orders',
        'cafe--orders',
        '-cafe',
        'cafe-',
        'café',
        '',
    ])("rejects the slug '%s'", (slug) => {
        const map: any = structuredClone(completeMap);
        map.slug = slug;
        expect(validate(map)).toBe(false);
    });

    test('rejects a map without a project root', () => {
        const map: any = structuredClone(completeMap);
        delete map.root;
        expect(validate(map)).toBe(false);
    });

    test.each(['items', 'relationships'])(
        'rejects a map without its %s collection',
        (collection) => {
            const map: any = structuredClone(completeMap);
            delete map[collection];
            expect(validate(map)).toBe(false);
        },
    );

    test('rejects a collection per item type', () => {
        const map: any = structuredClone(minimalMap);
        map.components = [];
        expect(validate(map)).toBe(false);
    });

    test('accepts a map without $schema', () => {
        const map: any = structuredClone(completeMap);
        delete map.$schema;
        expect(validate(map)).toBe(true);
    });
});

describe('items', () => {
    test.each([
        '@pjama/component',
        '@pjama/requirement',
        '@pjama/use-case',
        '@pjama/interface',
        '@pjama/snippet',
        '@pjama/type',
        '@pjama/mockup',
        '@pjama/technology',
        '@pjama/actor',
        '@pjama/resource',
        '@pjama/decision',
        '@pjama/review',
        '@pjama/test',
        '@pjama/interface-statement',
        '@pjama/use-case-prerequisite',
        '@pjama/review-criterion',
        '@pjama/use-case-step',
        '@pjama/decision-option',
        '@pjama/interface-parameter',
    ])('accepts a %s with only its id and type', (type) => {
        const map: any = structuredClone(minimalMap);
        map.items.push({ id: crypto.randomUUID(), type });
        expect(validate(map)).toBe(true);
    });

    test('rejects an item without an id', () => {
        const map: any = structuredClone(completeMap);
        delete map.items[0].id;
        expect(validate(map)).toBe(false);
    });

    test('rejects an item without a type', () => {
        const map: any = structuredClone(completeMap);
        delete map.items[0].type;
        expect(validate(map)).toBe(false);
    });

    test('rejects an unknown item type', () => {
        const map: any = structuredClone(minimalMap);
        map.items.push({ id: crypto.randomUUID(), type: '@pjama/goal' });
        expect(validate(map)).toBe(false);
    });

    test('rejects an item type without its namespace', () => {
        const map: any = structuredClone(minimalMap);
        map.items.push({ id: crypto.randomUUID(), type: 'component' });
        expect(validate(map)).toBe(false);
    });

    test('rejects a relationship in the items collection', () => {
        const map: any = structuredClone(completeMap);
        map.items.push(map.relationships[0]);
        expect(validate(map)).toBe(false);
    });

    test('rejects fields that are not part of the item', () => {
        const map: any = structuredClone(completeMap);
        const actor = map.items.find(
            (item: any) => item.type === '@pjama/actor',
        );
        actor.label = 'Customer';
        expect(validate(map)).toBe(false);
    });

    test('rejects fields of another item type', () => {
        const map: any = structuredClone(completeMap);
        const actor = map.items.find(
            (item: any) => item.type === '@pjama/actor',
        );
        actor.location = 'docs/customer.md';
        expect(validate(map)).toBe(false);
    });

    test('rejects notes that are not text', () => {
        const map: any = structuredClone(completeMap);
        const actor = map.items.find(
            (item: any) => item.type === '@pjama/actor',
        );
        actor.notes = ['first note'];
        expect(validate(map)).toBe(false);
    });
});

describe('secondary items', () => {
    test('rejects a named statement', () => {
        const map: any = structuredClone(completeMap);
        const statement = map.items.find(
            (item: any) => item.type === '@pjama/interface-statement',
        );
        statement.name = 'Account exists';
        expect(validate(map)).toBe(false);
    });

    test('rejects notes on a step', () => {
        const map: any = structuredClone(completeMap);
        const step = map.items.find(
            (item: any) => item.type === '@pjama/use-case-step',
        );
        step.notes = 'Usually on mobile';
        expect(validate(map)).toBe(false);
    });

    test('rejects a parameter typed with a bare type id', () => {
        const map: any = structuredClone(completeMap);
        const parameter = map.items.find(
            (item: any) => item.paramName === 'email',
        );
        parameter.definition = '7323a02c-0316-4d05-9723-4b25b60e33f8';
        expect(validate(map)).toBe(false);
    });
});

describe('components', () => {
    test('rejects a component holding its own spec list', () => {
        const map: any = structuredClone(completeMap);
        const component = map.items.find(
            (item: any) => item.type === '@pjama/component',
        );
        component.specs = [];
        expect(validate(map)).toBe(false);
    });

    test('rejects a positioned component', () => {
        const map: any = structuredClone(completeMap);
        const component = map.items.find(
            (item: any) => item.type === '@pjama/component',
        );
        component.position = 'a';
        expect(validate(map)).toBe(false);
    });
});

describe('specs', () => {
    test('rejects a category that is not text', () => {
        const map: any = structuredClone(completeMap);
        const requirement = map.items.find(
            (item: any) => item.type === '@pjama/requirement',
        );
        requirement.category = ['performance'];
        expect(validate(map)).toBe(false);
    });

    test('rejects a requirement carrying fields of another spec type', () => {
        const map: any = structuredClone(completeMap);
        const requirement = map.items.find(
            (item: any) => item.type === '@pjama/requirement',
        );
        requirement.body = 'return true';
        expect(validate(map)).toBe(false);
    });
});

describe('types', () => {
    test('rejects an unknown type kind', () => {
        const map: any = structuredClone(completeMap);
        const role = map.items.find((item: any) => item.name === 'Role');
        role.definition = { kind: 'tuple', of: [] };
        expect(validate(map)).toBe(false);
    });

    test('rejects a constant given as a parsed value', () => {
        const map: any = structuredClone(completeMap);
        const role = map.items.find((item: any) => item.name === 'Role');
        role.definition = { kind: 'constant', value: 42 };
        expect(validate(map)).toBe(false);
    });

    test('rejects a struct field without a type', () => {
        const map: any = structuredClone(completeMap);
        const user = map.items.find((item: any) => item.name === 'User');
        delete user.definition.of[0].fields[0].type;
        expect(validate(map)).toBe(false);
    });

    test('rejects an invalid type nested inside an array', () => {
        const map: any = structuredClone(completeMap);
        const user = map.items.find((item: any) => item.name === 'User');
        user.definition.of[1].fields[0].type.of = { kind: 'primitive' };
        expect(validate(map)).toBe(false);
    });

    test('rejects a union alternative given as a bare type', () => {
        const map: any = structuredClone(completeMap);
        const role = map.items.find((item: any) => item.name === 'Role');
        role.definition.of[0] = { kind: 'constant', value: '"customer"' };
        expect(validate(map)).toBe(false);
    });

    test('rejects a reference to a type by name', () => {
        const map: any = structuredClone(completeMap);
        const user = map.items.find((item: any) => item.name === 'User');
        user.definition.of[0].fields[1].type.type = 'Role';
        expect(validate(map)).toBe(false);
    });
});

describe('mockups', () => {
    test('rejects inline HTML that is not text', () => {
        const map: any = structuredClone(completeMap);
        const mockup = map.items.find(
            (item: any) => item.name === 'Login form',
        );
        mockup.html = { body: mockup.html };
        expect(validate(map)).toBe(false);
    });
});

describe('decisions', () => {
    test('rejects a stored status', () => {
        const map: any = structuredClone(completeMap);
        const decision = map.items.find(
            (item: any) => item.type === '@pjama/decision',
        );
        decision.status = 'closed';
        expect(validate(map)).toBe(false);
    });

    test('rejects a closed flag that is not a boolean', () => {
        const map: any = structuredClone(completeMap);
        const decision = map.items.find(
            (item: any) => item.type === '@pjama/decision',
        );
        decision.closed = 'yes';
        expect(validate(map)).toBe(false);
    });
});

describe('checks', () => {
    test.each(['human', 'agent'])('accepts the reviewer %s', (reviewer) => {
        const map: any = structuredClone(completeMap);
        const review = map.items.find(
            (item: any) => item.type === '@pjama/review',
        );
        review.reviewer = reviewer;
        expect(validate(map)).toBe(true);
    });

    test.each(['anyone', 'Human', ''])(
        "rejects the reviewer '%s'",
        (reviewer) => {
            const map: any = structuredClone(completeMap);
            const review = map.items.find(
                (item: any) => item.type === '@pjama/review',
            );
            review.reviewer = reviewer;
            expect(validate(map)).toBe(false);
        },
    );

    test('rejects a stored review result', () => {
        const map: any = structuredClone(completeMap);
        const review = map.items.find(
            (item: any) => item.type === '@pjama/review',
        );
        review.state = 'passing';
        expect(validate(map)).toBe(false);
    });

    test('rejects a stored test result', () => {
        const map: any = structuredClone(completeMap);
        const check = map.items.find(
            (item: any) => item.type === '@pjama/test',
        );
        check.lastRun = '2026-10-25T10:00:00Z';
        expect(validate(map)).toBe(false);
    });

    test('accepts any plugin configuration', () => {
        const map: any = structuredClone(completeMap);
        const check = map.items.find(
            (item: any) => item.type === '@pjama/test',
        );
        check.config = { files: ['a.test.ts'], retries: 2 };
        expect(validate(map)).toBe(true);
    });
});

describe('relationships', () => {
    test.each([
        '@pjama/containment',
        '@pjama/dependency',
        '@pjama/implementation',
        '@pjama/enforcement',
        '@pjama/derivation',
        '@pjama/input-to-interface',
        '@pjama/output-to-interface',
        '@pjama/precondition-to-interface',
        '@pjama/postcondition-to-interface',
        '@pjama/invariant-to-interface',
        '@pjama/protocol-to-interface',
        '@pjama/step-to-use-case',
        '@pjama/prerequisite-to-use-case',
        '@pjama/use-case-to-actor',
        '@pjama/step-to-next',
        '@pjama/step-to-sibling',
        '@pjama/option-to-decision',
        '@pjama/decision-to-chosen-option',
        '@pjama/decision-to-reference',
        '@pjama/decision-to-override',
        '@pjama/criterion-to-review',
        '@pjama/review-to-resource',
        '@pjama/component-to-resource',
        '@pjama/technology-to-documentation',
        '@pjama/mockup-to-resource',
        '@pjama/spec-to-component',
        '@pjama/dependency-to-selected-spec',
        '@pjama/implementation-to-excluded-spec',
    ])('accepts a %s with only its identity fields', (type) => {
        const map: any = structuredClone(minimalMap);
        map.relationships.push({
            id: crypto.randomUUID(),
            type,
            source: crypto.randomUUID(),
            target: crypto.randomUUID(),
        });
        expect(validate(map)).toBe(true);
    });

    test('rejects a relationship without a source', () => {
        const map: any = structuredClone(completeMap);
        delete map.relationships[0].source;
        expect(validate(map)).toBe(false);
    });

    test('rejects a relationship without a target', () => {
        const map: any = structuredClone(completeMap);
        delete map.relationships[0].target;
        expect(validate(map)).toBe(false);
    });

    test('rejects an unknown relationship type', () => {
        const map: any = structuredClone(completeMap);
        map.relationships[0].type = '@pjama/inheritance';
        expect(validate(map)).toBe(false);
    });

    test('rejects an item in the relationships collection', () => {
        const map: any = structuredClone(completeMap);
        map.relationships.push(map.items[0]);
        expect(validate(map)).toBe(false);
    });

    test('rejects a named relationship', () => {
        const map: any = structuredClone(completeMap);
        map.relationships[0].name = 'Spec of the app';
        expect(validate(map)).toBe(false);
    });

    test('rejects relationship notes that are not text', () => {
        const map: any = structuredClone(completeMap);
        map.relationships[0].notes = ['first note'];
        expect(validate(map)).toBe(false);
    });

    test('rejects selected specs held by the dependency', () => {
        const map: any = structuredClone(completeMap);
        const dependency = map.relationships.find(
            (relationship: any) => relationship.type === '@pjama/dependency',
        );
        dependency.selectedSpecs = [];
        expect(validate(map)).toBe(false);
    });

    test('rejects excluded specs held by the implementation', () => {
        const map: any = structuredClone(completeMap);
        const implementation = map.relationships.find(
            (relationship: any) =>
                relationship.type === '@pjama/implementation',
        );
        implementation.excludedSpecs = [];
        expect(validate(map)).toBe(false);
    });
});

describe('positions', () => {
    test('accepts an unpositioned relationship of an ordered type', () => {
        const map: any = structuredClone(completeMap);
        const specToComponent = map.relationships.find(
            (relationship: any) =>
                relationship.type === '@pjama/spec-to-component',
        );
        delete specToComponent.position;
        expect(validate(map)).toBe(true);
    });

    test('accepts a position of any length', () => {
        const map: any = structuredClone(completeMap);
        const specToComponent = map.relationships.find(
            (relationship: any) =>
                relationship.type === '@pjama/spec-to-component',
        );
        specToComponent.position = 'a'.repeat(1000);
        expect(validate(map)).toBe(true);
    });

    test('rejects a position that is not text', () => {
        const map: any = structuredClone(completeMap);
        const specToComponent = map.relationships.find(
            (relationship: any) =>
                relationship.type === '@pjama/spec-to-component',
        );
        specToComponent.position = 0.5;
        expect(validate(map)).toBe(false);
    });

    test('rejects a position on a relationship of an unordered type', () => {
        const map: any = structuredClone(completeMap);
        const stepToNext = map.relationships.find(
            (relationship: any) => relationship.type === '@pjama/step-to-next',
        );
        stepToNext.position = 'a';
        expect(validate(map)).toBe(false);
    });
});

describe('cross-item rules are left to the validator', () => {
    test('accepts a reference to a missing item', () => {
        const map: any = structuredClone(completeMap);
        map.relationships[0].target = crypto.randomUUID();
        expect(validate(map)).toBe(true);
    });

    test('accepts a relationship from an item to itself', () => {
        const map: any = structuredClone(completeMap);
        map.relationships[0].target = map.relationships[0].source;
        expect(validate(map)).toBe(true);
    });

    test('accepts a relationship between items of the wrong types', () => {
        const map: any = structuredClone(completeMap);
        const containment = map.relationships.find(
            (relationship: any) => relationship.type === '@pjama/containment',
        );
        containment.source = map.items.find(
            (item: any) => item.type === '@pjama/actor',
        ).id;
        expect(validate(map)).toBe(true);
    });

    test('accepts a child with two parents', () => {
        const map: any = structuredClone(completeMap);
        const containment = map.relationships.find(
            (relationship: any) => relationship.type === '@pjama/containment',
        );
        map.relationships.push({
            ...containment,
            id: crypto.randomUUID(),
            target: map.items[0].id,
        });
        expect(validate(map)).toBe(true);
    });

    test('accepts colliding item ids', () => {
        const map: any = structuredClone(completeMap);
        map.items[1].id = map.items[0].id;
        expect(validate(map)).toBe(true);
    });
});
