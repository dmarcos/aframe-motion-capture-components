var webpack = require('webpack');

var PLUGINS = [];
if (process.env.NODE_ENV === 'production') {
  PLUGINS.push(new webpack.optimize.UglifyJsPlugin());
}

module.exports = {
  devServer: {
    disableHostCheck: true
  },
  entry: './src/index.js',
  output: {
    path: __dirname,
    filename: './examples/js/build.js'
  },
  plugins: PLUGINS
};
