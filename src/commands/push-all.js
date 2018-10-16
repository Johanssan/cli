import path from 'path';
import fs from 'fs-extra';
import { prompt, Separator } from 'inquirer';

import msg from '../user_messages';
import { uploadExtension } from '../commands/publish';
import { getHostEnvName } from '../clients/server-env';
import { handleError } from '../services/error-handler';

function extJsonExistsInDir(dir) {
  return fs.pathExistsSync(path.join(dir, 'extension.json'));
}

export default async function pushAll(args) {
  const extPaths = args.paths.filter(p => extJsonExistsInDir(p));

  if (extPaths.length === 0) {
    console.log('No extensions found in current directory.');
    return [];
  }

  if (args.nopush) {
    return {
      pushed: extPaths,
      notPushed: [],
    };
  }

  const pushed = [];
  const notPushed = [];
  const cwd = process.cwd();
  let pathsToPush = extPaths;

  if (!args.noconfirm) {
    pathsToPush = await prompt({
      type: 'checkbox',
      name: 'pathsToPush',
      message: `Check extensions you want to push to ${getHostEnvName()}?`,
      choices: extPaths.concat(new Separator()),
      default: extPaths,
      pageSize: 20,
    });
  }

  for (let extPath of pathsToPush) {
    if (!path.isAbsolute(extPath)) {
      extPath = path.join(cwd, extPath);
    }

    try {
      await uploadExtension(args, extPath);
      console.log(msg.push.complete());
      pushed.push(extPath);
    } catch (err) {
      await handleError(err);
      notPushed.push(extPath);
    }
  }

  if (pushed.length > 0) {
    console.log('Pushed:');
    console.log(pushed.map(e => `  ${e}`).join('\n'));
  }

  if (notPushed.length > 0) {
    console.log('Not pushed:');
    console.log(notPushed.map(e => `  ${e}`).join('\n'));
  }

  return {
    pushed,
    notPushed,
  };
}
