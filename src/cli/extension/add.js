import path from 'path';
import {
  addToExtensionsJs,
  getPlatformConfig,
  getPlatformExtensionsDir,
  getPlatformRootDir,
  linkLocalExtension
} from "../../services/platform";
import {executeAndHandleError} from "../../services/error-handler";
import {initExtension} from "../../commands/init";
import {publishExtension} from "../../commands/publish";
import {uploadExtension} from "../../commands/push";
import {installLocalExtension} from "../../commands/install";
import 'colors';
import {spinify} from "../../services/spinner";

export const description = 'Create a new extension for the current app';
export const command = 'add <name>';
export const builder = yargs => {
    return yargs
      .options({
        local: {
          description: 'Extension is only added locally and is not published or installed on the shoutem server',
          type: 'boolean',
          default: false
        }
      })
      .usage(`shoutem ${command}\n\n${description}`);
};

const postRunMessage =
`
  ${'shoutem screen add'.blue.bold}
    add a new screen

  ${'shoutem schema add'.blue.bold}
    add a new data schema

  ${'shoutem theme add'.blue.bold}
    add a new theme

  ${'shoutem page add'.blue.bold} 
    add a new settings page 
`;

export const handler = ({ name, local }) => executeAndHandleError(async () => {
  const platformDir = await getPlatformRootDir();
  const extensionPath = await initExtension(name, await getPlatformExtensionsDir(platformDir));

  if (!local) {
    await uploadExtension({}, extensionPath);
    await publishExtension(extensionPath);

    const { appId } = await getPlatformConfig(platformDir);
    await spinify(installLocalExtension(appId, extensionPath), 'Installing it in your app...', 'OK');
  }

  console.log('\nRunning npm install script:');
  await linkLocalExtension(platformDir, extensionPath);
  await addToExtensionsJs(platformDir, extensionPath);
  console.log(`npm install [${'OK'.bold.green}]`);

  const cdCommand = 'cd ' + path.relative(process.cwd(), extensionPath);
  console.log('\nCongratulations, your new extension is ready!'.green.bold);
  console.log(`You might try doing ${cdCommand.blue.bold} where you can:`);
  console.log(postRunMessage);
  console.log('Happy coding!');
});