import link from '../commands/link'

export const command = 'link <platformPath>';
export const builder = yargs => yargs.usage(`usage: shoutem ${command}\n\n${description}`);
export const handler = async args => {
  await link(args);
};
