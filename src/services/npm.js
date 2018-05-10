import path from 'path';
import Promise from 'bluebird';
import fs from 'fs-extra';
import { spawn } from 'child-process-promise';
import { writeJsonFile, readJsonFile } from "./data";

const linkLocal = Promise.promisify(require('linklocal'));

export async function install(cwd = process.cwd()) {
  await spawn('npm', ['install'], {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FORCE_COLOR: true }
  });
}

export async function run(cwd, task, taskArgs = [], npmOptions = []) {
  const opts = {
    cwd,
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true
  };

  const spawned = taskArgs.length ?
    spawn('npm', ['run', task, ...npmOptions, '--', ...taskArgs], opts) :
    spawn('npm', ['run', task, ...npmOptions], opts);

  return await spawned;
}

export function getPackageJson(npmProjectPath) {
  return readJsonFile(path.join(npmProjectPath, 'package.json'));
}

export function savePackageJson(npmProjectPath, pkgJson) {
  return writeJsonFile(path.join(npmProjectPath, 'package.json'), pkgJson);
}

export function addLocalDependency(npmProjectPath, npmModulePath) {
  const { name } = getPackageJson(npmModulePath);
  const packageJson = getPackageJson(npmProjectPath);

  const dependencyValue = 'file:' + path.relative(npmProjectPath, npmModulePath);

  savePackageJson(npmProjectPath, {
    ...packageJson,
    dependencies: {
      ...packageJson.dependencies,
      [name]: dependencyValue
    }
  });
}

export async function linkLocalDependencies(npmProjectPath) {
  return await linkLocal(npmProjectPath);
}
