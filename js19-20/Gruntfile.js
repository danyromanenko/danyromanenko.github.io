'use strict';

module.exports = function (grunt) {

    // 1. Вся настройка находится здесь
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            src: 'js/*.js',
            dist: {
                src: 'js/*.js',
                dest: 'js/build/script.main.js'
            }},
        
        
        uglify: {
            build: {
                src: 'js/build/script.main.js',
                dest: 'js/build/script.main.min.js'
            }
        },
        concat_css: {
            options: {},
            files: {
                src: ["css/*.css"],
                dest: "css/style.main.css"
            },
        },
        
        cssmin: {
            options: {},
            files:{
                src: 'css/*.css',
                dest: 'css/style.main.min.css',
            }},
        
        sass: {
            dist: {
            files: [{
            expand: true,
            cwd: 'css',
            src: ['*.scss'],
            dest: 'css',
            ext: '.css'
      }]
    }
  }
    });

    // 3. Тут мы указываем Grunt, что хотим использовать этот плагин
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-concat-css');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-sass');

    // 4. Указываем, какие задачи выполняются, когда мы вводим «grunt» в терминале
    grunt.registerTask('default', ['concat', 'uglify', 'concat_css', 'cssmin', 'sass']);

};