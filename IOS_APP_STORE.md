# iOS / App Store release checklist

The iOS build uses Capacitor and bundles the full vocabulary app locally rather than loading the GitHub Pages site in a remote web view.

## Automated Mac workflow

Install Xcode once, launch it once, sign into your Apple Developer account in Xcode, and install Homebrew. After that, nearly all local setup is automated.

From the repository root:

```bash
npm run ios:bootstrap
```

Useful commands:

```bash
npm run security:audit # fail on moderate-or-higher npm vulnerabilities
npm run ios:check      # inspect local toolchain/readiness + release settings
npm run ios:setup      # rebuild + sync + apply release settings
npm run ios:open       # rebuild + sync + apply settings + open Xcode
npm run ios:signing    # detect/save the local Apple Team ID
npm run ios:archive    # rebuild + create signed Release .xcarchive
npm run ios:testflight # archive + upload directly to App Store Connect/TestFlight
npm run ios:clean      # remove generated web/build output
```

The generated Ms. Madrigal app icon is checked in as `ios-config/AppIcon-source.png`. The release workflow produces a 1024x1024 opaque native App Store asset automatically and validates it before archive.

`npm run ios:archive` inspects the finished `.app` bundle and verifies its bundle ID, version, build number, export-compliance flag, and bundled privacy manifest.

`npm run ios:testflight` uses Xcode's `app-store-connect` distribution method with `destination=upload`. It requires an App Store Connect app record to exist first and uses the Apple account signed into Xcode. If command-line upload fails, it opens the signed archive in Xcode Organizer as a fallback.

GitHub Actions also runs an iOS App Store preflight on pull requests. It installs dependencies, runs the npm security gate, builds the native iOS bundle on macOS, runs the release checks, and compiles an unsigned Simulator build.

## First TestFlight upload

Before uploading, create the App Store Connect record:

- Platform: iOS
- Name: `Ms. Madrigral: Spanish 500`
- Primary language: English (U.S.)
- Bundle ID: `com.flesentine.msmadrigal`
- SKU: `msmadrigal-ios-1`
- User Access: Full Access (unless you intentionally need restrictions)

Then on the Mac:

```bash
git pull
npm install
npm run ios:signing
npm run ios:testflight
```

After Apple finishes processing the build, open the TestFlight tab in App Store Connect and add it to an internal tester group. Internal testing is the fastest first validation path and does not require the external TestFlight beta-review flow.

## Dependency security

The project pins release-critical transitive dependencies that have current security fixes:

- `tar = 7.5.22`
- `uuid = 11.1.1`

Every release check runs `npm audit --audit-level=moderate` and fails if a moderate, high, or critical advisory is present.

## Reproducible release configuration

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

The Apple Developer Team is stored only in `ios-config/Signing.local.xcconfig`, which is gitignored.

## Store metadata

**Name:** Ms. Madrigral: Spanish 500  
**Subtitle:** Retro Spanish vocabulary  
**Primary category:** Education

**Description:**

Learn and review 500 useful Spanish words in a fast, retro vocabulary trainer inspired by classic home computers. See the English word, tap to reveal the Spanish answer, hear the pronunciation, and tap again to continue. Reshuffle anytime for a new randomized order. The vocabulary, game logic, and pronunciation audio are bundled with the app for offline study.

**Keywords:** spanish,vocabulary,language,words,flashcards,retro,8bit,learning,pronunciation,study

**Privacy policy URL:** https://flesentine.github.io/msmadrigal/privacy.html

**Support URL:** https://flesentine.github.io/msmadrigal/support.html

The public support page still needs a real support email or phone before App Store submission.

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

## App Review information

No demo account is required because the app has no login.

**Review notes:**

`Ms. Madrigral is an interactive 500-word Spanish vocabulary trainer. The complete vocabulary set and pronunciation audio are bundled in the app and work offline. Tap the chalkboard to reveal Spanish, tap again for the next word, and use Reshuffle to randomize the 500-word deck. No account, login, purchases, advertising, analytics, or tracking are used.`

## Remaining human/device work

- [ ] Create the App Store Connect app record.
- [ ] Run `npm run ios:signing` on the release Mac.
- [ ] Run `npm run ios:testflight` and confirm Apple accepts/processes build 1.0 (1).
- [ ] Install the processed build from TestFlight on a real iPhone.
- [ ] Test on at least one iPad size.
- [ ] Confirm portrait and landscape layouts.
- [ ] Confirm all 500 words load and pronunciation plays with Airplane Mode on.
- [ ] Confirm Sound Off remains silent.
- [ ] Test VoiceOver and Reduced Motion on-device before claiming accessibility labels.
- [ ] Add real support contact information to `support.html`.
- [ ] Complete App Store metadata, age rating, privacy, content rights, pricing, and availability.
- [ ] Capture iPhone and iPad App Store screenshots.
- [ ] Run a final clean-install TestFlight test.
- [ ] Submit for App Review.
