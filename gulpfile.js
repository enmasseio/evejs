var gulp = require('gulp');

var gutil = require('gulp-util');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var livereload = require('gulp-livereload');
var clean = require('gulp-clean');
var webpackstream = require('webpack-stream');
var webpack = require('webpack');
var rename = require('gulp-rename');

var path = require('path');
var fs = require('fs');

var ENTRY = './index.js';
var FILE = 'eve.js';
var FILE_MIN = 'eve.min.js';
var FILE_MAP = 'eve.map';
var DIST = path.resolve(__dirname, 'dist');
var EVE_JS = DIST + '/' + FILE;
var EVE_MIN_JS = DIST + '/' + FILE_MIN;
var EVE_MAP_JS = DIST + '/' + FILE_MAP;

var webpackConfig = {
  node: {
    fs: "empty",
    tls: "empty",
    child_process: "empty"
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
  cache: true,
  output: {
    library: 'eve',
    libraryTarget: 'umd',
    path: DIST,
    filename: FILE
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
gulp.task('build', function () {
  // app.js is your main JS file with all your module inclusions

  return gulp.src(ENTRY)
    .pipe(webpackstream(webpackConfig))
    .pipe(babel({
      presets: ['es2015'],
      sourceType: "script",
      compact: true
    }))
    .pipe(gulp.dest(DIST))
    .pipe(livereload())
});

gulp.task('compress', ['build'], function () {
  return gulp.src(EVE_JS)
    .pipe(rename(FILE_MIN))
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify(uglifyConfig).on('error', function (err) {
      gutil.log(gutil.colors.red('[Error]'), err.toString());
      this.emit('end');
    }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(DIST))
});

gulp.task('watch', ['build'], function () {
  livereload.listen();
  gulp.watch(['index.js', 'lib/**/*.js'], ['build']);
});

gulp.task('default', ['watch']);
