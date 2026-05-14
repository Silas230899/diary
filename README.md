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

```
npm run tauri android build
```

# Signing the apk

Goto
````
E:\Programmieren\WebStorm\diary\src-tauri\gen\android\app\build\outputs\apk\universal\release
````

and do

```
C:\Users\Silas\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat sign
--ks "C:\Users\Silas\.android\debug.keystore"
-ks-key-alias androiddebugkey
--ks-pass pass:android
-key-pass pass:android
--out "signed.apk" 
".\app-universal-release-unsigned.apk"
```
bzw.
```
C:\Users\Silas\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat sign --ks "C:\Users\Silas\.android\debug.keystore" -ks-key-alias androiddebugkey --ks-pass pass:android -key-pass pass:android --out "signed.apk" ".\app-universal-release-unsigned.apk"
```

# Installing the signed apk

Goto
```
C:\Users\Silas\AppData\Local\Android\Sdk\platform-tools
```

and do

```
./adb.exe install E:\Programmieren\WebStorm\diary\src-tauri\gen\android\app\build\outputs\apk\universal\release\signed.apk
```
