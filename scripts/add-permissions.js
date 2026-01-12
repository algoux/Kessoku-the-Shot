#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IOS_PLIST_PATH = path.join(__dirname, '../ios/App/App/Info.plist');
const ANDROID_MANIFEST_PATH = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');

const IOS_PERMISSIONS = {
  NSCameraUsageDescription: '此应用需要访问相机以进行视频录制和拍照',
  NSMicrophoneUsageDescription: '此应用需要访问麦克风以进行音频录制',
};

const ANDROID_PERMISSIONS = [
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
];

function checkFileExists(filePath, platform) {
  if (!fs.existsSync(filePath)) {
    console.error(`错误: ${platform} 配置文件不存在`);
    console.error(`请先运行: npx cap add ${platform.toLowerCase()}`);
    return false;
  }
  return true;
}

function updateIOSPlist() {
  if (!checkFileExists(IOS_PLIST_PATH, 'iOS')) return false;

  let content = fs.readFileSync(IOS_PLIST_PATH, 'utf8');
  let modified = false;

  for (const [key, value] of Object.entries(IOS_PERMISSIONS)) {
    if (!content.includes(`<key>${key}</key>`)) {
      const insertBefore = '</dict>\n</plist>';
      const permission = `\t<key>${key}</key>\n\t<string>${value}</string>\n`;
      content = content.replace(insertBefore, `${permission}${insertBefore}`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(IOS_PLIST_PATH, content, 'utf8');
    console.log('已更新 iOS 权限');
  }
  
  return true;
}

function updateAndroidManifest() {
  if (!checkFileExists(ANDROID_MANIFEST_PATH, 'Android')) return false;

  let content = fs.readFileSync(ANDROID_MANIFEST_PATH, 'utf8');
  let modified = false;

  for (const permission of ANDROID_PERMISSIONS) {
    if (!content.includes(`android:name="${permission}"`)) {
      const permissionLine = `    <uses-permission android:name="${permission}" />`;
      
      if (content.includes('<!-- Permissions -->')) {
        content = content.replace(/(<!-- Permissions -->)/, `$1\n${permissionLine}`);
      } else {
        content = content.replace(/(<\/application>)/, `$1\n\n    <!-- Permissions -->\n${permissionLine}`);
      }
      
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(ANDROID_MANIFEST_PATH, content, 'utf8');
    console.log('已更新 Android 权限');
  }
  
  return true;
}

function main() {
  const iosSuccess = updateIOSPlist();
  const androidSuccess = updateAndroidManifest();
  
  if (!iosSuccess || !androidSuccess) {
    process.exit(1);
  }
  
  console.log('完成');
}

main();
