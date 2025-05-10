const { bumpVersion, isSemverGreater } = require("../utils/semver");
const {
  getAllBetaNumbers,
  getLatestTags,
  getLatestBetaTag,
  getLatestHotfixTag,
} = require("../utils/github");

jest.mock("../utils/semver");
jest.mock("../utils/github");

const { generateVersion } = require("../generate-version");

describe("generateVersion", () => {
  let logSpy;
  let errorSpy;
  let exitSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("returns next stable release version", () => {
    getLatestTags.mockReturnValue("v1.2");
    bumpVersion.mockReturnValue("v1.3");

    const version = generateVersion("major", "release");
    expect(version).toBe("v1.3");
    expect(logSpy).toHaveBeenCalledWith("🚀 Next release version: v1.3");
  });

  it("returns next beta version starting from 0", () => {
    getLatestTags.mockReturnValue("v1.2");
    bumpVersion.mockReturnValue("v1.2");
    getLatestBetaTag.mockReturnValue(null);
    getAllBetaNumbers.mockReturnValue([]);

    const version = generateVersion("patch", "rc");
    expect(version).toBe("v1.2-beta.0");
    expect(logSpy).toHaveBeenCalledWith("🚀 Next beta version: v1.2-beta.0");
  });

  it("returns next beta version continuing from existing", () => {
    getLatestTags.mockReturnValue("v1.2");
    bumpVersion.mockReturnValue("v1.2");
    getLatestBetaTag.mockReturnValue({
      base: "1.2",
      number: 1,
      full: "v1.2-beta.1",
    });
    isSemverGreater.mockReturnValue(false);
    getAllBetaNumbers.mockReturnValue([0, 1]);

    const version = generateVersion("patch", "rc");
    expect(version).toBe("v1.2-beta.2");
  });

  it("returns next beta from higher beta base version", () => {
    getLatestTags.mockReturnValue("v1.2");
    bumpVersion.mockReturnValue("v1.2");
    getLatestBetaTag.mockReturnValue({
      base: "1.3",
      number: 5,
      full: "v1.3-beta.5",
    });
    isSemverGreater.mockReturnValue(true);

    const version = generateVersion("patch", "rc");
    expect(version).toBe("1.3-beta.6");
  });

  it("exits with error on invalid target", () => {
    getLatestTags.mockReturnValue("v1.0");
    bumpVersion.mockReturnValue("v1.1");

    expect(() => generateVersion("patch", "invalid")).toThrow(
      "process.exit called"
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "❌ Invalid target. Use 'rc' or 'release'."
    );
  });

  it("returns next hotfix version starting from 0 when no existing hotfix", () => {
    getLatestTags.mockReturnValue("v1.2");
    getLatestHotfixTag.mockReturnValue(null);
  
    const version = generateVersion("patch", "release", true);
    expect(version).toBe("v1.2-hotfix.0");
    expect(logSpy).toHaveBeenCalledWith("🚑 Next hotfix version: v1.2-hotfix.0");
  });
  
  it("returns next hotfix version continuing from existing", () => {
    getLatestTags.mockReturnValue("v1.2");
    getLatestHotfixTag.mockReturnValue({
      base: "1.2",
      number: 1,
      full: "v1.2-hotfix.1",
    });
  
    const version = generateVersion("patch", "release", true);
    expect(version).toBe("v1.2-hotfix.2");
    expect(logSpy).toHaveBeenCalledWith("🚑 Next hotfix version: v1.2-hotfix.2");
  });
  
  it("returns hotfix 0 if latest hotfix is from different base", () => {
    getLatestTags.mockReturnValue("v1.3");
    getLatestHotfixTag.mockReturnValue({
      base: "1.2",
      number: 3,
      full: "v1.2-hotfix.3",
    });
  
    const version = generateVersion("patch", "release", true);
    expect(version).toBe("v1.3-hotfix.0");
    expect(logSpy).toHaveBeenCalledWith("🚑 Next hotfix version: v1.3-hotfix.0");
  });
  
});
