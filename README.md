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

# Installing the signed apk

Goto
```
C:\Users\Silas\AppData\Local\Android\Sdk\platform-tools
```

and do

```
./adb.exe install E:\Programmieren\WebStorm\diary\src-tauri\gen\android\app\build\outputs\apk\universal\release\signed.apk
```
