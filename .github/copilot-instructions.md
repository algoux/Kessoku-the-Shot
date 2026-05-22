# Copilot Instructions for `Kessoku-the-Shot`

## Build, test, and lint commands

Use **pnpm** (Node version follows `package.json` engines: `^20.19.0 || >=22.12.0`).

| Purpose | Command | Notes |
| --- | --- | --- |
| First-time project setup | `pnpm run init` | Installs deps, adds Capacitor iOS/Android projects, injects mobile permissions, then runs `cap sync`. |
| Start web dev server | `pnpm dev` | Vite dev server on `http://localhost:5173`. Use localhost (not LAN IP) for camera APIs during development. |
| Build web bundle | `pnpm build` | Outputs to `dist/` (used by Capacitor as `webDir`). |
| Sync web build to native projects | `pnpm run sync` | Runs `npx cap sync`. |
| Run on iOS (production build + sync + run) | `pnpm run start:ios` | Requires Xcode/iOS tooling. |
| Run on Android (production build + sync + run) | `pnpm run start:android` | Requires Android Studio/SDK tooling. |
| Build Android release APK | `pnpm run release:apk` | Runs Gradle `assembleRelease`. |
| Build Android release AAB | `pnpm run build:bundle` | Runs Gradle `bundleRelease`. |
| Re-apply mobile permissions to native manifests | `pnpm run permission` | Executes `scripts/add-permissions.js`. |

This repository currently has **no dedicated lint command** and **no automated test command** in `package.json`, and no test suite files are present.

Single-test execution is therefore **not applicable** until a test runner is added.

## High-level architecture

- App boot (`src/main.ts`) initializes global styles/Vant, requests Capacitor camera permission on native platforms, configures status-bar overlay behavior by platform, then mounts Vue app + router.
- Routing (`src/routes.ts`) uses `createMemoryHistory()` (not browser history), consistent with hybrid/mobile shell behavior.
- Root app shell (`src/App.vue`) is class-style Vue (`vue-class-component` + decorators) and acts as the composition root:
  - Hydrates persisted `loginState` from Capacitor Preferences.
  - Creates and provides singleton `SocketManager` and per-session `WebRTCManager`.
  - Provides reactive global state (`loading`, `homeState`, `screenOrientation`) to child views via `@Provide`.
- Login flow (`src/modules/login/login.view.vue` + `App.vue#login`) collects alias/shot credentials, fetches contest info via socket ack event, persists a normalized `loginState`, then routes to Home.
- Home flow (`src/modules/home/home.view.vue`) orchestrates camera lifecycle and broadcast readiness:
  - Uses `MediaDeviceManager` for camera discovery, stream acquisition, constraints switching, and capability/settings tracking.
  - On “Ready”, negotiates transport over `SocketManager` (`confirmReady`), loads mediasoup device, creates send transport, and wires server-driven broadcast start/stop events.
- Realtime and media split:
  - `SocketManager` (`src/service/socket-manager.ts`) handles socket.io signaling against `https://rl-broadcast-hub.algoux.cn/shot`, ack-based request/response methods, and lifecycle event hooks.
  - `WebRTCManager` (`src/service/webrtc-manager.ts`) owns mediasoup client device/send transport/producers and publishes cloned local tracks.
- UI layers are Vant + lucide components with state passed mainly through Provide/Inject (not Pinia/Vuex).

## Key conventions in this codebase

- **Class-style Vue components are the default** (`<script lang="ts">` + `Vue` subclass + decorator-based `@Inject/@Provide/@Watch`), rather than Composition API.
- **Cross-component shared state is Provide/Inject-driven** from `App.vue` and `home.view.vue`; prefer extending existing provided contracts before introducing new global state mechanisms.
- **Socket lifecycle is singleton-based**: use `SocketManager.getInstance(...)` and `SocketManager.reset()` for reconnect/re-auth flows.
- **Broadcast track identity is convention-driven**: signaling and production logic assume `trackId = "camera_main"` for the primary video stream.
- **Login persistence contract is strict**: Capacitor Preferences key is `loginState`; shape written in `App.vue` is used for subsequent startup hydration.
- **Path aliasing uses `@/` => `src/`** (configured in both Vite and TS config); prefer it over deep relative paths.
- **Native permission patching is scripted**: after adding/resetting native projects, use `pnpm run permission` (or `pnpm run init`) to ensure camera/microphone permissions are present in iOS plist and Android manifest.
