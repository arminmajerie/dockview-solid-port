const gulp = require('gulp');
const sass = require('sass');
const gulpSass = require('gulp-sass')(sass);
const concat = require('gulp-concat');

gulp.task('sass', () => {
    return gulp
        .src('./src/**/*.scss')
        .pipe(gulpSass.sync({ api: 'modern' }).on('error', gulpSass.logError))
        .pipe(concat('dockview.css'))
        .pipe(gulp.dest('./dist/styles/'));
});

gulp.task('run', gulp.series(['sass']));
