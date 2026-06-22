# Build for Android

Build on Windows (tauri.conf.json):
```
"build": {
    "beforeDevCommand": "npm run build & npm run start",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist/diary/browser",
    "devUrl": "http://localhost:1420"
  },
```

Build on macOS:
```
"build": {
    "beforeDevCommand": "npm run build & npm run start",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:1420"
  },
```

Building command
```
npm run tauri android build
```

or

```
npm run tauri android build -- -- --target aarch64
```

# Signing the apk

```
apksigner sign --ks "C:\Users\Silas\.android\debug.keystore" -ks-key-alias androiddebugkey --ks-pass pass:android -key-pass pass:android --out "E:\Programmieren\WebStorm\diary\src-tauri\gen\android\app\build\outputs\apk\universal\release\signed.apk" "E:\Programmieren\WebStorm\diary\src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk"
```

# Installing the signed apk

```
adb install E:\Programmieren\WebStorm\diary\src-tauri\gen\android\app\build\outputs\apk\universal\release\signed.apk
```
