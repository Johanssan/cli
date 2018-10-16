import path from 'path';
import zlib from 'zlib';
import fs from 'fs-extra';
import tmp from 'tmp-promise';

export function prependPath(prepend) {
  return p => path.join(prepend, p);
}

export function hasPackageJson(dir) {
  return fs.existsSync(path.join(dir, 'package.json'));
}

export function hasExtensionsJson(dir) {
  return fs.existsSync(path.join(dir, 'extension.json'));
}

export async function createTempDir() {
  let tmpDir = '';

  try {
    tmpDir = (await tmp.dir()).path;
  } catch (err) {
    err.message = `Error creating temporary directory: ${err.message}`;
    throw (err);
  }

  return tmpDir;
}

export function checkZipFileIntegrity(filePath) {
  const zipBuffer = fs.readFileSync(filePath);
  const zlibOptions = {
    flush: zlib.Z_SYNC_FLUSH,
    finishFlush: zlib.Z_SYNC_FLUSH,
  };

  try {
    zlib.gunzipSync(zipBuffer, zlibOptions);
  } catch (err) {
    err.message = `Zip integrity error: ${err.message} (${filePath})`;
    return err;
  }

  return true;
}

export function removeTrailingSlash(str) {
  return str.replace(/\/$/, '');
}
