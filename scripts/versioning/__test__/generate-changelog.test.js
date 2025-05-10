const fs = require("fs");
const path = require("path");
const { generateChangelog } = require("../generate-changelog");
const { getCommits, transformCommit } = require("../utils/github");
const { buildMarkdown } = require("../utils/markdown");

jest.mock("fs");
jest.mock("path");
jest.mock("../utils/github", () => ({
  getCommits: jest.fn(),
  transformCommit: jest.fn(),
}));
jest.mock("../utils/markdown", () => ({
  buildMarkdown: jest.fn(),
}));

describe("generateChangelog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    path.extname.mockImplementation((_) => ".md");
    path.basename.mockImplementation((_, ext) =>
      ext ? "CHANGELOG" : "CHANGELOG.md"
    );
    path.dirname.mockReturnValue("/mock-dir");
    path.join.mockImplementation((dir, filename) => `${dir}/${filename}`);
    fs.existsSync.mockReturnValue(false);
  });

  it("should generate changelog and write to CHANGELOG.md if file does not exist", () => {
    getCommits.mockReturnValue([
      { subject: "[FEATURE] add feature", body: "" },
    ]);
    transformCommit.mockReturnValue({
      type: "FEATURE",
      message: "feat: add feature",
    });
    buildMarkdown.mockReturnValue(
      "## v1.0.0 (2025-05-09)\n- feat: add feature\n"
    );

    generateChangelog(
      "origin/main",
      "origin/release",
      "CHANGELOG.md",
      "v1.0.0"
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "CHANGELOG.md",
      expect.stringContaining("# Changelog\n\n## v1.0.0")
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/mock-dir/CHANGELOG_temp.md",
      expect.stringContaining("# Changelog\n\n- feat: add feature")
    );
  });

  it("should append to existing changelog if file exists", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("# Changelog\n\n## Previous\n- item");

    getCommits.mockReturnValue([{ subject: "[FIX] bug fix", body: "" }]);
    transformCommit.mockReturnValue({ type: "FIX", message: "fix: bug fix" });
    buildMarkdown.mockReturnValue("## v1.0.1 (2025-05-09)\n- fix: bug fix\n");

    generateChangelog("main", "rc", "CHANGELOG.md", "v1.0.1");

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "CHANGELOG.md",
      expect.stringContaining("## v1.0.1")
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining("- fix: bug fix")
    );
  });

  it("should write to console if output is not provided", () => {
    console.log = jest.fn();
    getCommits.mockReturnValue([{ subject: "[OTHER] docs update", body: "" }]);
    transformCommit.mockReturnValue({
      type: "OTHER",
      message: "docs: update readme",
    });
    buildMarkdown.mockReturnValue(
      "## v1.2.0 (2025-05-09)\n- docs: update readme\n"
    );

    generateChangelog("main", "release", null, "v1.2.0");

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("# Changelog\n\n## v1.2.0")
    );
  });

  it("should support non-changelog output file names", () => {
    path.basename.mockReturnValue("notes.txt");
    getCommits.mockReturnValue([{ subject: "[INFRA] update infra", body: "" }]);
    transformCommit.mockReturnValue({
      type: "INFRA",
      message: "infra: update infra",
    });
    buildMarkdown.mockReturnValue("## v1.2.1\n- infra: update infra");

    generateChangelog("base", "head", "notes.txt", "v1.2.1");

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "notes.txt",
      expect.stringContaining("## v1.2.1")
    );
  });
});
