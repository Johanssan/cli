import _ from 'lodash';
import path from 'path';
import inquirer from 'inquirer';
import decamelize from 'decamelize';
import fs from 'fs-extra';

import msg from '../user_messages';
import { ensureUserIsLoggedIn } from '../commands/login';
import { getPlatforms } from '../clients/extension-manager';
import { stringify } from '../services/data';
import { offerChanges } from '../services/diff';
import { getExtensionCanonicalName } from '../services/extension';
import { instantiateExtensionTemplate } from '../services/extension-template';

function generateNoPatchSemver(version) {
  const [a, b] = version.split('.');
  return [a, b, '*'].join('.');
}

function validateVersion(value) {
  if (value.match(/^(\d+)\.(\d+)\.(\d+)+$/)) {
    return true;
  }

  return 'Version must contain numbers in format X.Y.Z';
}

export async function promptExtensionInit(extName) {
  const name = _.kebabCase(extName);
  const title = _.upperFirst(decamelize(extName, ' '));
  const version = '0.0.1';

  const questions = [
    {
      name: 'title',
      message: 'Title',
      default: title,
    },
    {
      name: 'version',
      message: 'Version',
      default: version,
      validate: validateVersion,
    },
    {
      name: 'description',
      message: 'Description',
    },
  ];

  console.log(msg.init.requestInfo());
  const answer = await inquirer.prompt(questions);

  const platformVersions = (await getPlatforms())
    .filter(({ published }) => published)
    .map(({ version }) => version);

  const platform = generateNoPatchSemver(_.first(platformVersions));

  return {
    name,
    ...answer,
    platform,
  };
}

export async function initExtension(extensionName, extensionPath = process.cwd()) {
  const extJson = await promptExtensionInit(extensionName);
  const { name: devName } = await ensureUserIsLoggedIn();
  const { name: extName, version, description } = extJson;

  // I guess this one is here because it internally calls
  // analytics.setExtensionCanonicalName(canonicalName)
  getExtensionCanonicalName(devName, extName, version);

  const dirname = `${devName}.${extName}`;

  if (fs.pathExistsSync(path.join(process.cwd(), dirname))) {
    throw new Error(`Folder ${dirname} already exists.`);
  }

  const packageJsonString = stringify({
    name: dirname,
    description,
    version,
  });

  await offerChanges(await instantiateExtensionTemplate('init', {
    packageJsonString,
    extensionPath,
    extJson,
    devName,
  }));

  return path.join(extensionPath, dirname);
}
