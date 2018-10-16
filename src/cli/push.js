import { executeAndHandleError } from '../services/error-handler';

export const description = 'Upload local extension code and assets.';
export const command = 'push [paths..]';

export const builder = yargs => yargs;

export const handler = () => executeAndHandleError(async () => {
  console.log('WARNING: shoutem push command is deprecated. Use shoutem publish instead'.yellow.bold);
  process.exit(1);
});
