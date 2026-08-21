# iOS / App Store release checklist

The iOS build uses Capacitor and bundles the 500-word vocabulary app and pronunciation audio locally. Normal learning activity does not depend on the GitHub Pages site or a remote API.

## Bash-first Mac workflow

Install Xcode once, launch it once, sign into your Apple account in Xcode, and install Homebrew. From the repository root:

```bash
npm run ios:bootstrap
```

Useful commands:

```bash
npm run security:audit             # fail on moderate-or-higher npm vulnerabilities
npm run ios:check                  # toolchain, App Store, privacy, icon checks
npm run ios:setup                  # rebuild + sync native iOS project
npm run ios:open                   # rebuild + sync + open Xcode
npm run ios:signing -- YOURTEAMID  # save Apple Team ID locally (gitignored)
npm run ios:archive                # create signed App Store .xcarchive
npm run ios:clean                  # remove generated web/build output
```

The developer-specific Team ID is written only to `ios-config/Signing.local.xcconfig`, which is gitignored. `AppStore.xcconfig` optionally includes that local file, so signing stays reproducible without publishing account-specific details.

`npm run ios:archive` uses automatic signing with `-allowProvisioningUpdates`. It refuses to archive if no Apple Development Team resolves from the local config or Xcode project.

## Automated release gates

GitHub Actions runs the App Store preflight on pull requests and on `main`. The current pipeline checks:

- npm audit: zero moderate/high/critical findings
- patched transitive dependencies: `tar 7.5.22`, `uuid 11.1.1`
- all 500 vocabulary entries and bundled pronunciation audio
- representative Spanish accents / ñ / ü / inverted punctuation
- offline/privacy executable-code audit
- native controls and Reduce Motion regressions
- Capacitor 8 native project generation
- privacy manifest validity
- App Store release build settings
- final app icon generation
- Xcode 26 / iOS 26 SDK minimum
- unsigned iOS Simulator compile

## Reproducible release configuration

Version-controlled release settings live in:

- `ios-config/AppStore.xcconfig`
- `ios-config/PrivacyInfo.xcprivacy`
- `ios-config/AppIcon-source.png`
- `tools/configure_ios_project.sh`
- `tools/ios_store.sh`
- `tools/ios_signing.sh`
- `tools/npm_security.sh`
- `tools/apple_sdk_gate.sh`

Every setup/archive applies or verifies:

- Bundle identifier: `com.flesentine.msmadrigal`
- Display name: `Ms. Madrigral`
- Version: `1.0`
- Build: `1`
- Device family: iPhone + iPad
- Automatic signing
- iPhone portrait + landscape
- iPad portrait + upside-down + landscape
- `ITSAppUsesNonExemptEncryption = false`
- privacy manifest

## App icon

The final no-text Ms. Madrigal pixel portrait is checked in at:

```text
ios-config/AppIcon-source.png
```

The release workflow validates that it is square and opaque, then generates the required 1024×1024 App Store asset in the native Xcode asset catalog. The release no longer depends on the default Capacitor icon.

## Store metadata

**Name:** Ms. Madrigral: Spanish 500  
**Subtitle:** Retro Spanish vocabulary  
**Primary category:** Education

**Description:**

Learn and review 500 useful Spanish words in a fast, retro vocabulary trainer inspired by classic home computers. See the English word, tap to reveal the Spanish answer, hear the pronunciation, and tap again to continue. Reshuffle anytime for a new randomized order. The vocabulary, game logic, and pronunciation audio are bundled with the app for offline study.

**Keywords:** spanish,vocabulary,language,words,flashcards,retro,8bit,learning,pronunciation,study

**Privacy policy URL:** https://flesentine.github.io/msmadrigal/privacy.html

**Support URL:** https://flesentine.github.io/msmadrigal/support.html

A real reachable support email or phone should be added to the public support page before submission. Do not invent contact details.

## App Store Connect record

Use:

- Name: `Ms. Madrigral: Spanish 500`
- Primary language: English (U.S.)
- Bundle ID: `com.flesentine.msmadrigal`
- SKU: `msmadrigal-ios-1` (or another private internal SKU)
- Primary category: Education
- Made for Kids: No unless intentionally committing to Apple's Kids Category requirements
- Standard Apple EULA

## Age rating

For the current build, expected rating is **4+**. The app has no violence, sexual content, profanity, drugs/alcohol, gambling, loot boxes, user-generated content, chat/social features, advertising, unrestricted web access, or purchases.

Answer the final App Store Connect questionnaire according to the exact build being submitted.

## Screenshots

Because the app supports both iPhone and iPad, capture both device families.

Suggested sequence:

1. boot/start screen
2. English vocabulary card
3. revealed Spanish card with accented spelling
4. teacher/chalkboard gameplay
5. landscape layout

Use current accepted App Store Connect sizes; a preview video is optional.

## Privacy answers

For the current build:

- Data collection: **No, we do not collect data from this app**
- Tracking: No
- Data linked to user: None
- Data not linked to user: None
- Accounts: None
- Advertising: None
- Analytics SDK: None
- Location/camera/microphone/contacts/photos: Not requested

Re-check these if analytics, ads, login, cloud sync, crash-reporting SDKs, or other network services are ever added.

## Accessibility

The app exposes semantic text alongside the retro bitmap rendering and uses ARIA labels/live regions for core vocabulary interactions. Native motion behavior honors Reduced Motion.

Before claiming App Store accessibility labels, physically test common tasks on iPhone and iPad. In particular, test VoiceOver before claiming VoiceOver support.

Candidates to validate:

- VoiceOver
- Reduced Motion
- Dark Interface
- Sufficient Contrast

## Export compliance

The current offline app does not implement proprietary/non-exempt encryption. The native Info.plist declares:

```text
ITSAppUsesNonExemptEncryption = false
```

The archive verifier checks this value in the finished app bundle.

## App Review information

No demo account is required because the app has no login.

Provide a real App Review contact name, email, and phone in App Store Connect.

**Review notes:**

`Ms. Madrigral is an interactive 500-word Spanish vocabulary trainer. The complete vocabulary set and pronunciation audio are bundled in the app and work offline. Tap the chalkboard to reveal Spanish, tap again for the next word, and use Reshuffle to randomize the 500-word deck. No account, login, purchases, advertising, analytics, or tracking are used.`

## Remaining submission checklist

- [x] Final icon artwork added and wired into Xcode release build.
- [x] npm security audit gate.
- [x] automated macOS native setup + Simulator compile.
- [x] privacy/export-compliance preflight.
- [ ] Configure local Apple Team ID: `npm run ios:signing -- YOURTEAMID`.
- [ ] Run signed archive: `npm run ios:archive`.
- [ ] Test on a real iPhone.
- [ ] Test on iPad.
- [ ] Test portrait + landscape.
- [ ] Test all 500 words/audio in Airplane Mode.
- [ ] Confirm Sound Off is silent.
- [ ] Test VoiceOver + Reduced Motion on device.
- [ ] Add a real reachable support contact to `support.html`.
- [ ] Create App Store Connect record.
- [ ] Complete age rating, content rights, privacy, pricing, and availability.
- [ ] Capture iPhone + iPad screenshots.
- [ ] Validate/upload archive from Xcode Organizer.
- [ ] Run a clean-install TestFlight test.
- [ ] Submit for App Review.
