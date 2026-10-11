# Android PWA Local Device Testing & USB Reverse Port Forwarding Runbook
## Project Ombro-amigo / DULUNOPY Beta — Physical Android Validation

> [!NOTE]
> **INTERNAL PROJECT TESTING RUNBOOK — NON-CLINICAL TECHNICAL VERIFICATION.**
> This document details the local, non-publishing engineering workflow for testing the Ombro-amigo Progressive Web App (PWA) on physical Android hardware via Chrome remote debugging and USB reverse port forwarding (`adb reverse`).
> No external network access, cloud deployment, or app store distribution is required or utilized.
> No clinical efficacy, therapeutic clearance, or diagnostic claim is made or implied.

---

## 1. Prerequisites & Safety Boundaries

1. **Development Host**: Windows workstation with Node.js (>=20) and Android SDK Platform-Tools (`adb.exe`).
2. **Target Device**: Physical Android device with USB debugging enabled in Developer Options.
3. **Connection**: Direct USB cable connecting the workstation to the Android device.
4. **Data Isolation**: 
   - No personal health information or real patient conversations may be entered during testing.
   - Use only synthetic test scripts and non-clinical scenarios.
   - All conversation state remains strictly local to the device's IndexedDB / Web Crypto storage (`ombro-amigo.session.v2` / AES-GCM).

---

## 2. Step-by-Step Local Test Procedure

### Step 2.1: Start the Local Development Server on Workstation
From the project workspace root, launch the local HTTP server bound strictly to loopback:
```powershell
node scripts/dev-server.mjs
```
*Expected Console Output*:
```text
Ombro-amigo disponível em http://localhost:4173
```

### Step 2.2: Establish USB Reverse Port Forwarding via ADB
Open a separate PowerShell terminal on the workstation and verify device connection:
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```
*Expected Output*: One authorized device listed (e.g., `<device-serial> device`).

Reverse port 4173 so requests on Android `http://localhost:4173` resolve to the workstation's dev server:
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:4173 tcp:4173
```
*Expected Output*: `4173` (or return code 0).

### Step 2.3: Navigate in Android Chrome
1. Open Google Chrome on the physical Android device.
2. In the URL bar, navigate to: `http://localhost:4173/`
3. Observe initial render:
   - Header: **Ombro-amigo** with subtitle and "Dados no aparelho" privacy badge.
   - Card: "Uma ferramenta para preparar uma conversa humana" and principle list.
   - Service worker status: indicates offline readiness once caching completes.

### Step 2.4: Inspect PWA Installability
1. In Android Chrome, tap the 3-dot overflow menu (⋮).
2. Verify option: **"Install app"** or **"Add to Home screen"** (Adicionar à tela inicial / Instalar aplicativo).
3. If installed to Home screen, launch the standalone PWA icon:
   - Verify window opens in standalone mode without browser URL bar.
   - Verify theme color (`#244e48`) matches system status bar.

### Step 2.5: Physical TalkBack Accessibility Smoke Check (Optional / Manual)
1. Enable TalkBack under Android Settings -> Accessibility -> TalkBack.
2. Tap the screen to navigate through the interface:
   - Verify accessible labels on interactive elements (e.g. "Dados no aparelho", "Começar conversa").
   - Minimum physical touch targets meet or exceed 48×48 dp.
3. Record observations in `docs/review/MANUAL_ACCESSIBILITY_TEST_PLAN.md` (Checklist Section B).

### Step 2.6: Offline Smoke Verification
1. Enable Airplane Mode on the physical Android device (disconnecting Wi-Fi and mobile data).
2. While offline, refresh or reopen the Ombro-amigo PWA.
3. Observe:
   - App shell loads completely from service worker cache (`ombro-amigo-v17`).
   - Local Web Crypto and IndexedDB initialization succeeds without network errors.

---

## 3. Teardown & Cleanup Instructions

Once physical verification is completed:
1. On workstation, terminate the dev server (`Ctrl + C`).
2. Remove ADB reverse port mapping:
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse --remove tcp:4173
   ```
3. (Optional) Unistall test PWA from Android home screen and clear Chrome browsing data for localhost.
