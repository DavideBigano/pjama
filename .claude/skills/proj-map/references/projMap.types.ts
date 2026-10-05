/**
 * TypeScript mirror of ../.claude/skills/proj-map/references/projMap.schema.json, for readability.
 * The schema is the source of truth.
 *
 * Constraints that TS can't express are kept as JSDoc tags
 * (`@maxLength`, `@pattern`) so they round-trip to the schema.
 * Optional properties (`?`) map to properties missing from the schema's `required` list.
 */

/**
 * Legible title/name. ~5 words.
 * @maxLength 50
 */
export type Label = string;

/**
 * Short description, concise but clear. ~20 words.
 * @maxLength 200
 */
export type Summary = string;

/** Free form annotations. */
export type Notes = string;

/** A file path (relative, absolute, posix or windows) or a URL. */
export type Path = string;

/**
 * Progressive identifier, unique across the document.
 * @pattern ^COM-[0-9]{3}$
 */
export type ComponentId = `COM-${string}`;

/**
 * Progressive identifier, unique across the document.
 * @pattern ^FOL-[0-9]{3}$
 */
export type FolderId = `FOL-${string}`;

/**
 * Progressive identifier, unique across the document.
 * @pattern ^REL-[0-9]{3}$
 */
export type RelationId = `REL-${string}`;

/**
 * Progressive identifier, unique across the document.
 * @pattern ^REQ-[0-9]{3}$
 */
export type RequirementId = `REQ-${string}`;

/**
 * Progressive identifier, unique across the document.
 * @pattern ^UC-[0-9]{3}$
 */
export type UseCaseId = `UC-${string}`;

/**
 * Progressive identifier, unique across the document.
 * @pattern ^IF-[0-9]{3}$
 */
export type InterfaceId = `IF-${string}`;

/**
 * Progressive identifier, unique across the document.
 * @pattern ^ACT-[0-9]{3}$
 */
export type ActorId = `ACT-${string}`;

/**
 * Progressive identifier, unique across the document.
 * @pattern ^RES-[0-9]{3}$
 */
export type ResourceId = `RES-${string}`;

/**
 * Progressive identifier, unique across the document.
 * @pattern ^T-[0-9]{3}$
 */
export type TestId = `T-${string}`;

/**
 * Progressive identifier, unique across the document.
 * @pattern ^D-[0-9]{3}$
 */
export type DecisionId = `D-${string}`;

/** Id of any item a component can hold in its specs (requirement, use case or interface), and a relation can rely on. */
export type SpecId = RequirementId | UseCaseId | InterfaceId;

/** Tests and other specs (requirements, use cases, interfaces) that ensure this item is respected. Add only items that actually validate it. An empty list means the item is unverified. */
export type VerifiedBy = (TestId | SpecId)[];

/** Project Map */
export interface ProjMap {
	/**
	 * Identifier for this map.
	 * @format uuid
	 */
	mapId: string;
	/** Legible hyphenated identifier for this map. */
	mapSlug: string;
	/** Legible project name, shown in tools. */
	label: Label;
	/** List of all components (nodes) in this map. */
	components: Component[];
	/** Organizational folders for components. Purely for display, with no effect on requirements. */
	folders: Folder[];
	/** List of all dependency relations (edges) between components in this map. */
	relations: Relation[];
	/** List of all actors in this map. */
	actors: Actor[];
	/** List of all requirements in this map. */
	requirements: Requirement[];
	/** List of all use cases in this map. */
	useCases: UseCase[];
	/** List of all interfaces in this map. */
	interfaces: Interface[];
	/** List of all resources in this map. */
	resources: Resource[];
	/** List of all tests in this map. */
	tests: Test[];
	/** Relevant decision points that shaped choices in the project. Fill in in accordance with the user. */
	decisions: Decision[];
}

/** A system, subsystem, service, library, module, or other structural unit, described at whatever granularity its level implies. */
export interface Component {
	id: ComponentId;
	/** Legible name for the item. */
	label: Label;
	/** Short description for the item. */
	summary: Summary;
	notes?: Notes;
	resources?: ResourceId[];
	/** Used to contextualize where the component sits in the whole project's schema (Cross-system, system, app, service, library, module, file, function, class, ...). Useful to determine what is the appropriate granularity for the information describing the component. (e.g. the high level requirements for a 'system' component will have different concerns from those for a 'library' or 'module' component, which should be more detailed and geared towards implementation). */
	depth: Label;
	/** Whether the component is considered high level or low level. Helps agents interacting with it to better handle granularity and implementation details. */
	level: "low-level" | "high-level";
	/** Folder this component is displayed in. A component sits in at most one folder. Has no effect on requirements. */
	folder?: FolderId;
	/** Components this one is part of (containment). Their specs apply to this component too. May list several parents; the containment graph must not have cycles. */
	partOf?: ComponentId[];
	/** List of technologies used in this component. */
	technologies?: string[];
	/** Physical location of the component. */
	physicalLocation?: string;
	/** Location of the source file/s of the component. */
	sourceLocation?: Path[];
	/** Specifications that describe the component. Relations can rely on any of them. */
	specs: {
		requirements?: RequirementId[];
		useCases?: UseCaseId[];
		/** Interfaces this component provides to others. */
		interfaces?: InterfaceId[];
	};
}

/** A display-only folder used to organize components. Folders nest through `parent` and carry no requirements. */
export interface Folder {
	id: FolderId;
	/** Legible name for the item. */
	label: Label;
	/** Short description for the item. */
	summary?: Summary;
	notes?: Notes;
	/** The folder this one is nested in. Omit for a top-level folder. Folder nesting must not have cycles. */
	parent?: FolderId;
}

/** A directed dependency between two components (uses, calls, reads, ...). Containment is not a relation: see `Component.partOf`. */
export interface Relation {
	id: RelationId;
	/** Legible name for the item. */
	label: Label;
	/** Short description for the item. */
	summary: Summary;
	notes?: Notes;
	resources?: ResourceId[];
	/** The kind of dependency. Allows for 'uses' | 'calls' | 'reads' | 'writes' | 'distributes' along with other user defined kinds. */
	kind: "uses" | "calls" | "reads" | "writes" | "distributes" | string;
	/** Id of the component that depends on the other. */
	from: ComponentId;
	/** Id of the component being depended on. Must differ from `from`. */
	to: ComponentId;
	/** Specs this relation relies on: interfaces, requirements or use cases. They usually belong to `from` or `to`, but may belong to any component in the map. */
	reliesOn?: SpecId[];
}

/** An interface a component provides to others: an API, a CLI, a file format, an event stream, ... */
export interface Interface {
	id: InterfaceId;
	/** Legible name for the item. */
	label: Label;
	/** Short description for the item. */
	summary: Summary;
	notes?: Notes;
	resources?: ResourceId[];
	protocol?: {
		/** HTTP(S), SOAP, MQTT, stdio, IPC, ... */
		name: string;
		/** Additional specification details for the selected protocol (e.g. for HTTP, you may specify method, query params, payload schema, ...). */
		additionalSpecs?: string;
	};
	verifiedBy: VerifiedBy;
}

/** A single requirement (what the system must do, a quality attribute the system must satisfy, ...). Phrase as a tangible aspect / measurable quality. */
export interface Requirement {
	id: RequirementId;
	label: Label;
	summary: Summary;
	notes?: Notes;
	resources?: ResourceId[];
	/** Optional categorization tag that can be assigned to better scope requirements. */
	category?:
		| "performance"
		| "security"
		| "availabilityAndReliability"
		| "usability"
		| string;
	verifiedBy: VerifiedBy;
}

/** A single actor: a role that interacts with the system, not a physical person. */
export interface Actor {
	id: ActorId;
	label: Label;
	summary: Summary;
	notes?: Notes;
	resources?: ResourceId[];
}

/** A single use case describing an interaction between actors and the system. */
export interface UseCase {
	id: UseCaseId;
	/** Legible name for the item. */
	label: Label;
	/** Short description for the item. */
	summary: Summary;
	notes?: Notes;
	resources?: ResourceId[];
	/** Ids of the actors involved in this use case. */
	actors: ActorId[];
	/** Conditions that must hold true before this use case can begin. */
	prerequisites?: string[];
	/** Sequence of actions of the use case. Allows for branching scenarios. */
	steps: Step[];
	verifiedBy: VerifiedBy;
}

/** A single step in a use case scenario. Steps chain through `next`; alternative flows fork off through `branches`. */
export interface Step {
	/** What happens in this step, phrased as "<actor or system> <does something>". */
	action: string;
	/** The step that follows this one in the same flow. Omit on the last step. */
	next?: Step;
	/** Alternative flows that fork off after this step (e.g. errors, optional paths). Each branch is the first step of its own chain. */
	branches?: Step[];
}

/** Reference material file or URL that holds additional information. */
export interface Resource {
	id: ResourceId;
	/** Legible name for the item. */
	label: Label;
	/** Short description for the item. */
	summary: Summary;
	notes?: Notes;
	/** Document, image, skill, diagram, use case diagram, flowchart, ... */
	type: string;
	location: Path;
}

/** Represents a single test file, or a specific test inside a file. */
export interface Test {
	id: TestId;
	/** Legible name for the item. */
	label: Label;
	/** Short description for the item. */
	summary: Summary;
	notes?: Notes;
	resources?: ResourceId[];
	/** The type of test. Allows for 'unit' | 'integration' | 'e2e' | 'screenshot' along with other user defined types. */
	type: "unit" | "integration" | "e2e" | "screenshot" | string;
	/** Location of the test file. */
	location: Path;
	/** Name for the specific test in the located file. If left empty the object points to the whole file. */
	testName?: string;
}

/** A relevant decision point that shaped a choice in the project. */
export interface Decision {
	id: DecisionId;
	/** Legible name for the item. */
	label: Label;
	/** Short description for the item. */
	summary: Summary;
	notes?: Notes;
	resources?: ResourceId[];
	/** Ids of the elements this decision pertains to, both as causes for and consequences of it (a component, relation, requirement, use case, interface, actor, test, resource, or another decision). */
	references: (
		| ComponentId
		| RelationId
		| RequirementId
		| UseCaseId
		| InterfaceId
		| ActorId
		| TestId
		| ResourceId
		| DecisionId
	)[];
}
