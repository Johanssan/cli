import 'colors';
import _ from 'lodash';
import { installPlatform } from './install';
import { publishOwnPlatform } from './publish';
import confirmer from '../../services/confirmer';
import { spinify } from '../../services/spinner';
import { ensureUserIsLoggedIn } from '../../commands/login';
import { getPlatformConfig } from '../../services/platform';
import { executeAndHandleError } from '../../services/error-handler';
import { uploadPlatformArchive } from '../../commands/platform';
import { createPlatformArchiveProvider } from '../../services/platform-archive';

export const description = 'Create a new platform';
export const command = 'create';
export const builder = yargs => yargs
  .options({
    url: {
      description: 'Download location for the platform archive, if omitted the platform will be '
            + 'automatically generated from the current directory tree',
      type: 'string',
      default: '',
    },
  })
  .usage(`shoutem ${command} [options]\n\n${description}`);

const postRunInstall = platformId => `
  ${`shoutem platform install --app [app ID] --platform ${platformId}`.cyan}
  To install this platform on an app
`;

const postRunPublish = platformId => `
  ${`shoutem platform publish --platform ${platformId}`.cyan}
  To publish this platform for everyone to use
`;

export const handler = args => executeAndHandleError(() => createPlatform(args));

export async function createPlatform({ url }) {
  const developer = await ensureUserIsLoggedIn();

  const provider = await createPlatformArchiveProvider(url);
  if (provider == null) {
    throw new Error('Invalid URL parameter or not run in the valid Shoutem platform directory');
  }

  const platformResponse = await uploadPlatformArchive(provider);

  console.log(`\nCongratulations, your new platform with ID ${platformResponse.id} is ready!`.green.bold);

  let published = false;
  let installed = false;
  if (await confirmer('Do you want to publish the new platform?')) {
    await spinify(publishOwnPlatform({ platform: platformResponse.id }));
    published = true;
  }

  const { appId } = await getPlatformConfig();
  if (!_.isNil(appId)) {
    if (await confirmer(`Do you want to install the new platform to this app (${appId})?`)) {
      await spinify(installPlatform({ app: appId, platform: platformResponse.id }));
      installed = true;
    }
  }

  if (!published || !installed) {
    console.log('You might want to try: ');

    if (!published) {
      console.log(postRunPublish(platformResponse.id));
    }

    if (!installed) {
      console.log(postRunInstall(platformResponse.id));
    }
  }

  console.log('Success!'.green.bold);
  console.log('Happy coding!');
}