import fs from 'fs-extra';
import getHomeDir from '../home-dir';

export function getLocalStoragePath() {
  const storagePath = getHomeDir();
  fs.ensureDirSync(storagePath);
  return storagePath;
}
