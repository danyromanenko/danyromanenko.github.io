
module.exports = function (grunt) {
    'use strict';
    
    // 1. Вся настройка находится здесь
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            options: {},
            dist: {
                src: 'src/js/*.js',
                dest: 'build/js/script.main.js'
            }
        },
        
        
        uglify: {
            build: {
                src: 'build/js/script.main.js',
                dest: 'build/js/script.main.min.js'
            }
        },
        concat_css: {
            options: {},
            files: {
                src: ["build/css/style.css"],
                dest: "build/css/style.main.css"
            }
        },
        
        cssmin: {
            options: {},
            files: {
                src: 'build/css/style.main.css',
                dest: 'build/css/style.main.min.css'
            }
        },
        
        sass: {
            dist: {
                files: {
                    'build/css/style.css': 'src/sass/style.scss'
                }
            }
        },
        watch: {
            sass: {
      // We watch and compile sass files as normal but don't live reload here
                files: ['src/sass/*.scss'],
                tasks: ['sass']
            }
        
        }
    });

    // 3. Тут мы указываем Grunt, что хотим использовать этот плагин
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-concat-css');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    

    // 4. Указываем, какие задачи выполняются, когда мы вводим «grunt» в терминале
    grunt.registerTask('default', ['concat', 'uglify', 'concat_css', 'cssmin', 'sass', 'watch']);

};