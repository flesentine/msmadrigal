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
- copies the privacy manifest into the native App folder

Useful commands:

```bash
npm run ios:check     # inspect local toolchain/readiness
npm run ios:setup     # rebuild + sync without opening Xcode
npm run ios:open      # rebuild + sync + open Xcode
npm run ios:archive   # rebuild + create Release .xcarchive
npm run ios:clean     # remove generated web/build output
```

## What cannot be safely automated without Apple credentials

These still require a one-time Apple/Xcode setup:

- choose your Apple Developer Team under Signing & Capabilities
- allow Xcode to create/manage signing certificates and provisioning profiles
- add the final app icon
- confirm `PrivacyInfo.xcprivacy` is included in the App target Resources
- create the App Store Connect app record
- supply screenshots and final store metadata
- validate/TestFlight/upload using your Apple account

Once signing is configured, `npm run ios:archive` will create `build/MsMadrigral.xcarchive` automatically.

## Xcode settings

- Bundle identifier: `com.flesentine.msmadrigal`
- Display name: `Ms. Madrigral`
- Version: `1.0`
- Build: `1`
- Device family: iPhone and iPad
- Orientation: portrait and landscape
- Signing: select the Apple Developer team and use automatic signing unless there is a reason not to.

## App icon and launch appearance

A final 1024x1024 App Store icon still needs to be supplied before archive/upload. It should not contain transparency.

Use the app's dark CRT background as the launch-screen background so the transition into the game is not a white flash.

## Store metadata draft

**Name:** Ms. Madrigral: Spanish 500

**Subtitle:** Retro Spanish vocabulary trainer

**Primary category:** Education

**Description:**

Learn and review 500 useful Spanish words in a fast, retro vocabulary trainer inspired by classic home computers. See the English word, tap to reveal the Spanish answer, hear the pronunciation, and tap again to continue. Reshuffle anytime for a new randomized order. The vocabulary, game logic, and pronunciation audio are bundled with the app for offline study.

**Keywords:** spanish,vocabulary,language,words,flashcards,retro,c64,learning,pronunciation,study

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

## Review notes draft

`Ms. Madrigral is an interactive 500-word Spanish vocabulary trainer. The complete vocabulary set and pronunciation audio are bundled in the app and work offline. Tap the chalkboard to reveal Spanish, tap again for the next word, and use Reshuffle to randomize the 500-word deck. No account, login, purchases, advertising, or tracking are used.`

## Before upload

- Run `npm run ios:check`.
- Test on a real iPhone and at least one iPad Simulator size.
- Confirm portrait and landscape layouts.
- Confirm all 500 words load and pronunciation plays with Airplane Mode on.
- Confirm Sound Off remains silent.
- Confirm no external network request is required during normal play.
- Add final app icon.
- Run `npm run ios:archive` after signing is configured.
- Validate/upload from Xcode Organizer and run a TestFlight build before App Review.
