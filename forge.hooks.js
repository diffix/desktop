/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');

module.exports = {
  postMake: async (_forgeConfig, makeResults) => {
    for (const makeResult of makeResults) {
      const artifacts = [];
      for (const artifact of makeResult.artifacts) {
        if (artifact.endsWith('RELEASES') || artifact.endsWith('full.nupkg')) {
          console.warn('Dropping artifact from build: ' + artifact);
          fs.unlinkSync(artifact);
        } else {
          artifacts.push(artifact);
        }
      }
      makeResult.artifacts = artifacts;
    }
  },
};
