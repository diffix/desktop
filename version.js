/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')

const version = process.env.npm_package_version;
const mode = process.argv[2];

function replaceInFile(path, match, replacement) {
  const data = fs.readFileSync(path, 'utf8');

  switch (mode) {
    case 'check':
      if (!data.match(match))
        throw `Error: no match found in '${path}'.`;
      break;

    case 'update':
      console.log(`Updating app version in '${path}'...`);
      fs.writeFileSync(path, data.replace(match, replacement), 'utf8');
      break;

    default:
      throw 'Error: invalid mode!'
  }
}

replaceInFile('CHANGELOG.md', '### Next version', `### Version ${version}`);
replaceInFile('LICENSE.md', /__Diffix for Desktop \d+\.\d+\.\d+__/, `__Diffix for Desktop ${version}__`);
