import fs from 'fs-extra';
import _ from 'lodash';
import semver from 'semver';
import { prompt } from 'inquirer';

import { ensureUserIsLoggedIn } from './login';

import msg from '../user_messages';
import { offerInstallationUpdate } from '../cli/extension/publish';

import { getHostEnvName } from '../clients/server-env';
import * as extensionManager from '../clients/extension-manager';
import { getExtensionCanonicalName } from '../clients/local-extensions';

import {
  ensureInExtensionDir,
  loadExtensionJson,
  saveExtensionJson,
} from '../services/extension';
import extLint from '../services/extlint';
import depcheck from '../services/depcheck';
import shoutemPack from '../services/packer';
import multiglob from '../services/multiglob';
import { handleError } from '../services/error-handler';
import { getPlatformRootDir } from '../services/platform';
import { spinify, startSpinner } from '../services/spinner';
import { createProgressHandler } from '../services/progress-bar';

import pushAll from '../commands/push-all';

export async function publishExtension(extDir) {
  const extJson = loadExtensionJson(extDir);
  const canonicalName = await getExtensionCanonicalName(extDir);

  return spinify(
    extensionManager.publishExtension(canonicalName),
    msg.publish.publishInfo(extJson),
    'OK',
  );
}

export async function lintExtensionCode(extensionDir) {
  const OK = `[${'OK'.green.bold}]`;

  process.stdout.write('Checking the extension code for syntax errors... ');

  try {
    await extLint(extensionDir);
    console.log(OK);
  } catch (err) {
    err.message = 'Syntax errors detected, aborting push! Use `shoutem push --nocheck` to override';
    throw err;
  }
}

export async function checkExtensionDependencies(extensionDir) {
  await spinify(await depcheck(extensionDir), 'Checking for missing shoutem dependencies', 'OK');
}

export async function promptPublishableVersion(extJson) {
  const dev = await ensureUserIsLoggedIn();
  const { name } = extJson;
  let { version } = extJson;
  let canExtensionBePublished;

  while (!canExtensionBePublished) {
    const canonical = getExtensionCanonicalName(dev.name, name, version);

    canExtensionBePublished = await spinify(
      extensionManager.canPublish(canonical),
      `Checking if version ${version} can be published`,
    );

    if (canExtensionBePublished) {
      break;
    }

    const { newVersion } = await prompt({
      name: 'newVersion',
      default: semver.inc(version, 'patch'),
      message: `Version ${version} is already published. Specify another version:`,
      validate: v => !!semver.valid(v),
    });

    version = newVersion;
  }

  return version;
}

export async function uploadExtension(opts = {}, extensionDir = ensureInExtensionDir()) {
  if (!opts.nocheck) {
    await lintExtensionCode(extensionDir);
    await checkExtensionDependencies(extensionDir);
  }

  const extJson = await loadExtensionJson(extensionDir);

  if (opts.publish) {
    await promptPublishableVersion(extJson);
    await saveExtensionJson(extJson, extensionDir);
  }

  const packOptions = { packToTempDir: true, nobuild: opts.nobuild };
  const packResult = await shoutemPack(extensionDir, packOptions);
  const { size } = await fs.stat(packResult.package);
  const stream = fs.createReadStream(packResult.package);
  const id = await getExtensionCanonicalName(extensionDir);
  let spinner = null;

  const extensionId = await extensionManager.uploadExtension(
    id,
    stream,
    createProgressHandler({
      msg: 'Upload progress',
      total: size,
      onFinished() {
        spinner = startSpinner('Processing upload...');
      },
    }),
    size,
  );

  if (spinner) {
    spinner.stop(true);
    console.log(`Processing upload... [${'OK'.green.bold}]`);
  }

  console.log(`${msg.push.uploadingInfo(extJson, getHostEnvName())} [${'OK'.green.bold}]`);

  await fs.unlink(packResult.package);

  const notPacked = _.difference(packResult.allDirs, packResult.packedDirs);

  if (notPacked.length > 0) {
    throw new Error(msg.push.missingPackageJson(notPacked));
  }

  return { extensionId, packResult, extJson };
}

export async function pushAndPublish(args = {}) {
  if (!args.nopush) {
    await uploadExtension({ ...args, publish: true });
  }

  const extPath = ensureInExtensionDir();
  const { name } = loadExtensionJson();
  const { id: extensionId, version } = await publishExtension(extPath);

  if (getPlatformRootDir(extPath, { shouldThrow: false })) {
    await offerInstallationUpdate(extensionId, name, version);
  }
}

export async function publishMultiple(args) {
  args.paths = multiglob(args.paths);

  const { pushed, notPushed } = await pushAll(args);

  const published = [];
  let notPublished = [];

  for (const extPath of pushed) {
    try {
      const result = await publishExtension(extPath);
      console.log(msg.publish.complete(result).green.bold);
      published.push(extPath);
    } catch (err) {
      await handleError(err);
      notPublished.push(extPath);
    }
  }

  if (published.length > 0) {
    console.log('\nPublished:');
    console.log(published.map(e => `  ${e}`).join('\n'));
  }

  notPublished = [...notPublished, ...notPushed];

  if (notPublished.length > 0) {
    console.log('\nNot published:');
    console.log(notPublished.map(e => `  ${e}`).join('\n'));
  }
}

export async function publishSingle(args) {
  await pushAndPublish(args);
  console.log('Success'.green.bold);
}
