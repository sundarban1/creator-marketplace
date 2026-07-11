// expo-notifications unconditionally adds `aps-environment` to the iOS entitlements
// during `expo prebuild`. That requires the Push Notifications capability on the App
// ID, which free/personal Apple Developer accounts cannot enable — local device builds
// fail to sign with "Provisioning Profile ... does not support the Push Notifications
// capability". Run this after every `expo prebuild` (the postprebuild npm script does
// this automatically for `npm run prebuild`; `expo run:ios`/`run:android` invoke
// prebuild internally too, so re-run this manually after those if the build fails on
// signing). Once the project has a paid Apple Developer account with Push
// Notifications enabled for the App ID, set EXPO_PUSH_CAPABLE=1 and skip this step.
const fs = require('fs');
const path = require('path');

if (process.env.EXPO_PUSH_CAPABLE === '1') {
  process.exit(0);
}

const entitlementsPath = path.join(__dirname, '..', 'ios', 'kolab', 'kolab.entitlements');
if (!fs.existsSync(entitlementsPath)) {
  process.exit(0);
}

const plist = require('plist');
const parsed = plist.parse(fs.readFileSync(entitlementsPath, 'utf8'));
if ('aps-environment' in parsed) {
  delete parsed['aps-environment'];
  fs.writeFileSync(entitlementsPath, plist.build(parsed));
  console.log('[strip-push-entitlement] Removed aps-environment from kolab.entitlements');
}
