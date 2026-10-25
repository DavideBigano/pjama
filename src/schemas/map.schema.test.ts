import { Ajv2020 } from "ajv/dist/2020";
import { describe, expect, test } from "vitest";
import schema from "./map.schema.json";
import completeMap from "./samples/complete.map.json";
import minimalMap from "./samples/minimal.map.json";

const validate = new Ajv2020().compile(schema);

describe("samples", () => {
	test("accepts a map with empty lists", () => {
		expect(validate(minimalMap)).toBe(true);
	});

	test("accepts a map using every item, spec, type and relationship kind", () => {
		expect(validate(completeMap)).toBe(true);
	});
});

describe("map", () => {
	test("rejects a map without a schema version", () => {
		const map: any = structuredClone(completeMap);
		delete map.schemaVersion;
		expect(validate(map)).toBe(false);
	});

	test.each(["v0.1.0", "v10.20.30"])("accepts the schema version %s", (schemaVersion) => {
		const map: any = structuredClone(completeMap);
		map.schemaVersion = schemaVersion;
		expect(validate(map)).toBe(true);
	});

	test.each(["0.1.0", "v0.1", "v0.1.0-beta", "V0.1.0"])("rejects the schema version %s", (schemaVersion) => {
		const map: any = structuredClone(completeMap);
		map.schemaVersion = schemaVersion;
		expect(validate(map)).toBe(false);
	});

	test.each(["2d5e4def-29b8-4222-8faa-108e21b7cc65", "2D5E4DEF-29B8-4222-8FAA-108E21B7CC65"])(
		"accepts the id %s",
		(id) => {
			const map: any = structuredClone(completeMap);
			map.id = id;
			expect(validate(map)).toBe(true);
		},
	);

	test.each([
		"MAP-001",
		"c232ab00-9414-11ec-b3c8-9e6bdeced846",
		"2d5e4def29b842228faa108e21b7cc65",
		"2d5e4def-29b8-4222-8faa-108e21b7cc6",
	])("rejects the id %s", (id) => {
		const map: any = structuredClone(completeMap);
		map.id = id;
		expect(validate(map)).toBe(false);
	});

	test.each(["cafe-orders", "orders", "v2-api"])("accepts the slug %s", (slug) => {
		const map: any = structuredClone(completeMap);
		map.slug = slug;
		expect(validate(map)).toBe(true);
	});

	test.each(["Cafe-orders", "cafe orders", "cafe--orders", "-cafe", "cafe-", "café", ""])(
		"rejects the slug '%s'",
		(slug) => {
			const map: any = structuredClone(completeMap);
			map.slug = slug;
			expect(validate(map)).toBe(false);
		},
	);

	test("rejects a map without a project root", () => {
		const map: any = structuredClone(completeMap);
		delete map.root;
		expect(validate(map)).toBe(false);
	});

	test("rejects a map without one of its item lists", () => {
		const map: any = structuredClone(completeMap);
		delete map.actors;
		expect(validate(map)).toBe(false);
	});

	test("rejects a top-level list of types", () => {
		const map: any = structuredClone(minimalMap);
		map.types = [];
		expect(validate(map)).toBe(false);
	});

	test("accepts a map without $schema", () => {
		const map: any = structuredClone(completeMap);
		delete map.$schema;
		expect(validate(map)).toBe(true);
	});
});

describe("items", () => {
	test("rejects an item without a name", () => {
		const map: any = structuredClone(completeMap);
		delete map.actors[0].name;
		expect(validate(map)).toBe(false);
	});

	test("rejects an item without a description", () => {
		const map: any = structuredClone(completeMap);
		delete map.actors[0].description;
		expect(validate(map)).toBe(false);
	});

	test("rejects an item without an id", () => {
		const map: any = structuredClone(completeMap);
		delete map.actors[0].id;
		expect(validate(map)).toBe(false);
	});

	test("rejects notes that are not text", () => {
		const map: any = structuredClone(completeMap);
		map.actors[0].notes = ["first note"];
		expect(validate(map)).toBe(false);
	});

	test("rejects an item of the wrong type for its list", () => {
		const map: any = structuredClone(completeMap);
		map.actors[0].type = "resource";
		map.actors[0].location = "docs/customer.md";
		expect(validate(map)).toBe(false);
	});

	test("rejects fields that are not part of the item", () => {
		const map: any = structuredClone(completeMap);
		map.actors[0].label = "Customer";
		expect(validate(map)).toBe(false);
	});
});

describe("components", () => {
	test("rejects a component without a spec list", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[2].specs;
		expect(validate(map)).toBe(false);
	});

	test("rejects component resources given as paths", () => {
		const map: any = structuredClone(completeMap);
		map.components[0].resources = ["docs/style-guide.md"];
		expect(validate(map)).toBe(false);
	});

	test("rejects component properties outside the map model", () => {
		const map: any = structuredClone(completeMap);
		map.components[0].sourceLocation = "src/app";
		expect(validate(map)).toBe(false);
	});
});

describe("specs", () => {
	test("rejects an unknown spec type", () => {
		const map: any = structuredClone(completeMap);
		map.components[0].specs[0].type = "goal";
		expect(validate(map)).toBe(false);
	});

	test("rejects a category that is not text", () => {
		const map: any = structuredClone(completeMap);
		map.components[0].specs[0].category = ["performance"];
		expect(validate(map)).toBe(false);
	});

	test("rejects a requirement carrying fields of another spec type", () => {
		const map: any = structuredClone(completeMap);
		map.components[0].specs[0].body = "return true";
		expect(validate(map)).toBe(false);
	});
});

describe("use cases", () => {
	test("rejects a use case without steps", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[0].specs[1].steps;
		expect(validate(map)).toBe(false);
	});

	test("rejects a step without a description", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[0].specs[1].steps[0].description;
		expect(validate(map)).toBe(false);
	});

	test("rejects a step pointing to the next one by index", () => {
		const map: any = structuredClone(completeMap);
		map.components[0].specs[1].steps[0].next = 1;
		expect(validate(map)).toBe(false);
	});

	test("rejects actors given by name", () => {
		const map: any = structuredClone(completeMap);
		map.components[0].specs[1].actors = ["Customer"];
		expect(validate(map)).toBe(false);
	});

	test("accepts a use case without actors or prerequisites", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[0].specs[1].actors;
		delete map.components[0].specs[1].prerequisites;
		expect(validate(map)).toBe(true);
	});
});

describe("interfaces", () => {
	test("rejects an unnamed input", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[1].specs[3].inputs[0].name;
		expect(validate(map)).toBe(false);
	});

	test("accepts an unnamed output", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[1].specs[3].outputs[1].name;
		expect(validate(map)).toBe(true);
	});

	test("rejects an input typed with a bare type id", () => {
		const map: any = structuredClone(completeMap);
		map.components[1].specs[3].inputs[0].type = map.components[1].specs[2].id;
		expect(validate(map)).toBe(false);
	});

	test("accepts an interface without inputs or outputs", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[1].specs[3].inputs;
		delete map.components[1].specs[3].outputs;
		expect(validate(map)).toBe(true);
	});

	test("rejects a precondition that is not a list", () => {
		const map: any = structuredClone(completeMap);
		map.components[1].specs[3].preconditions = "The account exists";
		expect(validate(map)).toBe(false);
	});
});

describe("snippets", () => {
	test("rejects a snippet without a body", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[1].specs[4].body;
		expect(validate(map)).toBe(false);
	});
});

describe("types", () => {
	test("rejects a type without a definition", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[1].specs[1].definition;
		expect(validate(map)).toBe(false);
	});

	test("rejects an unknown type kind", () => {
		const map: any = structuredClone(completeMap);
		map.components[1].specs[1].definition = { kind: "tuple", of: [] };
		expect(validate(map)).toBe(false);
	});

	test("rejects a constant given as a parsed value", () => {
		const map: any = structuredClone(completeMap);
		map.components[1].specs[1].definition = { kind: "constant", value: 42 };
		expect(validate(map)).toBe(false);
	});

	test("rejects a struct field without a type", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[1].specs[2].definition.of[0].fields[0].type;
		expect(validate(map)).toBe(false);
	});

	test("rejects an invalid type nested inside an array", () => {
		const map: any = structuredClone(completeMap);
		map.components[1].specs[2].definition.of[1].fields[0].type.of = {
			kind: "primitive",
		};
		expect(validate(map)).toBe(false);
	});

	test("rejects a union alternative given as a bare type", () => {
		const map: any = structuredClone(completeMap);
		map.components[1].specs[1].definition.of[0] = {
			kind: "constant",
			value: '"customer"',
		};
		expect(validate(map)).toBe(false);
	});

	test("rejects a reference to a type by name", () => {
		const map: any = structuredClone(completeMap);
		map.components[1].specs[2].definition.of[0].fields[1].type.type = "Role";
		expect(validate(map)).toBe(false);
	});
});

describe("mockups", () => {
	test("rejects an unknown content kind", () => {
		const map: any = structuredClone(completeMap);
		map.components[0].specs[3].content.kind = "video";
		expect(validate(map)).toBe(false);
	});

	test("rejects an image mockup without a resource", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[0].specs[3].content.resource;
		expect(validate(map)).toBe(false);
	});

	test("rejects an image mockup given as a path", () => {
		const map: any = structuredClone(completeMap);
		map.components[0].specs[3].content.resource = "design/dashboard.png";
		expect(validate(map)).toBe(false);
	});

	test("rejects an HTML file mockup with an inline body", () => {
		const map: any = structuredClone(completeMap);
		map.components[0].specs[4].content.body = "<p>Settings</p>";
		expect(validate(map)).toBe(false);
	});

	test("rejects an inline HTML mockup without a body", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[0].specs[2].content.body;
		expect(validate(map)).toBe(false);
	});
});

describe("technologies", () => {
	test("rejects a technology spec without the technology name", () => {
		const map: any = structuredClone(completeMap);
		delete map.components[0].specs[5].technology;
		expect(validate(map)).toBe(false);
	});

	test("rejects documentation given as URLs", () => {
		const map: any = structuredClone(completeMap);
		map.components[0].specs[5].documentation = [
			"https://www.typescriptlang.org/docs/",
		];
		expect(validate(map)).toBe(false);
	});
});

describe("resources", () => {
	test("rejects a resource without a location", () => {
		const map: any = structuredClone(completeMap);
		delete map.resources[0].location;
		expect(validate(map)).toBe(false);
	});
});

describe("decisions", () => {
	test("rejects a decision without the closed flag", () => {
		const map: any = structuredClone(completeMap);
		delete map.decisions[1].closed;
		expect(validate(map)).toBe(false);
	});

	test("rejects a stored status", () => {
		const map: any = structuredClone(completeMap);
		map.decisions[1].status = "closed";
		expect(validate(map)).toBe(false);
	});

	test("rejects a chosen option given by index", () => {
		const map: any = structuredClone(completeMap);
		map.decisions[0].chosenOption = 0;
		expect(validate(map)).toBe(false);
	});

	test("rejects an option without an id", () => {
		const map: any = structuredClone(completeMap);
		delete map.decisions[0].options[0].id;
		expect(validate(map)).toBe(false);
	});
});

describe("checks", () => {
	test("rejects a check that is neither a review nor a test", () => {
		const map: any = structuredClone(completeMap);
		map.checks[0].type = "check";
		expect(validate(map)).toBe(false);
	});

	test("rejects a review without criteria", () => {
		const map: any = structuredClone(completeMap);
		delete map.checks[0].criteria;
		expect(validate(map)).toBe(false);
	});

	test.each(["human", "agent"])("accepts the reviewer %s", (reviewer) => {
		const map: any = structuredClone(completeMap);
		map.checks[0].reviewer = reviewer;
		expect(validate(map)).toBe(true);
	});

	test.each(["anyone", "Human", ""])("rejects the reviewer '%s'", (reviewer) => {
		const map: any = structuredClone(completeMap);
		map.checks[0].reviewer = reviewer;
		expect(validate(map)).toBe(false);
	});

	test("rejects a stored review result", () => {
		const map: any = structuredClone(completeMap);
		map.checks[0].state = "passing";
		expect(validate(map)).toBe(false);
	});

	test("rejects a test without a plugin", () => {
		const map: any = structuredClone(completeMap);
		delete map.checks[1].plugin;
		expect(validate(map)).toBe(false);
	});

	test("rejects a stored test result", () => {
		const map: any = structuredClone(completeMap);
		map.checks[1].lastRun = "2026-10-25T10:00:00Z";
		expect(validate(map)).toBe(false);
	});

	test("accepts any plugin configuration", () => {
		const map: any = structuredClone(completeMap);
		map.checks[1].config = { files: ["a.test.ts"], retries: 2 };
		expect(validate(map)).toBe(true);
	});
});

describe("relationships", () => {
	test("rejects a relationship without a source", () => {
		const map: any = structuredClone(completeMap);
		delete map.relationships[0].source;
		expect(validate(map)).toBe(false);
	});

	test("rejects an unknown relationship type", () => {
		const map: any = structuredClone(completeMap);
		map.relationships[0].type = "inheritance";
		expect(validate(map)).toBe(false);
	});

	test("rejects a named relationship", () => {
		const map: any = structuredClone(completeMap);
		map.relationships[0].name = "Store is part of the API";
		expect(validate(map)).toBe(false);
	});

	test("rejects a dependency without its selected specs", () => {
		const map: any = structuredClone(completeMap);
		delete map.relationships[1].selectedSpecs;
		expect(validate(map)).toBe(false);
	});

	test("accepts a dependency selecting no specs", () => {
		const map: any = structuredClone(completeMap);
		map.relationships[1].selectedSpecs = [];
		expect(validate(map)).toBe(true);
	});

	test("rejects an implementation without its excluded specs", () => {
		const map: any = structuredClone(completeMap);
		delete map.relationships[2].excludedSpecs;
		expect(validate(map)).toBe(false);
	});

	test("rejects a containment selecting specs", () => {
		const map: any = structuredClone(completeMap);
		map.relationships[0].selectedSpecs = [];
		expect(validate(map)).toBe(false);
	});
});

describe("cross-item rules are left to the validator", () => {
	test("accepts a reference to a missing item", () => {
		const map: any = structuredClone(completeMap);
		map.relationships[0].target = crypto.randomUUID();
		expect(validate(map)).toBe(true);
	});

	test("accepts a relationship from an item to itself", () => {
		const map: any = structuredClone(completeMap);
		map.relationships[0].target = map.relationships[0].source;
		expect(validate(map)).toBe(true);
	});

	test("accepts a child with two parents", () => {
		const map: any = structuredClone(completeMap);
		map.relationships.push({
			...map.relationships[0],
			id: crypto.randomUUID(),
			target: map.components[0].id,
		});
		expect(validate(map)).toBe(true);
	});

	test("accepts colliding item ids", () => {
		const map: any = structuredClone(completeMap);
		map.actors[0].id = map.components[0].id;
		expect(validate(map)).toBe(true);
	});
});
