#!/usr/bin/env bash
# Builds a local Android release APK via `./gradlew assembleRelease` — no EAS,
# no cloud queue. Signed with the stock debug keystore (android/app/debug.keystore),
# same as the release buildType already configured in android/app/build.gradle,
# so it installs fine for internal testing but is NOT a Play Store-ready artifact.
#
# Usage: scripts/build-apk.sh [local|preview|production]  (defaults to preview)
#
# Backend URL and other EXPO_PUBLIC_* vars come from mobile/.env.<profile>,
# copied over the root .env before bundling — NOT left as separate files for
# Expo's own dotenv cascade to pick up, because Expo always lets a file
# literally named `.env.local` win over plain `.env` (and even over
# `.env.production`) in EVERY build, no matter which profile you asked for.
# That's why the "local" profile's file is named .env.development, not
# .env.local — an actual .env.local on disk silently overrides everything
# else regardless of what gets copied into .env (this shipped a preview APK
# pointed at a dev LAN IP before it was caught).
set -euo pipefail

cd "$(dirname "$0")/.."

PROFILE="${1:-preview}"
case "$PROFILE" in
  local) ENV_FILE=".env.development" ;;
  *)     ENV_FILE=".env.${PROFILE}" ;;
esac

if [[ -f .env.local ]]; then
  echo "Error: mobile/.env.local exists on disk." >&2
  echo "Expo's dotenv loader always lets this file win over .env, regardless" >&2
  echo "of profile — it will silently override whatever this script sets." >&2
  echo "Rename it (e.g. to .env.development) or delete it, then re-run." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found." >&2
  echo "Available profiles:" >&2
  ls .env.* 2>/dev/null | sed 's/^/  /' >&2
  exit 1
fi

echo "==> Profile: $PROFILE ($ENV_FILE)"
cp "$ENV_FILE" .env
echo "==> $(grep EXPO_PUBLIC_API_BASE .env)"

if [[ ! -d android ]]; then
  echo "==> No android/ project found — running expo prebuild first"
  npx expo prebuild --platform android
fi

# Two layers of caching both key off source-file content, never off .env —
# switching profiles with byte-identical JS source silently ships whatever
# backend URL was baked in by the LAST build unless both are busted:
#
#  1. Metro's persistent transform cache (source hash + babel config, not the
#     actual EXPO_PUBLIC_* value babel-plugin-transform-inline-environment-
#     variables inlines).
#  2. Gradle's own task-output caching — createBundleReleaseJsAndAssets has
#     no declared dependency on .env, so a second run in a row gets marked
#     UP-TO-DATE and Gradle just re-zips the previous (stale) bundle instead
#     of invoking Metro again at all.
#
# (This is exactly how a "preview" build once shipped with a local dev IP
# still baked in — confirmed by unzipping the APK and grepping the bundle.)
echo "==> Clearing Metro cache"
rm -rf "${TMPDIR:-/tmp}"/metro-cache "${TMPDIR:-/tmp}"/metro-file-map-* "${TMPDIR:-/tmp}"/haste-map-* .expo/cache 2>/dev/null || true

echo "==> Clearing Gradle's cached JS bundle/asset outputs"
rm -rf \
  android/app/build/generated/assets/react/release \
  android/app/build/generated/sourcemaps/react/release \
  android/app/build/intermediates/assets/release \
  android/app/build/intermediates/compressed_assets/release \
  android/app/build/intermediates/merged_assets/release \
  android/app/build/outputs/apk/release \
  2>/dev/null || true

echo "==> Building release APK"
( cd android && ./gradlew assembleRelease )

APK_REL=$(find android/app/build/outputs/apk/release -name "*.apk" | head -1)
if [[ -z "$APK_REL" ]]; then
  echo "Build finished but no APK was found under android/app/build/outputs/apk/release" >&2
  exit 1
fi

mkdir -p builds
STAMP=$(date +%Y%m%d-%H%M%S)
DEST="builds/kolab-${PROFILE}-${STAMP}.apk"
cp "$APK_REL" "$DEST"

echo ""
echo "==> APK ready: $DEST"
