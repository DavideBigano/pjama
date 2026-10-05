import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { escapeHtml, getResourceUrl, highlightMatches, isImageLocation, pluralize, titleCase, wrapNodeLabel } from "./format.js";

describe("escapeHtml", () => {
	test("escapes markup characters", () => {
		assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
	});
	test("turns null and undefined into an empty string", () => {
		assert.equal(escapeHtml(undefined) + escapeHtml(null), "");
	});
});

describe("titleCase", () => {
	test("splits camelCase and capitalizes every word", () => {
		assert.equal(titleCase("availabilityAndReliability"), "Availability And Reliability");
	});
	test("keeps words that are already uppercase", () => {
		assert.equal(titleCase("TS module"), "TS Module");
	});
});

describe("pluralize", () => {
	test("keeps the singular for one", () => {
		assert.equal(pluralize(1, "spec"), "1 spec");
	});
	test("adds an s otherwise", () => {
		assert.equal(pluralize(0, "spec"), "0 specs");
	});
});

describe("isImageLocation", () => {
	test("recognizes image extensions, query strings included", () => {
		assert.equal(isImageLocation("docs/context.SVG?v=2"), true);
	});
	test("rejects other files", () => {
		assert.equal(isImageLocation("docs/spec.md"), false);
	});
});

describe("getResourceUrl", () => {
	test("leaves web URLs alone", () => {
		assert.equal(getResourceUrl("https://example.com/a.png"), "https://example.com/a.png");
	});
	test("routes relative paths through /files, encoding each segment", () => {
		assert.equal(getResourceUrl("docs/my diagram.svg"), "/files/docs/my%20diagram.svg");
	});
	test("turns Windows separators into slashes", () => {
		assert.equal(getResourceUrl("docs\\a.png"), "/files/docs/a.png");
	});
});

describe("wrapNodeLabel", () => {
	test("keeps a short label on one line", () => {
		assert.deepEqual(wrapNodeLabel("Web app"), ["Web app"]);
	});
	test("never returns more than two lines", () => {
		assert.equal(wrapNodeLabel("One two three four five six seven eight").length, 2);
	});
	test("marks the second line as cut when words are dropped", () => {
		assert.match(wrapNodeLabel("One two three four five six seven eight")[1], /…$/);
	});
	test("falls back to Untitled for an empty label", () => {
		assert.deepEqual(wrapNodeLabel(""), ["Untitled"]);
	});
});

describe("highlightMatches", () => {
	test("marks every match, keeping the original case", () => {
		assert.equal(highlightMatches("Shop hoster", "ho"), "S<mark>ho</mark>p <mark>ho</mark>ster");
	});
	test("marks each word of a multi-word query", () => {
		assert.equal(highlightMatches("Orders API on Fastify", "fastify orders"), "<mark>Orders</mark> API on <mark>Fastify</mark>");
	});
	test("escapes markup around and inside matches", () => {
		assert.equal(highlightMatches("<b>a</b>", "b"), "&lt;<mark>b</mark>&gt;a&lt;/<mark>b</mark>&gt;");
	});
	test("treats regex characters literally", () => {
		assert.equal(highlightMatches("a.b axb", "a.b"), "<mark>a.b</mark> axb");
	});
});
