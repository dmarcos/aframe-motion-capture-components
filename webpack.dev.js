var webpack = require('webpack');
var outputFilename = 'js/build.js';
var PLUGINS = [];

if (process.env.NODE_ENV === 'production') {
  PLUGINS.push(new webpack.optimize.UglifyJsPlugin());
  outputFilename = 'examples/js/build.js';
}

module.exports = {
  entry: './src/index.js',
  output: {
    path: __dirname,
    filename: outputFilename
  },
  plugins: PLUGINS
};
