import 'colors';
import { getPlatformRootDir } from '../extension/platform'
import { getExtensionRootDir } from '../extension/data';
import { getExtensionCanonicalName } from '../clients/local-extensions';
import path from 'path';
import sync from 'chokidar-sync';

function log(args) {
  const destPath = args.relative;
  if (args.type === 'add') {
    console.log(destPath.green);
  } else if (args.type === 'change') {
    console.log(destPath);
  } else {
    console.log(destPath.red);
  }
}

export default async function link({ platformPath, extensionPath }) {
  const platformRoot = await getPlatformRootDir(platformPath);
  const extensionRoot = getExtensionRootDir(extensionPath);

  const canonicalName =
}