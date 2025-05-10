const { execSync } = require("child_process");

/**
 * getCommits
 * Fetches commit messages (subject + body) between two refs.
 * @param {string} from
 * @param {string} to
 * @returns {{subject: string, body: string}[]}
 */
function getCommits(from, to) {
  const githubRepoUrl = getGitHubRepoUrl();
  const raw = execSync(
    `git log ${from}..${to} --no-merges --pretty=format:%s%n%h%n%b%n---END---`,
    { encoding: "utf-8" }
  );

  const commits = raw.split("---END---").map((chunk) => {
    const [subject, sha, ...body] = chunk.trim().split("\n");
    return {
      subject:
        subject.trim() +
        (sha && githubRepoUrl
          ? ` [(${sha.trim()})](${githubRepoUrl}/commit/${sha.trim()})`
          : ""),
      body: body.join("\n").trim(),
    };
  });

  return commits.filter((c) => c.subject);
}

/**
 * getGitHubRepoUrl - Get the GitHub repository URL from the git remote
 * @returns {string} - The GitHub repository URL
 */
function getGitHubRepoUrl() {
  try {
    const remote = execSync("git remote get-url origin", {
      encoding: "utf-8",
    }).trim();
    const sshMatch = remote.match(/^git@github.com:(.*)\.git$/);
    const httpsMatch = remote.match(/^https:\/\/github.com\/(.*?)(\.git)?$/);
    if (sshMatch) return `https://github.com/${sshMatch[1]}`;
    if (httpsMatch) return `https://github.com/${httpsMatch[1]}`;
  } catch (_) {
    console.warn("🚨 Unable to parse GitHub repository URL");
    return "";
  }
  return "";
}

/**
 * transformCommit - transform commit subject following conventional commit
 * @param {string} subject - The commit subject
 * @param {string} body - The commit body (optional)
 * @returns {object} - An object containing the classified subject and breaking change status
 */
function transformCommit(subject, body = "") {
  subject = subject.trim();
  const isBreaking =
    subject.includes("!:") || body.includes("BREAKING CHANGE:");

  let scope = "";
  let detectedType = "";
  let standardizedType = "OTHER";
  let message = subject;

  // Try matching [TYPE](scope) message format
  const scopedFormat = /^\[(\w+)\]\(([^)]+)\)\s*(.+)$/;
  const typeOnlyFormat = /^\[(\w+)\]\s*(.+)$/;
  const conventionalFormat = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

  if (scopedFormat.test(subject)) {
    const [, rawType, rawScope, text] = subject.match(scopedFormat);
    detectedType = rawType;
    scope = rawScope;
    message = text;
  } else if (typeOnlyFormat.test(subject)) {
    const [, rawType, text] = subject.match(typeOnlyFormat);
    detectedType = rawType;
    message = text;
  } else if (conventionalFormat.test(subject)) {
    const [, rawType, rawScope = "", , text] =
      subject.match(conventionalFormat);
    detectedType = rawType;
    scope = rawScope;
    message = text;
  }

  // Determine standardized type
  standardizedType = isBreaking ? "BREAKING" : mapCommitType(detectedType);

  // Clean up redundant prefix in message for non-breaking commits
  if (!isBreaking && ["FEATURE", "FIX", "INFRA"].includes(standardizedType)) {
    message = message.replace(/^(feat|fix|infra)(\([^)]*\))?!?:\s*/i, "");
  } else {
    if (detectedType) {
      message = scope
        ? `${detectedType.toLowerCase()}(${scope}): ${message}`
        : `${detectedType.toLowerCase()}: ${message}`;
    }
  }

  return { type: standardizedType, scope, message, body };
}

/**
 * mapCommitType - Map raw commit type to standardized type
 * @param {string} rawType - The raw commit type (e.g., "feat", "fix", "infra")
 * @returns {string} - The standardized commit type (e.g., "FEATURE", "FIX", "INFRA")
 */
function mapCommitType(rawType) {
  const normalized = rawType.toLowerCase();
  switch (normalized) {
    case "feat":
    case "feature":
      return "FEATURE";
    case "fix":
      return "FIX";
    case "infra":
      return "INFRA";
    default:
      return "OTHER";
  }
}

/**
 * getLatestTags - Fetch and return the latest v<major>.<minor> tag
 * sorted by annotated tag creation date (creatordate).
 * @returns {string} - The latest valid tag or fallback to "v1.0"
 */
function getLatestTags() {
  const tags = execSync("git tag --sort=-v:refname", { encoding: "utf-8" })
    .split("\n")
    .filter((tag) => /^v\d+\.\d+$/.test(tag));
  return tags[0] || "v1.0";
}

/**
 * getLatestBetaTag
 * Finds the latest beta tag in format vX.Y-beta.N
 * @returns {{ full: string, base: string, number: number } | null}
 */
function getLatestBetaTag() {
  const tags = execSync("git tag", { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  const betaTags = tags.filter((tag) => /^v\d+\.\d+-beta\.\d+$/.test(tag));

  if (betaTags.length === 0) return null;

  const latestBeta = betaTags[betaTags.length - 1];
  const match = latestBeta.match(/^v(\d+\.\d+)-beta\.(\d+)$/);

  return {
    full: latestBeta,
    base: match[1],
    number: parseInt(match[2]),
  };
}

/**
 * getAllBetaNumbers
 * Returns an array of beta numbers for a given version base.
 * @param {string} versionBase - The base version in format vX.Y
 * @returns {number[]} - An array of beta numbers
 */
function getAllBetaNumbers(versionBase) {
  const tags = execSync("git tag", { encoding: "utf8" })
    .split("\n")
    .filter((tag) => tag.startsWith(`${versionBase}-beta.`));

  return tags
    .map((tag) => parseInt(tag.split(".").pop(), 10))
    .filter(Number.isInteger);
}

/**
 * getLatestHotfixTag - Find latest hotfix tag: vX.Y-hotfix.N
 * @returns {{ full: string, base: string, number: number } | null}
 */
function getLatestHotfixTag() {
  const tags = execSync("git tag", { encoding: "utf-8" })
    .split("\n")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  const hotfixTags = tags.filter((tag) => /^v\d+\.\d+-hotfix\.\d+$/.test(tag));
  if (hotfixTags.length === 0) return null;

  const latest = hotfixTags[hotfixTags.length - 1];
  const match = latest.match(/^v(\d+\.\d+)-hotfix\.(\d+)$/);
  return {
    full: latest,
    base: match[1],
    number: parseInt(match[2], 10),
  };
}

module.exports = {
  getCommits,
  getGitHubRepoUrl,
  transformCommit,
  mapCommitType,
  getLatestTags,
  getLatestBetaTag,
  getAllBetaNumbers,
  getLatestHotfixTag,
};
