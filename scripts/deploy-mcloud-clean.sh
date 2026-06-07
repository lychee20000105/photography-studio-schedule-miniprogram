#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLOUD_FUNCTION_DIR="$ROOT_DIR/cloudfunctions/mcloud"
ENV_ID="${ENV_ID:-yunyukeji-d4g7waei5d5d6cdeb}"
APPID="${APPID:-wx16193bf2c2e4c22b}"
DEVTOOLS_CLI="${DEVTOOLS_CLI:-/Applications/wechatwebdevtools.app/Contents/MacOS/cli}"

STAGE_PARENT="${STAGE_PARENT:-$(mktemp -d /tmp/yunyu-mcloud-clean.XXXXXX)}"
STAGE_DIR="$STAGE_PARENT/mcloud"

if [[ ! -d "$CLOUD_FUNCTION_DIR" ]]; then
	echo "Cloud function directory not found: $CLOUD_FUNCTION_DIR" >&2
	exit 1
fi

if [[ ! -x "$DEVTOOLS_CLI" ]]; then
	echo "WeChat DevTools CLI not found or not executable: $DEVTOOLS_CLI" >&2
	exit 1
fi

mkdir -p "$STAGE_DIR"

rsync -a \
	--exclude 'node_modules' \
	--exclude '.DS_Store' \
	--exclude '.git' \
	"$CLOUD_FUNCTION_DIR/" "$STAGE_DIR/"

if find "$STAGE_DIR" -path '*/node_modules' -type d -print -quit | grep -q .; then
	echo "Unexpected node_modules found in stage directory: $STAGE_DIR" >&2
	exit 1
fi

echo "Prepared clean mcloud stage:"
echo "$STAGE_DIR"
echo

if [[ "${1:-}" == "--deploy" ]]; then
	"$DEVTOOLS_CLI" cloud functions deploy \
		--env "$ENV_ID" \
		--paths "$STAGE_DIR" \
		--appid "$APPID" \
		--remote-npm-install
else
	echo "Deploy command after confirmation:"
	printf '%q ' "$DEVTOOLS_CLI" cloud functions deploy --env "$ENV_ID" --paths "$STAGE_DIR" --appid "$APPID" --remote-npm-install
	echo
fi
