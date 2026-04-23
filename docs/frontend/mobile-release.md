# Mobile Release Signing

The mobile app uses **React Native CLI**, not Expo.

## Android Release Inputs

Set these environment variables before running a release build:

- `ANDROID_RELEASE_STORE_FILE`
- `ANDROID_RELEASE_STORE_PASSWORD`
- `ANDROID_RELEASE_KEY_ALIAS`
- `ANDROID_RELEASE_KEY_PASSWORD`

`ANDROID_RELEASE_STORE_FILE` can be an absolute path or a path relative to `apps/mobile/android/app`.

## Release Commands

From the monorepo root:

```powershell
npm run android:release -w apps/mobile
npm run android:bundle -w apps/mobile
```

The Gradle configuration now blocks release builds when the release keystore inputs are missing. It no longer falls back to the debug keystore for production artifacts.

## Validation Notes

- `npm run typecheck -w apps/mobile` validates the TypeScript app code on this machine.
- Android release assembly still depends on a configured Java/Android toolchain. If `JAVA_HOME` or the Android SDK is missing on the current workstation, do not downgrade the signing rules; complete the release build on the configured machine instead.
