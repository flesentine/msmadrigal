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
- runs the npm security gate
- installs the final App Store icon automatically when `ios-config/AppIcon-1024.png` is present

Useful commands:

```bash
npm run security:audit # fail on moderate-or-higher npm vulnerabilities
npm run ios:check      # inspect local toolchain/readiness + release settings
npm run ios:setup      # rebuild + sync + apply release settings
npm run ios:open       # rebuild + sync + apply settings + open Xcode
npm run ios:archive    # rebuild + create Release .xcarchive with store settings
npm run ios:clean      # remove generated web/build output
```

`npm run ios:archive` intentionally refuses to archive until the final App Store icon exists and passes the 1024x1024/opaque checks. After Xcode creates the archive, the script also inspects the finished `.app` bundle and verifies its bundle ID, version, build number, export-compliance flag, and bundled privacy manifest.

GitHub Actions also runs an iOS App Store preflight on pushes and pull requests. It installs dependencies, runs the npm security gate, builds the native iOS bundle on macOS, runs the release checks, and compiles an unsigned Simulator build.

## Dependency security

The project pins release-critical transitive dependencies that have current security fixes:

- `tar = 7.5.22`
- `uuid = 11.1.1`

`@capacitor/cli 8.5.0` currently depends transitively on `xcode 3.0.1`, whose declared `uuid ^7.0.3` range can otherwise resolve to a vulnerable release. The project-level override keeps the CommonJS-compatible patched `uuid 11.1.1` until the upstream dependency is updated.

Every release check runs `npm audit --audit-level=moderate` and fails if a moderate, high, or critical advisory is present.

## Reproducible release configuration

The generated Capacitor Xcode project does not need to be committed in order for the release-critical settings to be reviewable and repeatable. They are stored in version control at:

- `ios-config/AppStore.xcconfig`
- `ios-config/PrivacyInfo.xcprivacy`
- `tools/configure_ios_project.sh`
- `tools/ios_store.sh`
- `tools/npm_security.sh`

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

## What still requires Apple credentials or human input

- choose the Apple Developer Team under Signing & Capabilities
- allow Xcode to create/manage signing certificates and provisioning profiles
- add the final 1024x1024 app icon artwork
- create the App Store Connect app record
- add a real support contact email/phone to the public support page
- provide App Review contact name, email, and phone
- supply screenshots
- choose price/availability
- validate/TestFlight/upload using the Apple account

Once signing is configured and the final icon is present, `npm run ios:archive` will create `build/MsMadrigral.xcarchive` automatically.

## App icon and launch appearance

Put the final icon here:

```text
ios-config/AppIcon-1024.png
```

It must be exactly 1024x1024 pixels and must not contain transparency. The release workflow copies it into the generated native AppIcon asset catalog and verifies it before archive.

Use the app's dark CRT background as the launch-screen background so the transition into the game is not a white flash.

## Store metadata

**Name:** Ms. Madrigral: Spanish 500  
**Characters:** 26 / 30

**Subtitle:** Retro Spanish vocabulary  
**Characters:** 24 / 30

**Primary category:** Education

**Description:**

Learn and review 500 useful Spanish words in a fast, retro vocabulary trainer inspired by classic home computers. See the English word, tap to reveal the Spanish answer, hear the pronunciation, and tap again to continue. Reshuffle anytime for a new randomized order. The vocabulary, game logic, and pronunciation audio are bundled with the app for offline study.

**Keywords:** spanish,vocabulary,language,words,flashcards,retro,8bit,learning,pronunciation,study

**Privacy policy URL:** https://flesentine.github.io/msmadrigal/privacy.html

**Support URL:** https://flesentine.github.io/msmadrigal/support.html

The public support page should be updated with a real support email or phone before submission; a GitHub issue link alone is weaker than Apple's current support-contact guidance.

## App Store Connect record

Create an iOS app record using:

- Name: `Ms. Madrigral: Spanish 500`
- Primary language: English (U.S.)
- Bundle ID: `com.flesentine.msmadrigal`
- SKU: use a private internal identifier such as `msmadrigal-ios-1`
- Primary category: Education
- Made for Kids: No, unless the app is intentionally being committed to Apple's Kids category rules
- Standard Apple EULA: use the default unless a custom license is specifically needed

## Proposed age-rating answers

For the current vocabulary trainer, the expected Apple global rating is **4+** if the released content remains as it is now.

Answer **None / No** for:

- profanity or crude humor
- horror or fear themes
- alcohol, tobacco, or drug references
- sexual or suggestive content
- nudity
- cartoon/fantasy violence
- realistic violence
- graphic/sadistic violence
- guns or weapons
- medical/treatment information
- gambling
- simulated gambling
- contests
- loot boxes
- unrestricted web access
- user-generated content
- messaging/chat
- social media
- advertising

The app has no account, social features, purchases, ads, or external browsing during normal use.

## Content rights

The released app should only contain original developer-created material or material the developer is licensed/permitted to distribute. The native build intentionally removed third-party computer ROM data and branding.

If App Store Connect asks whether the app contains, shows, or accesses third-party content, answer based on the final shipped assets. Do not treat open-source runtime libraries as user-facing third-party content, but do verify rights for any visible artwork, audio, text, trademarks, or media before submission.

## Screenshots

Because the app supports both iPhone and iPad, prepare screenshots for both device families. App Store Connect accepts one to ten screenshots per supported device size, and screenshots cannot contain transparency.

Simplest current submission set:

### iPhone 6.9-inch

Use one accepted current portrait resolution consistently, for example:

- `1320 x 2868`, or
- `1290 x 2796`, or
- `1260 x 2736`

Landscape uses the corresponding reversed dimensions.

### iPad 13-inch

Use one accepted current portrait resolution consistently:

- `2064 x 2752`, or
- `2048 x 2732`

Landscape uses the corresponding reversed dimensions.

A preview video is optional; screenshots alone are sufficient.

Suggested screenshot sequence:

1. boot/start screen
2. English vocabulary card
3. revealed Spanish card with accented spelling
4. teacher/chalkboard gameplay view
5. landscape layout

## Privacy answers

For the current build:

- Data collection: **No, we do not collect data from this app**
- Tracking: No
- Data linked to the user: None
- Data not linked to the user: None
- Accounts: None
- Advertising: None
- Analytics SDK: None
- Location/camera/microphone/contacts/photos: Not requested

Re-check these answers if analytics, ads, sign-in, cloud sync, crash-reporting SDKs, or other network services are added.

## Accessibility

The app includes semantic text alongside its retro bitmap rendering and ARIA labels/live regions for core vocabulary interactions. The packaged iOS UI also respects reduced-motion preferences for CRT effects.

Before publishing Accessibility Nutrition Labels, test every common task on both iPhone and iPad. Only claim a feature when the entire common flow works with it. In particular, physically test VoiceOver before claiming VoiceOver support.

Candidate labels to validate:

- VoiceOver
- Reduced Motion
- Dark Interface
- Sufficient Contrast

Do not claim Larger Text unless the complete common flow remains usable at Apple's required large-text criteria.

## Export compliance

The current offline app does not implement its own proprietary or non-exempt encryption. The release script writes `ITSAppUsesNonExemptEncryption = false` into the generated native `Info.plist` and verifies that value before archive.

Re-evaluate this declaration if future native libraries add non-exempt cryptography or if the app's security/network architecture changes.

## App Review information

App Store Connect requires a review contact name, email, and phone number. Supply real reachable contact information in App Store Connect.

No demo account is required because the app has no login.

**Review notes:**

`Ms. Madrigral is an interactive 500-word Spanish vocabulary trainer. The complete vocabulary set and pronunciation audio are bundled in the app and work offline. Tap the chalkboard to reveal Spanish, tap again for the next word, and use Reshuffle to randomize the 500-word deck. No account, login, purchases, advertising, analytics, or tracking are used.`

## Before upload

- [ ] Add `ios-config/AppIcon-1024.png`.
- [ ] Run `npm run security:audit` and confirm zero moderate-or-higher findings.
- [ ] Run `npm run ios:check`.
- [ ] Select the Apple Developer Team in Xcode.
- [ ] Test on a real iPhone.
- [ ] Test on at least one iPad size.
- [ ] Confirm portrait and landscape layouts.
- [ ] Confirm all 500 words load and pronunciation plays with Airplane Mode on.
- [ ] Confirm Sound Off remains silent.
- [ ] Confirm no external network request is required during normal play.
- [ ] Test VoiceOver and Reduced Motion on-device before claiming accessibility labels.
- [ ] Add real support contact information to `support.html`.
- [ ] Create the App Store Connect app record.
- [ ] Complete age rating, content rights, privacy, pricing, and availability.
- [ ] Capture the iPhone and iPad App Store screenshots.
- [ ] Run `npm run ios:archive` after signing is configured.
- [ ] Validate/upload from Xcode Organizer.
- [ ] Run a clean-install TestFlight test.
- [ ] Submit for App Review.
