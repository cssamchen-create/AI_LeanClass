#!/usr/bin/env bash
# Consolidated prerequisite checking script (Bash)
#
# Usage: ./check-prerequisites.sh [OPTIONS]
#
# OPTIONS:
#   --json              Output in JSON format
#   --require-tasks     Require tasks.md to exist (for implementation phase)
#   --include-tasks     Include tasks.md in AVAILABLE_DOCS list
#   --paths-only        Only output path variables (no validation)
#   -h, --help          Show help message

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

JSON=false
REQUIRE_TASKS=false
INCLUDE_TASKS=false
PATHS_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json|-Json)      JSON=true ;;
    --require-tasks|-RequireTasks) REQUIRE_TASKS=true ;;
    --include-tasks|-IncludeTasks) INCLUDE_TASKS=true ;;
    --paths-only|-PathsOnly) PATHS_ONLY=true ;;
    -h|--help|-Help)
      echo "Usage: check-prerequisites.sh [OPTIONS]"
      echo ""
      echo "OPTIONS:"
      echo "  --json              Output in JSON format"
      echo "  --require-tasks     Require tasks.md to exist"
      echo "  --include-tasks     Include tasks.md in AVAILABLE_DOCS list"
      echo "  --paths-only        Only output path variables"
      echo "  -h, --help          Show this help"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

# Load all paths
get_feature_paths_env

# Validate feature branch
if ! test_feature_branch "$CURRENT_BRANCH" "$HAS_GIT"; then
  exit 1
fi

# Paths-only mode
if [ "$PATHS_ONLY" = true ]; then
  if [ "$JSON" = true ]; then
    printf '{"REPO_ROOT":"%s","BRANCH":"%s","FEATURE_DIR":"%s","FEATURE_SPEC":"%s","IMPL_PLAN":"%s","TASKS":"%s"}\n' \
      "$REPO_ROOT" "$CURRENT_BRANCH" "$FEATURE_DIR" "$FEATURE_SPEC" "$IMPL_PLAN" "$TASKS"
  else
    echo "REPO_ROOT: $REPO_ROOT"
    echo "BRANCH: $CURRENT_BRANCH"
    echo "FEATURE_DIR: $FEATURE_DIR"
    echo "FEATURE_SPEC: $FEATURE_SPEC"
    echo "IMPL_PLAN: $IMPL_PLAN"
    echo "TASKS: $TASKS"
  fi
  exit 0
fi

# Validate required directories and files
if [ ! -d "$FEATURE_DIR" ]; then
  echo "ERROR: Feature directory not found: $FEATURE_DIR" >&2
  echo "Run /speckit.specify first to create the feature structure." >&2
  exit 1
fi

if [ ! -f "$IMPL_PLAN" ]; then
  echo "ERROR: plan.md not found in $FEATURE_DIR" >&2
  echo "Run /speckit.plan first to create the implementation plan." >&2
  exit 1
fi

# Check for tasks.md if required
if [ "$REQUIRE_TASKS" = true ] && [ ! -f "$TASKS" ]; then
  echo "ERROR: tasks.md not found in $FEATURE_DIR" >&2
  echo "Run /speckit.tasks first to create the task list." >&2
  exit 1
fi

# Build list of available documents
docs=()
[ -f "$RESEARCH" ]  && docs+=("research.md")
[ -f "$DATA_MODEL" ] && docs+=("data-model.md")

# contracts/ only if directory exists and has files
if [ -d "$CONTRACTS_DIR" ] && [ -n "$(ls -A "$CONTRACTS_DIR" 2>/dev/null)" ]; then
  docs+=("contracts/")
fi

[ -f "$QUICKSTART" ] && docs+=("quickstart.md")

# Include tasks.md if requested and exists
if [ "$INCLUDE_TASKS" = true ] && [ -f "$TASKS" ]; then
  docs+=("tasks.md")
fi

# Output results
if [ "$JSON" = true ]; then
  # Build JSON array of docs
  docs_json="["
  first=true
  for doc in "${docs[@]+"${docs[@]}"}"; do
    if [ "$first" = true ]; then
      docs_json+="\"$doc\""
      first=false
    else
      docs_json+=",\"$doc\""
    fi
  done
  docs_json+="]"

  printf '{"FEATURE_DIR":"%s","AVAILABLE_DOCS":%s}\n' "$FEATURE_DIR" "$docs_json"
else
  echo "FEATURE_DIR:$FEATURE_DIR"
  echo "AVAILABLE_DOCS:"
  [ -f "$RESEARCH" ]  && echo "  ✓ research.md"  || echo "  ✗ research.md"
  [ -f "$DATA_MODEL" ] && echo "  ✓ data-model.md" || echo "  ✗ data-model.md"
  if [ -d "$CONTRACTS_DIR" ] && [ -n "$(ls -A "$CONTRACTS_DIR" 2>/dev/null)" ]; then
    echo "  ✓ contracts/"
  else
    echo "  ✗ contracts/"
  fi
  [ -f "$QUICKSTART" ] && echo "  ✓ quickstart.md" || echo "  ✗ quickstart.md"
  if [ "$INCLUDE_TASKS" = true ]; then
    [ -f "$TASKS" ] && echo "  ✓ tasks.md" || echo "  ✗ tasks.md"
  fi
fi
