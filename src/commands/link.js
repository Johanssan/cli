import path from 'path';
import { ensureInExtensionDir, readJsonFile, loadExtensionJsonAsync } from '../extension/data';
import { getPlatformRootDir } from '../extension/platform';

export default async function link(args) {
  const extensionRoot = ensureInExtensionDir();
  const clonedAppPath = await getPlatformRootDir(args.clonedAppPath);

  await readJsonFile(path.join(clonedAppPath, 'package.json'));
}
