const { parseVersion, bumpVersion, isSemverGreater } = require("../semver");

describe("parseVersion", () => {
  it("should parse version string with 'v' prefix", () => {
    expect(parseVersion("v1.2")).toEqual([1, 2]);
    expect(parseVersion("v0.9")).toEqual([0, 9]);
  });

  it("should parse version string without 'v' prefix", () => {
    expect(parseVersion("2.5")).toEqual([2, 5]);
  });

  it("should parse version string with trailing 0", () => {
    expect(parseVersion("v3.0")).toEqual([3, 0]);
  });

  it("should parse version and convert to numbers", () => {
    expect(parseVersion("v10.20")).toEqual([10, 20]);
  });
});

describe("bumpVersion", () => {
  it("should bump major version correctly", () => {
    expect(bumpVersion("v1.2", "major")).toBe("v2.0");
    expect(bumpVersion("v0.0", "major")).toBe("v1.0");
  });

  it("should bump patch version correctly", () => {
    expect(bumpVersion("v1.2", "patch")).toBe("v1.3");
    expect(bumpVersion("v5.9", "patch")).toBe("v5.10");
  });

  it("should return undefined for invalid type", () => {
    expect(bumpVersion("v1.2", "minor")).toBeUndefined();
    expect(bumpVersion("v1.2", "")).toBeUndefined();
  });

  it("should handle version string without 'v' prefix", () => {
    expect(bumpVersion("2.4", "patch")).toBe("v2.5");
    expect(bumpVersion("2.4", "major")).toBe("v3.0");
  });
});

describe("isSemverGreater", () => {
  it("returns true if major is greater", () => {
    expect(isSemverGreater("v2.3", "v1.2")).toBe(true);
    expect(isSemverGreater("v3.1", "v1.0")).toBe(true);
  });

  it("returns true if major is less", () => {
    expect(isSemverGreater("v1.3", "v3.4")).toBe(false);
    expect(isSemverGreater("v2.1", "v5.2")).toBe(false);
  });

  it("returns true if patch is greater", () => {
    expect(isSemverGreater("v2.3", "v2.2")).toBe(true);
    expect(isSemverGreater("v1.1", "v1.0")).toBe(true);
  });

  it("returns false if patch is less", () => {
    expect(isSemverGreater("v2.1", "v2.2")).toBe(false);
  });
});
