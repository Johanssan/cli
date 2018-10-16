import tar from 'tar';
import targz from 'tar.gz';
import path from 'path';
import fs from 'fs-extra';
import { execSync } from 'child_process';

import {
  prependPath,
  hasPackageJson,
  hasExtensionsJson,
  createTempDir,
} from './util';
import confirmer from './confirmer';
import { spinify } from './spinner';
import { buildNodeProject } from './node';
import { loadExtensionJson } from './extension';
import { readJsonFile, writeJsonFile } from './data';
import { getPackageJson, savePackageJson } from './npm';

import { ensureUserIsLoggedIn } from '../commands/login';

function npmPack(dir, destinationDir) {
  const timestamp = (new Date()).getTime();
  const tgzFilename = `${path.basename(dir)}.tgz`;
  const resultFilename = path.join(destinationDir, tgzFilename);
  const packageJsonPath = path.join(dir, 'package.json');

  const originalFileContent = fs.readFileSync(packageJsonPath);
  const packageJson = readJsonFile(packageJsonPath);

  packageJson.version = `${packageJson.version}-build${timestamp}`;

  writeJsonFile(packageJsonPath, packageJson);

  const stdout = execSync('npm pack', { cwd: dir });
  const packageFilename = stdout.toString().replace(/\n$/, '');
  const packagePath = path.join(dir, packageFilename);

  fs.moveSync(packagePath, resultFilename, { overwrite: true });

  if (originalFileContent !== null) {
    fs.writeFileSync(packageJsonPath, originalFileContent, 'utf8');
  }
}

export async function npmUnpack(tgzFile, destinationDir) {
  fs.ensureDirSync(destinationDir);

  try {
    await tar.extract({
      file: tgzFile,
      cwd: destinationDir,
      strip: 1, // remove leading 'package' dir
    });
  } catch (err) {
    err.message = `[npmUnpack] ${tgzFile}: ${err.message}`;
    throw err;
  }
}

export async function shoutemUnpack(tgzFile, destinationDir) {
  const tmpDir = await createTempDir();

  const tmpPath = prependPath(tmpDir);
  const destPath = prependPath(destinationDir);

  await npmUnpack(tgzFile, tmpDir);
  await npmUnpack(tmpPath('app.tgz'), destPath('app'));
  await npmUnpack(tmpPath('server.tgz'), destPath('server'));

  fs.moveSync(tmpPath('extension.json'), destPath('extension.json'), { overwrite: true });
}

async function offerDevNameSync(extensionDir) {
  const extPath = prependPath(extensionDir);
  const appDir = extPath('app');
  const serverDir = extPath('server');
  const appPackageJson = getPackageJson(appDir);
  const serverPackageJson = getPackageJson(serverDir);

  const { name: developerName } = await ensureUserIsLoggedIn(true);
  const { name: extensionName } = loadExtensionJson(extensionDir);
  const { name: serverModuleName } = serverPackageJson;
  const { name: appModuleName } = appPackageJson;

  const targetModuleName = `${developerName}.${extensionName}`;

  if (targetModuleName === appModuleName && targetModuleName === serverModuleName) {
    return;
  }

  const confirmMessage = 'You\'re uploading an extension that isn\'t yours, do you want to rename it in the package.json files?';

  if (!await confirmer(confirmMessage)) {
    return;
  }

  appPackageJson.name = targetModuleName;
  serverPackageJson.name = targetModuleName;

  savePackageJson(appDir, appPackageJson);
  savePackageJson(serverDir, serverPackageJson);
}

export default async function shoutemPack(dir, options) {
  const dirPath = prependPath(dir);
  const packedDirectories = ['app', 'server'].map(d => dirPath(d));

  if (!hasExtensionsJson(dir)) {
    throw new Error(`${dir} cannot be packed because it has no extension.json file.`);
  }

  await await offerDevNameSync(dir);

  const tmpDir = await createTempDir();
  const packageDir = path.join(tmpDir, 'package');

  fs.ensureDirSync(packageDir);

  if (options.nobuild) {
    console.error('Skipping build step due to --nobuild flag.');
  } else {
    await spinify(buildNodeProject(dirPath('server')), 'Building the server part...', 'OK');
    await spinify(buildNodeProject(dirPath('app')), 'Building the app part...', 'OK');
  }

  const dirsToPack = packedDirectories.filter(hasPackageJson);

  return spinify(async () => {
    for (const partDir of dirsToPack) {
      npmPack(partDir, packageDir);
    }

    const extensionJsonPathSrc = dirPath('extension.json');
    const extensionJsonPathDest = path.join(packageDir, 'extension.json');
    const destinationDir = options.packToTempDir ? tmpDir : dir;
    const destinationPackage = path.join(destinationDir, 'extension.tgz');

    fs.copySync(extensionJsonPathSrc, extensionJsonPathDest);

    try {
      await targz().compress(packageDir, destinationPackage);
    } catch (err) {
      err.message = `TAR error while trying to gzip '${packageDir}' to '${destinationPackage}': ${err.message}`;
      throw err;
    }

    return ({
      packedDirs: dirsToPack,
      allDirs: packedDirectories,
      package: destinationPackage,
    });
  }, 'Packing extension...', 'OK');
}
