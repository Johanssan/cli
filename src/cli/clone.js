import { executeAndHandleError } from '../services/error-handler';
import { clone } from '../commands/clone';

export const description = 'Downloads a shoutem application with all its extensions';
export const command = 'clone [appId]';
export const usage = `shoutem ${command} \n\n${description}`;

export const options = {
  platform: {
    alias: 'p',
    description: 'use external mobile app (ignores platform settings)',
    requiresArg: true,
  },
  noconfigure: {
    description: 'skip platform configuration step',
    type: 'boolean',
  },
  dir: {
    description: 'directory name for the cloned app',
    requiresArg: true,
  },
  force: {
    alias: 'f',
    description: 'destroys destination directory if it already exists',
    type: 'boolean',
  },
};

export const builder = yargs => yargs.options(options).usage(usage);

export async function handler(args) {
  await executeAndHandleError(() => clone(args, process.cwd()));
}
