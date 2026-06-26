# agents.config.sh — LevelUp Kids fleet manifest (plumbing only).
# Semantics (gating checks, branch prefixes, local gate, hard NOs) live in
# AGENTS.md § Agent parameters. After editing, redeploy:
#   bash ../agent-fleet/lib/install.sh /Users/mutaafaziz/Desktop/projects/levelup-kids

PROJECT_NAME="LevelUp Kids"
SLUG="levelup-kids"
NAMESPACE="com.levelup-kids"
REPO_URL="https://github.com/mutaaf/levelup-kids"
MODEL="claude-opus-4-7"

GIT_AUTHOR_NAME="LevelUp Kids Agent"
GIT_AUTHOR_EMAIL="noreply@anthropic.com"

# Bound autonomous spend. Bump via `keep-running` from the fleet-control portal.
SELF_CANCEL="20260716"

# Aggressive v1.0 build cadence (set 2026-06-17): ship every 2 hours at :17,
# groom every 6 hours at :41, review every 5 min. With ~15 v1.0 tickets left
# and a successful ship+heal averaging $2–4, this should clear v1.0 in 2–3 days
# at the cost of more wasted token spend when a ship hits the silent-death
# pattern. Throttle back to "0 6 12 18" once v1.0 lands.
SHIP_MINUTE="17"
GROOM_HOURS="0 6 12 18"
GROOM_MINUTE="41"
REVIEW_INTERVAL="300"

# Engineering queue off until v1.1 — focus the loop on feature shipping during
# the 6-week core. Flip to 1 after 0018 ships.
ENG_ENABLED=0
SHIP_HOURS="0 2 4 6 8 10 12 14 16 18 20 22"
ENG_HOURS="0"
ENG_MINUTE="23"
