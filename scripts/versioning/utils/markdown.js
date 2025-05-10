const { getDateWIB } = require("./time");

/**
 * buildMarkdown - Build the markdown content for the changelog
 * @param {string} version
 * @param {Array} transformedCommits
 * @returns {string} - The formatted markdown content
 */
function buildMarkdown(version, transformedCommits) {
  const typeMap = {
    BREAKING: "MAJOR",
    FEATURE: "FEAT",
    FIX: "FIX",
    INFRA: "INFRA",
    OTHER: "OTHER",
  };

  const sections = {
    MAJOR: "### 🚨 Breaking Changes",
    FEAT: "### ✨ Feature",
    FIX: "### 🐛 Bug Fix",
    INFRA: "### 🔧 Infra Change",
    OTHER: "### 🗃 Other",
  };

  const grouped = {};

  for (const commit of transformedCommits) {
    const groupKey = typeMap[commit.type] || "OTHER";
    if (!grouped[groupKey]) grouped[groupKey] = [];

    let entry = `- ${commit.message}`;
    if (commit.body) {
      const bodyLines = commit.body.split("\n").filter(Boolean);
      entry += `\n${formatIndentedLines(bodyLines)}`;
    }

    grouped[groupKey].push(entry);
  }
  const date = getDateWIB();
  let out = `## ${version ? `${version} (${date})` : `(${date})`}\n\n`;
  for (const [key, title] of Object.entries(sections)) {
    if (grouped[key]) {
      out += `${title}\n${grouped[key].join("\n")}\n\n`;
    }
  }

  return out.trim().replace(/\n{3,}/g, "\n\n") + "\n\n";
}

/**
 * formatIndentedLines - Format a list of lines with dynamic nested indentation
 * based on bullet type transitions (*, -, •). This ensures consistent markdown
 * formatting that reflects logical structure depth.
 *
 * @param {string[]} lines - Array of lines (from git commit body)
 * @returns {string} - Formatted multiline string with proper indentation
 */
function formatIndentedLines(lines) {
  const indentStack = [];

  return lines
    .map((line) => {
      // Match leading bullet character (*, -, •)
      const match = line.match(/^\s*([-*•])\s+/);
      const currentBullet = match ? match[1] : null;

      if (currentBullet) {
        if (!indentStack.includes(currentBullet)) {
          // New bullet → deeper nesting
          indentStack.push(currentBullet);
        } else {
          // If bullet exists but is not on top, pop until we reach the same
          while (
            indentStack.length &&
            indentStack[indentStack.length - 1] !== currentBullet
          ) {
            indentStack.pop();
          }
        }
      }

      // Determine indentation level (default to 1 level for non-bullet)
      const indentLevel = indentStack.length || 1;
      const indent = "  ".repeat(indentLevel);

      // Return line with correct indentation
      return currentBullet
        ? `${indent}${line.trim()}`
        : `${indent}- ${line.trim()}`;
    })
    .join("\n");
}

module.exports = {
  buildMarkdown,
  formatIndentedLines,
};
