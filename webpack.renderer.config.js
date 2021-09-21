/* eslint-disable @typescript-eslint/no-var-requires */

const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

rules.push({
  test: /\.md$/,
  type: 'asset/source',
});

module.exports = {
  module: {
    rules,
  },
  plugins: [...plugins, new NodePolyfillPlugin()],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
