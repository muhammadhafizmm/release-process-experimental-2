const { execSync } = require("child_process");
const { bumpVersion, isSemverGreater } = require("./utils/semver");
const {
  getAllBetaNumbers,
  getLatestTags,
  getLatestBetaTag,
  getLatestHotfixTag,
} = require("./utils/github");

/**
 * generateVersion
 * @param {"major" | "patch"} type
 * @param {"release" | "rc"} target
 * @param {boolean} isHotfix
 * @returns {string}
 */
function generateVersion(type, target, isHotfix = false) {
  execSync("git fetch --tags --all", { stdio: "ignore" });

  const latestStable = getLatestTags();

  if (isHotfix) {
    const latestHotfix = getLatestHotfixTag();
    let versionBase = latestStable.replace(/^v/, ""); // e.g. 1.2
    let next = 0;

    if (latestHotfix && latestHotfix.base === versionBase) {
      next = latestHotfix.number + 1;
    }

    const version = `v${versionBase}-hotfix.${next}`;
    console.log(`🚑 Next hotfix version: ${version}`);
    return version;
  }

  const nextBase = bumpVersion(latestStable, type);

  if (target === "release") {
    console.log(`🚀 Next release version: ${nextBase}`);
    return nextBase;
  }

  if (target === "rc") {
    const latestBeta = getLatestBetaTag();
    let versionBase = nextBase;
    let beta = 0;

    if (latestBeta && isSemverGreater(latestBeta.base, nextBase)) {
      versionBase = latestBeta.base;
      beta = latestBeta.number + 1;
    } else {
      const baseBetas = getAllBetaNumbers(versionBase);
      beta = baseBetas.length ? Math.max(...baseBetas) + 1 : 0;
    }

    const version = `${versionBase}-beta.${beta}`;
    console.log(`🚀 Next beta version: ${version}`);
    return version;
  }

  console.error("❌ Invalid target. Use 'rc' or 'release'.");
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  const isHotfix = args.includes("--hotfix");

  if (isHotfix) {
    const version = generateVersion(null, null, true);
    if (version) console.log(`VERSION=${version}`);
    return;
  }

  const type = args.find((arg) => arg === "major" || arg === "patch");
  const target = args.find((arg) => arg === "rc" || arg === "release");

  if (!type && !target) {
    console.error(
      "❌ Missing args.\n" +
        "Usage:\n" +
        "  node script.js <major|patch> <rc|release>\n" +
        "  node script.js --hotfix  # no type/target required\n"
    );
    process.exit(1);
  }

  const version = generateVersion(type, target, isHotfix);
  if (version) console.log(`VERSION=${version}`);
}
if (require.main === module) {
  main();
}

module.exports = {
  generateVersion,
};
