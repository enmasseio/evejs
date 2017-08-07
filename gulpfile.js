var gulp = require('gulp');

var gutil = require('gulp-util');
var inline = require('gulp-inline-sourcemap');
require('gulp-babel')({ modules: "amd", optional: ['runtime']});
var exec = require('child_process').exec;
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var pump = require('pump');
var uglify = require('gulp-uglify');
var babel = require('babel-loader');
var sourcemaps = require('gulp-sourcemaps');
var livereload = require('gulp-livereload');
var clean = require('gulp-clean');
var webpackstream = require('webpack2-stream-watch');
var webpack = require('webpack');
var rename = require('gulp-rename');

var path = require('path');
var fs = require('fs');

var ENTRY = './index.js';
var FILE = 'eve.js';
var FILE_INLINE = 'eve.sm.js';
var FILE_MAP = 'eve.js.map';
var FILE_BABEL = 'eve.es5.js';
var FILE_BABEL_MAP = 'eve.es5.js.map';
var FILE_BABEL_INLINE = 'eve.es5.sm.js';
var FILE_MIN = 'eve.min.js';
var FILE_MIN_MAP = 'eve.min.js.map';
var DIST = path.resolve(__dirname, 'dist');
var EVE_JS = DIST + '/' + FILE;
var EVE_JS_INLINE = DIST + '/' + FILE_INLINE;
var EVE_MAP_JS = DIST + '/' + FILE_MAP;
var EVE_BABEL_JS = DIST + '/' + FILE_BABEL;
var EVE_BABEL_MAP_JS = DIST + '/' + FILE_BABEL_MAP;
var EVE_BABEL_INLINE_JS = DIST + '/' + FILE_BABEL_INLINE;
var EVE_MIN_JS = DIST + '/' + FILE_MIN;
var EVE_MIN_MAP_JS = DIST + '/' + FILE_MIN_MAP;

var webpackConfig = {
  node: {
    fs: "empty",
    tls: "empty",
    child_process: "empty",
    net: "empty"
  },
  plugins: [
    new webpack.IgnorePlugin(/amqplib/)
  ],
  module: {
    exprContextCritical: false,
    loaders: [
      {test: /\.json/, loader: 'json-loader'},
      {test: /\.md/, loader: 'ignore-loader'}
    ]
  },
  devtool: "source-map",
  cache: true,
  output: {
    library: 'eve',
    libraryTarget: 'umd',
    path: DIST,
    filename: FILE
  }
};
var webpackConfigBabel = {
  node: {
    fs: "empty",
    tls: "empty",
    child_process: "empty",
    net: "empty"
  },
  plugins: [
    new webpack.IgnorePlugin(/amqplib/)
  ],
  module: {
    exprContextCritical: false,
    loaders: [
      {test: /\.json/, loader: 'json-loader'},
      {test: /\.md/, loader: 'ignore-loader'},{
        test: /\.jsx?$/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
          plugins:[
            [
              "transform-strict-mode", { strict: false }
            ]
          ],
          sourceType: "script",
          compact: true
        }
      }
    ]
  },
  devtool: "inline-source-map",
  cache: true,
  output: {
    library: 'eve',
    libraryTarget: 'umd',
    path: DIST,
    filename: FILE_BABEL
  }
};
var uglifyConfig = {
//  outSourceMap: FILE_MAP,

  mangle: true,
  compress: {
    sequences: true,
    dead_code: true,
    conditionals: true,
    booleans: true,
    unused: true,
    if_return: true,
    join_vars: true,
    drop_console: true
  },
  output: {
    comments: /@license/
  }
};

gulp.task('build', function (cb) {
  // app.js is your main JS file with all your module inclusions
  exec("patch -p0 -fr - < dbus.patch &> /dev/null");
  pump([
    gulp.src(ENTRY),
    webpackstream(webpackConfig),
    gulp.dest(DIST),
    livereload()
  ],cb);
});
gulp.task('babel', function (cb){
  // app.js is your main JS file with all your module inclusions
  exec("patch -p0 -fr - < dbus.patch &> /dev/null");
  pump([
    gulp.src(ENTRY),
    webpackstream(webpackConfigBabel),
    gulp.dest(DIST),
    livereload()
  ],cb);
});
gulp.task('compress', ['babel'], function (cb) {
  pump([
    gulp.src(EVE_BABEL_JS),
    sourcemaps.init({loadMaps: true}),
    rename(FILE_MIN),
    uglify(uglifyConfig).on('error', function (err) {
      gutil.log(gutil.colors.red('[Error]'), err.toString());
      this.emit('end');
    }),
    sourcemaps.write("."),
    gulp.dest(DIST),
    livereload()
  ],cb);
});

gulp.task('watch', ['compress'], function () {
  livereload.listen();
  gulp.watch(['index.js', 'lib/**/*.js'], ['compress']);
});

gulp.task('bundle', ['babel']);
gulp.task('watch-bundle', ['babel'], function () {
  livereload.listen();
  gulp.watch(['index.js', 'lib/**/*.js'], ['build']);
});

gulp.task('default', ['build']);
