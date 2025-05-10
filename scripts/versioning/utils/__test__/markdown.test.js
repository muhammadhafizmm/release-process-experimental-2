const { buildMarkdown, formatIndentedLines } = require("../markdown");

jest.mock("../time", () => ({
  getDateWIB: jest.fn(() => "2025-05-09"),
}));

describe("buildMarkdown", () => {
  it("should build markdown with all sections", () => {
    const commits = [
      {
        type: "BREAKING",
        message: "fix: deprecated login v1",
        body: "BREAKING CHANGE: deprecated login v1",
      },
      {
        type: "FEATURE",
        message: "feat: add search",
        body: "- support fuzzy match\n- fallback to keyword",
      },
      {
        type: "FIX",
        message: "fix: incorrect error message",
        body: "",
      },
      {
        type: "INFRA",
        message: "infra: migrate to pnpm",
        body: "",
      },
      {
        type: "OTHER",
        message: "docs: update readme",
        body: "* Added installation guide",
      },
    ];

    const markdown = buildMarkdown("v1.0.0", commits);

    expect(markdown).toContain("## v1.0.0 (2025-05-09)");

    expect(markdown).toContain("### 🚨 Breaking Changes");
    expect(markdown).toContain("- fix: deprecated login v1");
    expect(markdown).toContain("BREAKING CHANGE");

    expect(markdown).toContain("### ✨ Feature");
    expect(markdown).toContain("- feat: add search");
    expect(markdown).toContain("  - support fuzzy match");
    expect(markdown).toContain("  - fallback to keyword");

    expect(markdown).toContain("### 🐛 Bug Fix");
    expect(markdown).toContain("- fix: incorrect error message");

    expect(markdown).toContain("### 🔧 Infra Change");
    expect(markdown).toContain("- infra: migrate to pnpm");

    expect(markdown).toContain("### 🗃 Other");
    expect(markdown).toContain("- docs: update readme");
    expect(markdown).toContain("  * Added installation guide");
  });

  it("should default version to only date if no version given", () => {
    const markdown = buildMarkdown("", []);
    expect(markdown).toMatch(/^## \(2025-05-09\)/);
  });
});

describe("formatIndentedLines", () => {
  it("should indent bullet transitions properly", () => {
    const lines = [
      "* First level item",
      "* Another first level",
      "- Nested under first",
      "• More nested",
      "* Back to previous",
      "* Plain line",
    ];

    const output = formatIndentedLines(lines);
    const expected = [
      "  * First level item",
      "  * Another first level",
      "    - Nested under first",
      "      • More nested",
      "  * Back to previous",
      "  * Plain line",
    ].join("\n");
    expect(output).toBe(expected);
  });

  it("should handle no bullets and prefix with dash", () => {
    const lines = ["Line one", "Line two"];
    const output = formatIndentedLines(lines);
    expect(output).toBe("  - Line one\n  - Line two");
  });
});
