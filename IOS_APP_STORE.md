# iOS / App Store release checklist

The iOS build uses Capacitor and bundles the full vocabulary app locally rather than loading the GitHub Pages site in a remote web view.

## Automated Mac workflow

Install Xcode once, launch it once, and install Homebrew. After that, nearly all local setup is automated.

From the repository root:

```bash
npm run ios:bootstrap
```

That command:

- verifies macOS and Xcode
- installs Node.js and `espeak-ng` with Homebrew if needed
- installs npm dependencies
- rebuilds the offline `www` bundle
- regenerates all 500 pronunciation samples
- creates the Capacitor iOS project on first run
- syncs later web changes into the native project
- copies and validates the privacy manifest
- applies the version-controlled App Store release configuration
- installs the final App Store icon automatically when `ios-config/AppIcon-1024.png` is present

Useful commands:

```bash
npm run ios:check     # inspect local toolchain/readiness + release settings
npm run ios:setup     # rebuild + sync + apply release settings
npm run ios:open      # rebuild + sync + apply settings + open Xcode
npm run ios:archive   # rebuild + create Release .xcarchive with store settings
npm run ios:clean     # remove generated web/build output
```

`npm run ios:archive` intentionally refuses to archive until the final App Store icon exists and passes the 1024x1024/opaque checks.

## Reproducible release configuration

The generated Capacitor Xcode project does not need to be committed in order for the release-critical settings to be reviewable and repeatable. They are stored in version control at:

- `ios-config/AppStore.xcconfig`
- `ios-config/PrivacyInfo.xcprivacy`
- `tools/configure_ios_project.sh`
- `tools/ios_store.sh`

Every `ios:setup`, `ios:open`, and `ios:archive` run applies/verifies:

- Bundle identifier: `com.flesentine.msmadrigal`
- Display name: `Ms. Madrigral`
- Version: `1.0`
- Build: `1`
- Device family: iPhone and iPad
- iPhone orientations: portrait + both landscape orientations
- iPad orientations: portrait, upside-down portrait + both landscape orientations
- Signing style: automatic
- Export compliance declaration: `ITSAppUsesNonExemptEncryption = false`
- Privacy manifest parses correctly and matches the native copy

The Apple Developer Team remains intentionally unset in source control because it belongs to the developer account/signing environment.

## What cannot be safely automated without Apple credentials

These still require a one-time Apple/Xcode setup:

- choose your Apple Developer Team under Signing & Capabilities
- allow Xcode to create/manage signing certificates and provisioning profiles
- create the App Store Connect app record
- supply screenshots and final store metadata
- validate/TestFlight/upload using your Apple account

Once signing is configured and the final icon is present, `npm run ios:archive` will create `build/MsMadrigral.xcarchive` automatically.

## App icon and launch appearance

Put the final icon here:

```text
ios-config/AppIcon-1024.png
```

It must be exactly 1024x1024 pixels and must not contain transparency. The release workflow copies it into the generated native AppIcon asset catalog and verifies it before archive.

Use the app's dark CRT background as the launch-screen background so the transition into the game is not a white flash.

## Store metadata draft

**Name:** Ms. Madrigral: Spanish 500

**Subtitle:** Retro Spanish vocabulary

**Primary category:** Education

**Description:**

Learn and review 500 useful Spanish words in a fast, retro vocabulary trainer inspired by classic home computers. See the English word, tap to reveal the Spanish answer, hear the pronunciation, and tap again to continue. Reshuffle anytime for a new randomized order. The vocabulary, game logic, and pronunciation audio are bundled with the app for offline study.

**Keywords:** spanish,vocabulary,language,words,flashcards,retro,8bit,learning,pronunciation,study

**Privacy policy URL:** https://flesentine.github.io/msmadrigal/privacy.html

**Support URL:** https://flesentine.github.io/msmadrigal/support.html

## Privacy answers

For the current build:

- Tracking: No
- Data linked to the user: None
- Data not linked to the user: None
- Accounts: None
- Advertising: None
- Analytics SDK: None
- Location/camera/microphone/contacts/photos: Not requested

Re-check these answers if analytics, ads, sign-in, cloud sync, crash-reporting SDKs, or other network services are added.

## Export compliance

The current offline app does not implement its own proprietary or non-exempt encryption. The release script writes `ITSAppUsesNonExemptEncryption = false` into the generated native `Info.plist` and verifies that value before archive.

Re-evaluate this declaration if future native libraries add non-exempt cryptography or if the app's security/network architecture changes.

## Review notes draft

`Ms. Madrigral is an interactive 500-word Spanish vocabulary trainer. The complete vocabulary set and pronunciation audio are bundled in the app and work offline. Tap the chalkboard to reveal Spanish, tap again for the next word, and use Reshuffle to randomize the 500-word deck. No account, login, purchases, advertising, or tracking are used.`

## Before upload

- Add `ios-config/AppIcon-1024.png`.
- Run `npm run ios:check`.
- Test on a real iPhone and at least one iPad Simulator size.
- Confirm portrait and landscape layouts.
- Confirm all 500 words load and pronunciation plays with Airplane Mode on.
- Confirm Sound Off remains silent.
- Confirm no external network request is required during normal play.
- Confirm the privacy manifest is present in the built app bundle.
- Run `npm run ios:archive` after signing is configured.
- Validate/upload from Xcode Organizer and run a TestFlight build before App Review.
