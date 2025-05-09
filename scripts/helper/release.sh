#!/usr/bin/env bash
set -e

MODE=$1
TARGET_BRANCH=$2

# === Validate inputs ===
if [[ "$MODE" != "--hotfix" && -z "$MODE" ]]; then
  echo "❌  Missing or invalid argument."
  echo "ℹ️   Usage: $0 <VERSION_TYPE> | --hotfix <TARGET_BRANCH>"
  echo "     Example for release: $0 major"
  echo "     Example for hotfix : $0 --hotfix rc"
  exit 1
fi

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

# === Ensure GitHub CLI (gh) is installed ===
if ! command -v gh &>/dev/null; then
  echo "❌  GitHub CLI (gh) is not installed."
  echo "💡  Install it using one of the following:"
  echo "     macOS:   brew install gh"
  echo "     Ubuntu:  sudo apt install gh"
  echo "     Windows: winget install --id GitHub.cli"
  echo ""
  echo "     Then authenticate with: gh auth login"
  exit 1
fi

# === If hotfix mode ===
if [[ "$MODE" == "--hotfix" ]]; then
  if [[ -z "$TARGET_BRANCH" ]]; then
    echo "❌  Missing target branch for hotfix mode."
    echo "ℹ️   Usage: $0 --hotfix <TARGET_BRANCH>"
    exit 1
  fi

  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

  echo "📥  Checking out latest '$TARGET_BRANCH' branch..."
  git fetch origin "$TARGET_BRANCH"
  git checkout "$TARGET_BRANCH"
  git pull origin "$TARGET_BRANCH"

  echo "🔢  Generating hotfix version from current branch '$CURRENT_BRANCH'..."
  VERSION=$(node ./scripts/versioning/generate-version.js --hotfix | grep VERSION | cut -d'=' -f2)

  if [[ -z "$VERSION" ]]; then
    echo "❌  Failed to generate hotfix version."
    exit 1
  fi

  echo "🚑  Creating hotfix pull request from '$CURRENT_BRANCH' to 'release'..."
  gh pr create \
    --base release \
    --head "$CURRENT_BRANCH" \
    --title "[HOTFIX][PRODUCTION] ${VERSION}" \
    --body "This hotfix PR is automatically generated by \`./release.sh --hotfix $TARGET_BRANCH\` by @$GIT_NAME."

  git checkout main

  echo "🎉  Hotfix PR created successfully!"
  exit 0
fi

# === Normal release flow ===
VERSION_TYPE=$MODE

echo "📥  Checking out latest 'rc' branch..."
git fetch origin
git checkout rc
git pull origin rc

echo "🔢  Generating next release version from '$VERSION_TYPE'..."
VERSION=$(node ./scripts/versioning/generate-version.js "$VERSION_TYPE" release | grep VERSION | cut -d'=' -f2)

if [[ -z "$VERSION" ]]; then
  echo "❌  Failed to retrieve version from Node script."
  exit 1
fi

echo "✅  Next version: $VERSION"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "🚀  Creating pull request to 'release' branch..."
gh pr create \
  --base release \
  --head "$CURRENT_BRANCH" \
  --title "[RELEASE][PRODUCTION] ${VERSION}" \
  --body "This pull request is automatically generated by \`./release.sh $VERSION_TYPE\` by @$GIT_NAME."

git checkout main

echo "🎉  Pull request created successfully!"
