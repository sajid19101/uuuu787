# YouTube Schedule Manager - Offline Android Edition

This is a standalone offline version of the YouTube Schedule Manager app, customized for Android.

## Features

- Fully offline SQLite database storage
- Local file system management
- Native Android integration
- Video and thumbnail management
- YouTube upload scheduling

## Building the APK

1. Make sure you have Node.js and npm installed
2. Install dependencies: `npm install`
3. Run the build script: `node build-android.js`
4. The APK will be available in the `android-build` directory

## Requirements

- Node.js 16+
- Android Studio (for building/testing)
- Java JDK 11+

## Permissions

The app requires the following Android permissions:
- Storage access (for video files)
- Camera (for thumbnails)
- Internet (optional, for future online sync)

