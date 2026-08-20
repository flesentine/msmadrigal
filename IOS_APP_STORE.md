# iOS / App Store release checklist

The iOS build uses Capacitor and bundles the full vocabulary app locally rather than loading the GitHub Pages site in a remote web view. This is important for offline use and for App Store review quality.

## One-time Mac setup

1. Install Xcode 26 or later from Apple.
2. Install Homebrew if needed.
3. Install Node.js 22+.
4. Install the retro speech generator:

   ```bash
   brew install espeak-ng
   ```

5. From the repository root:

   ```bash
   npm install
   npm run ios:add
   npm run ios:open
   ```

After the first `ios:add`, use `npm run ios:open` for later web updates. It rebuilds the local `www` bundle, regenerates all 500 pronunciation samples, syncs them into the native project, and opens Xcode.

## Xcode settings

- Bundle identifier: `com.flesentine.msmadrigal`
- Display name: `Ms. Madrigral`
- Version: `1.0`
- Build: `1`
- Device family: iPhone and iPad
- Orientation: portrait and landscape
- Deployment target: use Capacitor's supported default unless a specific older-iOS requirement is needed.
- Signing: select the Apple Developer team.

Add `ios-config/PrivacyInfo.xcprivacy` to the App target's resources in Xcode. If native plugins are added later, update the manifest to match their data use and required-reason APIs.

## App icon and launch appearance

A final 1024x1024 App Store icon still needs to be supplied before archive/upload. Keep it simple, readable at small sizes, and do not include transparency.

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

- Test on at least one real iPhone and one iPad size in Simulator.
- Confirm both portrait and landscape layouts.
- Confirm all 500 words load and pronunciation plays with Airplane Mode on.
- Confirm Sound Off remains silent.
- Confirm no external network request is required during normal play.
- Add final app icon.
- Archive using a current Xcode 26 release and iOS 26 SDK or later.
- Upload to App Store Connect, then run a TestFlight build before submitting for review.
