const path = require("path");
const fs = require("fs");
const { getCommits, transformCommit } = require("./utils/github");
const { buildMarkdown } = require("./utils/markdown");

/**
 * generateChangelog - Generates a changelog based on commit messages between two refs.
 * @param {string} target - The target branch or commit to compare against
 * @param {string} origin - The origin branch or commit to compare from
 * @param {string | undefined} output - The output file path for the changelog
 * @param {string | undefined} version - The version string to include in the changelog
 */
function generateChangelog(target, origin, output, version = "") {
  const commits = getCommits(target, origin);
  const transformedCommits = commits.map((commit) =>
    transformCommit(commit.subject, commit.body)
  );
  const changelog = buildMarkdown(version, transformedCommits);
  const header = "# Changelog\n\n";
  if (output) {
    const fileExt = path.extname(output); // .md
    const fileName = path.basename(output).toLowerCase();
    if (fileName === "changelog.md") {
      if (fs.existsSync(output)) {
        const existing = fs
          .readFileSync(output, "utf-8")
          .split("\n")
          .slice(1)
          .join("\n");
        fs.writeFileSync(output, header + changelog + existing);
      } else {
        fs.writeFileSync(output, header + changelog);
      }
      
      // Create a temporary file without the header for GitHub release notes
      const strippedOutput = changelog
        .split("\n")
        .slice(1)
        .join("\n")
        .replace(/^\s*\n/, "");
      const outputFileName = path.basename(output, fileExt);
      fs.writeFileSync(
        path.join(path.dirname(output), `${outputFileName}_temp${fileExt}`),
        header + strippedOutput
      );
    } else {
      fs.writeFileSync(output, header + changelog);
    }
    console.log(`✅ ${output} updated`);
  } else {
    console.log(header + changelog);
  }
}

function main() {
  const [, , target, origin, output, version] = process.argv;
  if (!target || !origin) {
    console.error(
      "❌ Error: Both 'target' and 'origin' parameters are required."
    );
    console.error(
      "Usage: node ./generate-changelog.js <from> <to> [output] [version]"
    );
    console.error(
      "Example: node ./generate-changelog.js origin/main origin/release v1.2.0 CHANGELOG.md"
    );
    process.exit(1);
  }
  generateChangelog(target, origin, output, version);
}

if (require.main === module) {
  main();
}

module.exports = {
  generateChangelog,
};
