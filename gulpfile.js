var fs = require('fs');
var gulp = require('gulp');
var gutil = require('gulp-util');
var webpack = require('webpack');
var uglify = require('uglify-js');

var ENTRY       = './index.js';
var FILE        = 'eve.js';
var FILE_MIN    = 'eve.min.js';
var FILE_MAP    = 'eve.map';
var DIST        = './dist';
var EVE_JS      = DIST + '/' + FILE;
var EVE_MIN_JS  = DIST + '/' + FILE_MIN;
var EVE_MAP_JS  = DIST + '/' + FILE_MAP;

var webpackConfig = {
  entry: ENTRY,
  output: {
    library: 'eve',
    libraryTarget: 'umd',
    path: DIST,
    filename: FILE
  },
  externals: [
    // TODO: exclude all non-relevant libraries from the browser bundle
    'amqp'
  ],
  cache: true
};

var uglifyConfig = {
  outSourceMap: FILE_MAP,
  output: {
    comments: /@license/
  }
};

// create a single instance of the compiler to allow caching
var compiler = webpack(webpackConfig);

gulp.task('bundle', function (cb) {
  // TODO: add a header (banner) on top of the file
  compiler.run(function (err, stats) {
    if (err) {
      gutil.log(err);
    }

    gutil.log('bundled ' + EVE_JS);

    cb();
  });
});

gulp.task('minify', ['bundle'], function () {
  var result = uglify.minify([EVE_JS], uglifyConfig);

  fs.writeFileSync(EVE_MIN_JS, result.code);
  fs.writeFileSync(EVE_MAP_JS, result.map);

  gutil.log('Minified ' + EVE_MIN_JS);
  gutil.log('Mapped ' + EVE_MAP_JS);
});

// The default task (called when you run `gulp`)
gulp.task('default', ['bundle', 'minify']);

// Watch task to automatically bundle and minify on change of code
gulp.task('watch', ['bundle', 'minify'], function () {
  gulp.watch(['index.js', 'lib/**/*.js'], ['bundle', 'minify']);
});

// Watch task to automatically bundle on change of code
gulp.task('watch-dev', ['bundle'], function () {
  gulp.watch(['index.js', 'lib/**/*.js'], ['bundle']);
});
