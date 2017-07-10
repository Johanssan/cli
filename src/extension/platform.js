import url from 'url';
import path from 'path';
import replace from 'replace-in-file';
import * as appManager from '../clients/app-manager';
import * as authService from '../clients/auth-service';
import decompressUri from './decompress';
import cliUrls from '../../config/services';
import { writeJsonFile, readJsonFile } from './data';
import * as npm from './npm';
import { ensureYarnInstalled } from './yarn';
import * as reactNative from './react-native';
import * as analytics from './analytics';
import { pathExists, readJson } from 'fs-extra';

async function isPlatformDirectory(dir) {
  const { name } = await readJsonFile(path.join(dir, 'package.json')) || {};

  return name === '@shoutem/mobile-app';
}

export async function getPlatformRootDir(dir = process.cwd()) {
  if (await isPlatformDirectory(dir)) {
    return dir;
  }

  const parentDir = path.join(dir, '..');

  if (parentDir === dir) {
    throw new Error('Not a platform directory');
  }
  return await getPlatformRootDir(parentDir);
}

export async function createPlatformConfig(platformDir, opts) {
  const configTemplate = await readJson(path.join(platformDir, 'config.template.json'));

  let authorization;
  try {
    authorization = await authService.createAppAccessToken(opts.appId, await authService.getRefreshToken());
  } catch (err) {
    if (err.code === 401 || err.code === 403) {
      err.message = 'Not authorized to create application token. You must log in again using `shoutem login` command.';
    }
    throw err;
  }

  return {
    ...configTemplate,
    ...opts,
    serverApiEndpoint: url.parse(cliUrls.appManager).hostname,
    legacyApiEndpoint: url.parse(cliUrls.legacyService).hostname,
    authorization,
    configurationFilePath: 'config.json'
  };
}

export async function getPlatformConfig(platformDir = null) {
  return await readJson(path.join(platformDir || await getPlatformRootDir(), 'config.json'));
}

export async function configurePlatform(platformDir, mobileConfig) {
  await ensureYarnInstalled();
  await reactNative.ensureInstalled();

  const configPath = path.join(platformDir, 'config.json');

  await writeJsonFile(mobileConfig, configPath);
  await npm.install(path.join(platformDir, 'scripts'));
  await npm.run(platformDir, 'configure');
}

export async function fixPlatform(platformDir, appId) {
  const appBuilderPath = path.join(platformDir, 'scripts', 'classes', 'app-builder.js');

  if (process.platform === 'win32') {
    try {
      await replace({
        files: appBuilderPath,
        from: './gradlew',
        to: 'gradlew'
      });
    } catch (err) {
      console.log('WARN: Could not rename ./gradle to gradle');
    }
  }
}

export async function downloadApp(appId, destinationDir, options) {
  analytics.setAppId(appId);

  const { mobileAppVersion } = await appManager.getApplicationPlatform(appId);
  await pullPlatform(mobileAppVersion, destinationDir, options);

  if (!await pathExists(destinationDir)) {
    throw new Error('Platform code could not be downloaded from github. Make sure that platform is setup correctly.');
  }
}

async function pullPlatform(version, destination, options) {
  const url = `${cliUrls.mobileAppUrl}/archive/v${version}.tar.gz`;
  await decompressUri(url, destination, { ...options, strip: 1, useCache: options.useCache });
}
