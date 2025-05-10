/**
 * parseVersion
 * Parses a semantic version string into an array of numbers.
 * @param {string} v
 * @returns {number[]} - The parsed version as an array of numbers
 */
function parseVersion(v) {
  return v.replace(/^v/, "").split(".").map(Number);
}

/**
 * Bumps the version based on the type of change.
 * @param {string} current
 * @param {string} type
 * @returns {string} - The new version
 */
function bumpVersion(current, type) {
  const [major, patch] = parseVersion(current);
  if (type === "major") return `v${major + 1}.0`;
  if (type === "patch") return `v${major}.${patch + 1}`;
}

/**
 * isSemverGreater
 * Compares two semantic versions.
 * @param {number} a
 * @param {number} b
 * @returns {boolean} - True if a > b
 */
function isSemverGreater(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 2; i++) {
    if (pa[i] > pb[i]) return true;
    if (pa[i] < pb[i]) return false;
  }
  return false;
}

module.exports = {
  parseVersion,
  bumpVersion,
  isSemverGreater,
};
