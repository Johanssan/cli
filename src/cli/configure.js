import {
  configurePlatform,
  getPlatformConfig,
  getPlatformRootDir,
  setPlatformConfig,
} from '../services/platform';
import { executeAndHandleError } from '../services/error-handler';

export const description = 'Runs platform\'s configure script to sync with native changes to local extensions';
export const command = 'configure';
export const usage = `shoutem ${command} \n\n${description}`;
export const options = {
  release: {
    alias: 'r',
    description: '(re)configure the app with last published configuration from the shoutem server',
    type: 'boolean',
    default: false,
  },
  production: {
    alias: 'p',
    description: 'configure the app for production mode build',
    type: 'boolean',
    default: false,
  },
};

export const builder = yargs => yargs.options(options).usage(usage);

export async function configure(args) {
  const appDir = getPlatformRootDir();
  const config = getPlatformConfig(appDir);

  await setPlatformConfig(appDir, {
    ...config,
    release: !!args.release,
    production: !!args.production,
  });

  await configurePlatform(appDir);
}

export async function handler(args) {
  await executeAndHandleError(async () => await configure(args));
}
