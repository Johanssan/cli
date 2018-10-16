import confirmPublish from '../commands/confirm-admin-action';
import { publishSingle, publishMultiple } from '../commands/publish';
import { handleError } from '../services/error-handler';

export const description = 'Publish current extension version.';
export const command = 'publish [paths..]';

const options = {
  nobuild: {
    type: 'boolean',
    description: 'Push and publish the extension without building it. Use this option carefully!',
  },
  nopush: {
    type: 'boolean',
    description: 'Publish the extension without pushing it first. Use this option carefully!',
  },
  noconfirm: {
    type: 'boolean',
    description: 'Push extensions without asking for confirmation',
  },
  nocheck: {
    type: 'boolean',
    description: 'Push without checking for syntax errors and extension dependencies',
  },
};
const usage = `shoutem ${command} [options]\n\n${description}`;

export const builder = yargs => yargs.options(options).usage(usage);

export async function handler(args) {
  if (!await confirmPublish('WARNING: you are about to publish using shoutem developer. Are you sure about that?')) {
    console.log('Publish aborted'.bold.yellow);
    return;
  }

  try {
    if (args.paths.length === 0) {
      await publishSingle(args);
    } else {
      await publishMultiple(args);
    }
  } catch (err) {
    await handleError(err);
  }
}
