#!/usr/bin/env bash
set -e

COMMIT_SHA=$1

# === Validate input ===
if [ -z "$COMMIT_SHA" ]; then
  echo "❌  Missing commit SHA argument."
  echo "ℹ️   Usage: $0 <COMMIT_SHA>"
  echo "     Example: $0 abc1234"
  exit 1
fi

# === Ensure dependencies ===
command -v git >/dev/null || { echo "❌  git is not installed."; exit 1; }
command -v node >/dev/null || { echo "❌  node is not installed."; exit 1; }
command -v gh >/dev/null || { echo "❌  GitHub CLI (gh) is not installed."; exit 1; }

# === Ensure working directory is clean ===
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌  Your working directory is not clean."
  echo "💡  Please commit or stash your changes before running this script."
  exit 1
fi

# === Ensure Git user config is set ===
GIT_NAME=$(git config user.name || true)
GIT_EMAIL=$(git config user.email || true)

if [[ -z "$GIT_NAME" || -z "$GIT_EMAIL" ]]; then
  echo "❌  Git user.name or user.email is not configured."
  echo "💡  Configure it with:"
  echo "     git config --global user.name \"Your Name\""
  echo "     git config --global user.email \"you@example.com\""
  exit 1
fi

# === Sync release, rc, main branches ===
if [ -f ./scripts/helper/sync.sh ]; then
  echo "🔄  Syncing branches: release, rc, main..."
  ./scripts/helper/sync.sh > /dev/null 2>&1
fi

# === Prepare rc branch ===
echo "📦  Checking out latest 'rc' branch..."
git checkout rc > /dev/null 2>&1

# === Cherry-pick the commit ===
echo "🍒  Cherry-picking commit $COMMIT_SHA..."
if ! git cherry-pick --no-commit "$COMMIT_SHA" > /dev/null 2>&1; then
  echo "❌  Cherry-pick failed. Resolve conflicts and try again."
  exit 1
fi

git commit -m "chore: cherry-pick $COMMIT_SHA into staging" > /dev/null 2>&1

# === Generate version tag ===
echo "🔢  Generating new RC version tag..."
VERSION=$(node ./scripts/versioning/generate-version.js patch rc 2>/dev/null | grep VERSION | cut -d'=' -f2)

if [[ -z "$VERSION" ]]; then
  echo "❌  Failed to generate version tag."
  exit 1
fi 

echo "🔖  Creating tag: $VERSION..."
git tag "$VERSION" > /dev/null 2>&1

# === Create ChangeLog ===
echo "📜  Generating Changelog for version $VERSION..."
node ./scripts/versioning/generate-changelog.js origin/rc HEAD CHANGELOG.md "$VERSION" > /dev/null 2>&1

# === Push to origin ===
echo "🚀  Pushing changes to 'origin/rc'..."
git push origin rc > /dev/null 2>&1

echo "🚀  Pushing tag $VERSION to origin..."
git push origin "$VERSION" > /dev/null 2>&1

# === Create GitHub release ===
echo "📝  Creating GitHub release for tag $VERSION..."
gh release create "$VERSION" --title "$VERSION" --notes-file CHANGELOG_temp.md --prerelease > /dev/null 2>&1

# === Cleanup changelog files ===
echo "🧹  Cleaning up temporary changelog files..."
rm -f CHANGELOG.md CHANGELOG_temp.md > /dev/null 2>&1

# === Restore main branch ===
git checkout main > /dev/null 2>&1

echo "✅  Done! Commit $COMMIT_SHA has been cherry-picked to 'rc' and tagged as $VERSION."
