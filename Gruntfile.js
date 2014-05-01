module.exports = function(grunt) {
    grunt.initConfig({
        jshint: {
            src: ['Gruntfile.js', 'leaf.js', 'libs/*.js', 'test/*.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        watch: {
            hint: {
                files: '<%= jshint.src %>',
                tasks: ['jshint']
            },
            test: {
                files: ['libs/**/*', 'test/**/*'],
                tasks: ['test']
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    require: ['chai', 'test/support/setup'],
                    ui: 'bdd'
                },
                src: ['test/**/*.js']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('default', 'jshint');
    grunt.registerTask('test', 'mochaTest');
};