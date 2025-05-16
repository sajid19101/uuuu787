#!/usr/bin/env node

/**
 * YouTube Schedule Manager - Android Build Script
 * 
 * This script automates the process of building the Android APK
 * for the standalone offline version of the app.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const buildConfig = require('./android-build.config.js');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Print banner
console.log(`
${colors.bright}${colors.cyan}====================================================${colors.reset}
${colors.bright}${colors.cyan}  YouTube Schedule Manager - Android Build${colors.reset}
${colors.bright}${colors.cyan}====================================================${colors.reset}
${colors.bright}Building version: ${colors.green}${buildConfig.app.versionName} (${buildConfig.app.versionCode})${colors.reset}
${colors.bright}Package: ${colors.green}${buildConfig.app.package}${colors.reset}
`);

// Run a command and log the output
function runCommand(command, description) {
  console.log(`\n${colors.bright}${colors.blue}◆ ${description}${colors.reset}\n`);
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`\n${colors.bright}${colors.red}✖ Error: ${error.message}${colors.reset}\n`);
    return false;
  }
}

// Ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Copy file with directory creation
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  ensureDir(destDir);
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} to ${dest}`);
}

// Main build process
async function buildAndroid() {
  // Step 1: Clean previous build
  console.log(`\n${colors.bright}${colors.yellow}Step 1: Cleaning previous build${colors.reset}`);
  ensureDir(buildConfig.build.outputDir);
  if (fs.existsSync('android')) {
    runCommand('rm -rf android', 'Removing existing Android project');
  }
  
  // Step 2: Build the web app with offline-specific optimizations
  console.log(`\n${colors.bright}${colors.yellow}Step 2: Building the web app${colors.reset}`);
  if (!runCommand('npm run build', 'Building web application')) {
    console.error(`${colors.red}Build failed. Aborting.${colors.reset}`);
    return;
  }
  
  // Step 3: Initialize Capacitor
  console.log(`\n${colors.bright}${colors.yellow}Step 3: Initializing Capacitor${colors.reset}`);
  if (!runCommand('npx cap init "${buildConfig.app.name}" "${buildConfig.app.package}" --web-dir=dist/public', 'Initializing Capacitor')) {
    console.error(`${colors.red}Capacitor initialization failed. Aborting.${colors.reset}`);
    return;
  }
  
  // Step 4: Add Android platform
  console.log(`\n${colors.bright}${colors.yellow}Step 4: Adding Android platform${colors.reset}`);
  if (!runCommand('npx cap add android', 'Adding Android platform')) {
    console.error(`${colors.red}Adding Android platform failed. Aborting.${colors.reset}`);
    return;
  }
  
  // Step 5: Update capacitor.config.ts with custom settings
  console.log(`\n${colors.bright}${colors.yellow}Step 5: Updating Capacitor configuration${colors.reset}`);
  try {
    const configPath = 'capacitor.config.ts';
    let config = fs.readFileSync(configPath, 'utf8');
    
    // Update web directory
    config = config.replace(
      /webDir:.*$/m,
      `webDir: '${buildConfig.capacitor.config.webDir}',`
    );
    
    // Add plugins configuration
    if (!config.includes('plugins:')) {
      const pluginsConfig = `
  plugins: {
    // Configure permissions for Android
    Permissions: {
      // These match the Android manifest permissions
      permissions: [
        ${buildConfig.build.manifestOverrides.permissions.map(p => `'${p}'`).join(',\n        ')}
      ]
    },
    // Configure file system access
    Filesystem: {
      accessFilesystemInWebView: true
    },
    // Configure SQLite for local database
    CapacitorSQLite: {
      iosLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      iosKeystoreLocation: 'Library/CapacitorDatabase',
      androidIsEncryption: false,
      androidLocation: 'database',
      electronWindowsLocation: 'sqlite'
    }
  },`;
      
      // Insert plugins config before the last closing brace
      const lastBracePos = config.lastIndexOf('}');
      config = config.substring(0, lastBracePos) + pluginsConfig + config.substring(lastBracePos);
    }
    
    // Write updated config
    fs.writeFileSync(configPath, config);
    console.log('Updated capacitor.config.ts');
  } catch (error) {
    console.error(`${colors.red}Error updating Capacitor configuration: ${error.message}${colors.reset}`);
  }
  
  // Step 6: Copy web assets to Android project
  console.log(`\n${colors.bright}${colors.yellow}Step 6: Copy web assets to Android project${colors.reset}`);
  if (!runCommand('npx cap copy android', 'Copying web assets to Android')) {
    console.error(`${colors.red}Copying assets failed. Aborting.${colors.reset}`);
    return;
  }
  
  // Step 7: Copy app icons and assets
  console.log(`\n${colors.bright}${colors.yellow}Step 7: Copying app icons and assets${colors.reset}`);
  try {
    for (const asset of buildConfig.build.assets) {
      const dest = path.join('android', asset.dest, path.basename(asset.src));
      copyFile(asset.src, dest);
    }
  } catch (error) {
    console.error(`${colors.red}Error copying assets: ${error.message}${colors.reset}`);
  }
  
  // Step 8: Update Android build.gradle with correct SDK versions
  console.log(`\n${colors.bright}${colors.yellow}Step 8: Updating Android configuration${colors.reset}`);
  try {
    const buildGradlePath = 'android/app/build.gradle';
    let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
    
    // Update min SDK version
    buildGradle = buildGradle.replace(
      /minSdkVersion .+/g,
      `minSdkVersion ${buildConfig.app.minSdkVersion}`
    );
    
    // Update target SDK version
    buildGradle = buildGradle.replace(
      /targetSdkVersion .+/g,
      `targetSdkVersion ${buildConfig.app.targetSdkVersion}`
    );
    
    // Update version code and name
    buildGradle = buildGradle.replace(
      /versionCode .+/g,
      `versionCode ${buildConfig.app.versionCode}`
    );
    
    buildGradle = buildGradle.replace(
      /versionName .+/g,
      `versionName "${buildConfig.app.versionName}"`
    );
    
    // Write updated build.gradle
    fs.writeFileSync(buildGradlePath, buildGradle);
    console.log('Updated Android build.gradle');
  } catch (error) {
    console.error(`${colors.red}Error updating Android configuration: ${error.message}${colors.reset}`);
  }
  
  // Step 9: Generate Android project
  console.log(`\n${colors.bright}${colors.yellow}Step 9: Syncing Android project${colors.reset}`);
  if (!runCommand('npx cap sync android', 'Syncing Android project')) {
    console.error(`${colors.red}Android sync failed. Aborting.${colors.reset}`);
    return;
  }
  
  // Step 10: Build APK for debug
  console.log(`\n${colors.bright}${colors.yellow}Step 10: Building debug APK${colors.reset}`);
  if (fs.existsSync('android')) {
    if (!runCommand('cd android && ./gradlew assembleDebug', 'Building debug APK')) {
      console.error(`${colors.red}APK build failed. Aborting.${colors.reset}`);
      return;
    }
    
    // Copy the APK to the output directory
    try {
      const apkDir = buildConfig.build.outputDir;
      ensureDir(apkDir);
      
      const apkSource = 'android/app/build/outputs/apk/debug/app-debug.apk';
      const apkDest = path.join(apkDir, `youtube-schedule-manager-${buildConfig.app.versionName}.apk`);
      
      copyFile(apkSource, apkDest);
      console.log(`\n${colors.bright}${colors.green}✓ APK built successfully and saved to ${apkDest}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Error copying APK: ${error.message}${colors.reset}`);
    }
  } else {
    console.error(`${colors.red}Android directory not found. Build failed.${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}${colors.green}Build process completed${colors.reset}`);
}

// Run the build process
buildAndroid().catch(error => {
  console.error(`${colors.bright}${colors.red}Build failed: ${error.message}${colors.reset}`);
  process.exit(1);
});