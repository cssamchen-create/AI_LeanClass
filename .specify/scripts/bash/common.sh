#!/usr/bin/env bash
# Common bash functions for Spec Kit scripts

# Find repository root by searching upward for .specify directory
find_specify_root() {
  local current="${1:-$(pwd)}"
  current="$(cd "$current" && pwd)"  # normalize to absolute

  while true; do
    if [ -d "$current/.specify" ]; then
      echo "$current"
      return 0
    fi
    local parent
    parent="$(dirname "$current")"
    if [ "$parent" = "$current" ]; then
      return 1
    fi
    current="$parent"
  done
}

# Get repository root (.specify dir takes priority over git)
get_repo_root() {
  local specify_root
  specify_root="$(find_specify_root 2>/dev/null)"
  if [ -n "$specify_root" ]; then
    echo "$specify_root"
    return 0
  fi

  # Fallback: git toplevel
  local git_root
  git_root="$(git rev-parse --show-toplevel 2>/dev/null)"
  if [ -n "$git_root" ]; then
    echo "$git_root"
    return 0
  fi

  # Final fallback: script location ../../..
  echo "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
}

# Get current branch / feature name
get_current_branch() {
  if [ -n "${SPECIFY_FEATURE:-}" ]; then
    echo "$SPECIFY_FEATURE"
    return 0
  fi

  local repo_root
  repo_root="$(get_repo_root)"

  if git -C "$repo_root" rev-parse --abbrev-ref HEAD 2>/dev/null; then
    return 0
  fi

  # Non-git: find latest feature dir under specs/
  local specs_dir="$repo_root/specs"
  if [ -d "$specs_dir" ]; then
    local latest=""
    local highest=0
    local latest_ts=""
    for d in "$specs_dir"/*/; do
      local name
      name="$(basename "$d")"
      if [[ "$name" =~ ^([0-9]{8}-[0-9]{6})- ]]; then
        local ts="${BASH_REMATCH[1]}"
        if [[ "$ts" > "$latest_ts" ]]; then
          latest_ts="$ts"
          latest="$name"
        fi
      elif [[ "$name" =~ ^([0-9]{3,})- ]]; then
        local num="${BASH_REMATCH[1]}"
        if [ "$num" -gt "$highest" ]; then
          highest="$num"
          if [ -z "$latest_ts" ]; then
            latest="$name"
          fi
        fi
      fi
    done
    if [ -n "$latest" ]; then
      echo "$latest"
      return 0
    fi
  fi

  echo "main"
}

# Check if git is available in the repo root
has_git() {
  if ! command -v git &>/dev/null; then
    return 1
  fi
  local repo_root
  repo_root="$(get_repo_root)"
  if [ ! -e "$repo_root/.git" ]; then
    return 1
  fi
  git -C "$repo_root" rev-parse --is-inside-work-tree &>/dev/null
}

# Strip single path segment prefix (e.g. "feat/004-name" -> "004-name")
get_effective_branch_name() {
  local branch="$1"
  if [[ "$branch" =~ ^[^/]+/([^/]+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "$branch"
  fi
}

# Validate feature branch name
test_feature_branch() {
  local branch="$1"
  local has_git="$2"

  if [ "$has_git" != "true" ]; then
    echo "[specify] Warning: Git repository not detected; skipped branch validation" >&2
    return 0
  fi

  local effective
  effective="$(get_effective_branch_name "$branch")"

  # Check for malformed timestamp
  if [[ "$effective" =~ ^[0-9]{7}-[0-9]{6}- ]] || [[ "$effective" =~ ^([0-9]{7}|[0-9]{8})-[0-9]{6}$ ]]; then
    echo "ERROR: Not on a feature branch. Current branch: $branch" >&2
    return 1
  fi

  if [[ "$effective" =~ ^[0-9]{3,}- ]] || [[ "$effective" =~ ^[0-9]{8}-[0-9]{6}- ]]; then
    return 0
  fi

  echo "ERROR: Not on a feature branch. Current branch: $branch" >&2
  echo "Feature branches should be named like: 001-feature-name or 20260319-143022-feature-name" >&2
  return 1
}

# Find feature directory by branch prefix
find_feature_dir_by_prefix() {
  local repo_root="$1"
  local branch="$2"
  local effective
  effective="$(get_effective_branch_name "$branch")"
  local specs_dir="$repo_root/specs"

  local prefix=""
  if [[ "$effective" =~ ^([0-9]{8}-[0-9]{6})- ]]; then
    prefix="${BASH_REMATCH[1]}"
  elif [[ "$effective" =~ ^([0-9]{3,})- ]]; then
    prefix="${BASH_REMATCH[1]}"
  else
    echo "$specs_dir/$effective"
    return 0
  fi

  if [ -d "$specs_dir" ]; then
    local matches=()
    for d in "$specs_dir/$prefix"-*/; do
      [ -d "$d" ] && matches+=("${d%/}")
    done
    if [ "${#matches[@]}" -eq 0 ]; then
      echo "$specs_dir/$effective"
      return 0
    elif [ "${#matches[@]}" -eq 1 ]; then
      echo "${matches[0]}"
      return 0
    else
      echo "ERROR: Multiple spec directories found with prefix '$prefix'" >&2
      return 1
    fi
  fi

  echo "$specs_dir/$effective"
}

# Get all feature paths as env variables
get_feature_paths_env() {
  REPO_ROOT="$(get_repo_root)"
  CURRENT_BRANCH="$(get_current_branch)"
  if has_git; then HAS_GIT=true; else HAS_GIT=false; fi

  # Resolve feature directory: env var > feature.json > branch prefix
  local feature_json="$REPO_ROOT/.specify/feature.json"
  if [ -n "${SPECIFY_FEATURE_DIRECTORY:-}" ]; then
    FEATURE_DIR="$SPECIFY_FEATURE_DIRECTORY"
    # Normalize to absolute
    if [[ "$FEATURE_DIR" != /* ]]; then
      FEATURE_DIR="$REPO_ROOT/$FEATURE_DIR"
    fi
  elif [ -f "$feature_json" ]; then
    local feature_dir_raw
    feature_dir_raw="$(python3 -c "import json,sys; d=json.load(open('$feature_json')); print(d.get('feature_directory',''))" 2>/dev/null)"
    if [ -n "$feature_dir_raw" ]; then
      FEATURE_DIR="$feature_dir_raw"
      if [[ "$FEATURE_DIR" != /* ]]; then
        FEATURE_DIR="$REPO_ROOT/$FEATURE_DIR"
      fi
    else
      FEATURE_DIR="$(find_feature_dir_by_prefix "$REPO_ROOT" "$CURRENT_BRANCH")"
    fi
  else
    FEATURE_DIR="$(find_feature_dir_by_prefix "$REPO_ROOT" "$CURRENT_BRANCH")"
  fi

  FEATURE_SPEC="$FEATURE_DIR/spec.md"
  IMPL_PLAN="$FEATURE_DIR/plan.md"
  TASKS="$FEATURE_DIR/tasks.md"
  RESEARCH="$FEATURE_DIR/research.md"
  DATA_MODEL="$FEATURE_DIR/data-model.md"
  QUICKSTART="$FEATURE_DIR/quickstart.md"
  CONTRACTS_DIR="$FEATURE_DIR/contracts"
}

# Resolve template path with priority stack
resolve_template() {
  local template_name="$1"
  local repo_root="$2"
  local base="$repo_root/.specify/templates"

  # Priority 1: Project overrides
  local override="$base/overrides/$template_name.md"
  [ -f "$override" ] && { echo "$override"; return 0; }

  # Priority 2: Installed presets
  local presets_dir="$repo_root/.specify/presets"
  if [ -d "$presets_dir" ]; then
    for preset_dir in "$presets_dir"/*/; do
      [ -d "$preset_dir" ] || continue
      local candidate="$preset_dir/templates/$template_name.md"
      [ -f "$candidate" ] && { echo "$candidate"; return 0; }
    done
  fi

  # Priority 3: Extension-provided templates
  local ext_dir="$repo_root/.specify/extensions"
  if [ -d "$ext_dir" ]; then
    for ext in "$ext_dir"/*/; do
      [ -d "$ext" ] || continue
      local candidate="$ext/templates/$template_name.md"
      [ -f "$candidate" ] && { echo "$candidate"; return 0; }
    done
  fi

  # Priority 4: Core templates
  local core="$base/$template_name.md"
  [ -f "$core" ] && { echo "$core"; return 0; }

  return 1
}
