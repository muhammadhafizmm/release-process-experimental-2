const { execSync } = require("child_process");

// ✅ Mock child_process
jest.mock("child_process");

// ✅ Mock github utility, override getGitHubRepoUrl only
jest.mock("../github", () => {
  const originalModule = jest.requireActual("../github");
  return {
    ...originalModule,
    getGitHubRepoUrl: jest.fn(),
  };
});

const {
  getCommits,
  getGitHubRepoUrl,
  transformCommit,
  mapCommitType,
  getLatestTags,
  getLatestBetaTag,
  getAllBetaNumbers,
  getLatestHotfixTag,
} = require("../github");

describe("getGitHubRepoUrl", () => {
  it("parses ssh remote url", () => {
    execSync.mockReturnValue("git@github.com:user/repo.git");
    const { getGitHubRepoUrl: actualGetRepoUrl } =
      jest.requireActual("../github");
    expect(actualGetRepoUrl()).toBe("https://github.com/user/repo");
  });

  it("parses https remote url", () => {
    execSync.mockReturnValue("https://github.com/user/repo.git");
    const { getGitHubRepoUrl: actualGetRepoUrl } =
      jest.requireActual("../github");
    expect(actualGetRepoUrl()).toBe("https://github.com/user/repo");
  });

  it("returns empty string on error", () => {
    execSync.mockImplementation(() => {
      throw new Error("remote not found");
    });
    const { getGitHubRepoUrl: actualGetRepoUrl } =
      jest.requireActual("../github");
    expect(actualGetRepoUrl()).toBe("");
  });
});

describe("Commit Transformation", () => {
  describe("getCommits", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("parses commits and appends GitHub links correctly", () => {
      const mockLogOutput = `
        feat: add login button
        abc1234
        Added login button for navbar
  
        ---END---
        fix: handle crash
        def5678
        Handled crash when user not found
  
        ---END---
      `.trim();

      execSync
        .mockReturnValueOnce("https://github.com/testuser/testrepo.git")
        .mockReturnValueOnce(mockLogOutput);

      const commits = getCommits("v1.0.0", "HEAD");

      expect(commits).toEqual([
        {
          subject:
            "feat: add login button [(abc1234)](https://github.com/testuser/testrepo/commit/abc1234)",
          body: "Added login button for navbar",
        },
        {
          subject:
            "fix: handle crash [(def5678)](https://github.com/testuser/testrepo/commit/def5678)",
          body: "Handled crash when user not found",
        },
      ]);
    });

    it("handles missing GitHub repo URL gracefully", () => {
      const mockLogOutput = `
        chore: update dependencies
        aaa1111
        Updated all npm packages
  
        ---END---
      `.trim();

      execSync.mockReturnValue(mockLogOutput);
      getGitHubRepoUrl.mockReturnValue("");

      const commits = getCommits("v1.0.0", "HEAD");

      expect(commits).toEqual([
        {
          subject: "chore: update dependencies",
          body: "Updated all npm packages",
        },
      ]);
    });
  });

  describe("mapCommitType", () => {
    it("should map 'feat' and 'feature' to FEATURE", () => {
      expect(mapCommitType("feat")).toBe("FEATURE");
      expect(mapCommitType("feature")).toBe("FEATURE");
    });

    it("should map 'fix' to FIX", () => {
      expect(mapCommitType("fix")).toBe("FIX");
    });

    it("should map 'infra' to INFRA", () => {
      expect(mapCommitType("infra")).toBe("INFRA");
    });

    it("should return OTHER for unknown types", () => {
      expect(mapCommitType("chore")).toBe("OTHER");
    });
  });

  describe("transformCommit", () => {
    it("should handle [TYPE](scope) message", () => {
      const result = transformCommit("[FEATURE](auth) Add login flow");
      expect(result).toEqual({
        type: "FEATURE",
        scope: "auth",
        message: "Add login flow",
        body: "",
      });
    });

    it("should handle [TYPE](scope) message with body", () => {
      const result = transformCommit(
        "[FEATURE](auth) Add login flow",
        "This is a body"
      );
      expect(result).toEqual({
        type: "FEATURE",
        scope: "auth",
        message: "Add login flow",
        body: "This is a body",
      });
    });

    it("should handle [TYPE](scope) with breaking change in body", () => {
      const result = transformCommit(
        "[FEATURE](auth) Add login flow",
        "BREAKING CHANGE: this is a breaking change"
      );
      expect(result).toEqual({
        type: "BREAKING",
        scope: "auth",
        message: "feature(auth): Add login flow",
        body: "BREAKING CHANGE: this is a breaking change",
      });
    });

    it("should handle [TYPE] message", () => {
      const result = transformCommit("[FIX] Resolve crash on startup");
      expect(result).toEqual({
        type: "FIX",
        scope: "",
        message: "Resolve crash on startup",
        body: "",
      });
    });

    it("should handle [TYPE] message with body", () => {
      const result = transformCommit(
        "[FIX] Resolve crash on startup",
        "This is a body"
      );
      expect(result).toEqual({
        type: "FIX",
        scope: "",
        message: "Resolve crash on startup",
        body: "This is a body",
      });
    });

    it("should handle [TYPE] message with breaking change", () => {
      const result = transformCommit(
        "[FIX] Resolve crash on startup",
        "BREAKING CHANGE: this is a breaking change"
      );
      expect(result).toEqual({
        type: "BREAKING",
        scope: "",
        message: "fix: Resolve crash on startup",
        body: "BREAKING CHANGE: this is a breaking change",
      });
    });

    it("should handle [TYPE] message with body with type OTHER", () => {
      const result = transformCommit(
        "[CHORE] Resolve crash on startup",
        "This is a body"
      );
      expect(result).toEqual({
        type: "OTHER",
        scope: "",
        message: "chore: Resolve crash on startup",
        body: "This is a body",
      });
    });

    it("should handle conventional commit with scope", () => {
      const result = transformCommit("feat(auth): add token validation");
      expect(result).toEqual({
        type: "FEATURE",
        scope: "auth",
        message: "add token validation",
        body: "",
      });
    });

    it("should handle conventional commit without scope", () => {
      const result = transformCommit("fix: patch memory leak");
      expect(result).toEqual({
        type: "FIX",
        scope: "",
        message: "patch memory leak",
        body: "",
      });
    });

    it("should detect breaking change via `!:`", () => {
      const result = transformCommit("feat(auth)!: major auth refactor");
      expect(result).toEqual({
        type: "BREAKING",
        scope: "auth",
        message: "feat(auth): major auth refactor",
        body: "",
      });
    });

    it("should detect breaking change via BREAKING CHANGE in body", () => {
      const result = transformCommit(
        "fix: update API usage",
        "BREAKING CHANGE: old API removed"
      );
      expect(result).toEqual({
        type: "BREAKING",
        scope: "",
        message: "fix: update API usage",
        body: "BREAKING CHANGE: old API removed",
      });
    });

    it("should fallback to OTHER for unknown formats", () => {
      const result = transformCommit("Refactor login flow");
      expect(result).toEqual({
        type: "OTHER",
        scope: "",
        message: "Refactor login flow",
        body: "",
      });
    });

    it("should fallback to OTHER for unknown formats", () => {
      const result = transformCommit("chore: Refactor login flow");
      expect(result).toEqual({
        type: "OTHER",
        scope: "",
        message: "chore: Refactor login flow",
        body: "",
      });
    });
  });
});

describe("Versioning Utilities", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("getLatestTags", () => {
    it("should return latest v<major>.<patch> tag", () => {
      execSync
        .mockReturnValueOnce("v1.1\nv1.0\nv0.9");

      const latest = getLatestTags();
      expect(latest).toBe("v1.1");
    });

    it("should fallback to v1.0 when no valid tags exist", () => {
      execSync
        .mockReturnValueOnce("")
        .mockReturnValueOnce("foo\nbar\n1.0");

      const latest = getLatestTags();
      expect(latest).toBe("v1.0");
    });
  });

  describe("getLatestBetaTag", () => {
    it("should return the latest beta tag object", () => {
      execSync.mockReturnValueOnce(
        ["v1.0", "v1.1-beta.1", "v1.1-beta.2", "v1.2-beta.1", "v1.1"].join("\n")
      );

      const result = getLatestBetaTag();
      expect(result).toEqual({
        full: "v1.2-beta.1",
        base: "1.2",
        number: 1,
      });
    });

    it("should return null if no beta tags are found", () => {
      execSync.mockReturnValueOnce("v1.0\nv1.1\nfoo");
      const result = getLatestBetaTag();
      expect(result).toBeNull();
    });
  });

  describe("getAllBetaNumbers", () => {
    it("should return an array of beta numbers for a version base", () => {
      execSync.mockReturnValueOnce(
        ["v1.2-beta.1", "v1.2-beta.2", "v1.1-beta.3"].join("\n")
      );
      const result = getAllBetaNumbers("v1.2");
      expect(result).toEqual([1, 2]);
    });

    it("should return an empty array if no matches", () => {
      execSync.mockReturnValueOnce("v1.1-beta.1\nv1.1-beta.2");
      const result = getAllBetaNumbers("v2.0");
      expect(result).toEqual([]);
    });
  });

  describe("getLatestHotfixTag", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it("returns null when no hotfix tags exist", () => {
      execSync.mockReturnValue("v1.0\nv1.1\nv1.2");
  
      const result = getLatestHotfixTag();
      expect(result).toBeNull();
    });
  
    it("returns the latest hotfix tag", () => {
      execSync.mockReturnValue(
        ["v1.0", "v1.2-hotfix.0", "v1.2-hotfix.1", "v1.1", "v1.3-hotfix.0"].join("\n")
      );
  
      const result = getLatestHotfixTag();
      expect(result).toEqual({
        full: "v1.3-hotfix.0",
        base: "1.3",
        number: 0,
      });
    });
  
    it("handles unordered input correctly and returns highest hotfix", () => {
      execSync.mockReturnValue(
        ["v1.2-hotfix.3", "v1.2-hotfix.10", "v1.2-hotfix.2"].join("\n")
      );
  
      const result = getLatestHotfixTag();
      expect(result).toEqual({
        full: "v1.2-hotfix.10",
        base: "1.2",
        number: 10,
      });
    });
  
    it("ignores tags that do not match hotfix pattern", () => {
      execSync.mockReturnValue(
        ["v1.2", "v1.2-beta.1", "v1.2-hotfix.1", "foo", "bar"].join("\n")
      );
  
      const result = getLatestHotfixTag();
      expect(result).toEqual({
        full: "v1.2-hotfix.1",
        base: "1.2",
        number: 1,
      });
    });
  });
});
