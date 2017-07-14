import link from '../commands/link';
import { executeAndHandleError } from '../extension/error-handler';

export const description = 'Run shoutem app with extension located in a separate directory';
export const command = 'link <clonedAppPath>';
export async function handler(args) {
  await executeAndHandleError(() => link(args));
}
