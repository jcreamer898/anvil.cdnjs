var request = require( "request" );

var pluginFactory = function(_, anvil) {
    return anvil.plugin({
        // Name your plugin
        name: "anvil.cdnjs",
        // Activity list: "identify", "pull", "combine", "pre-process","compile", "post-process", "push", "test"
        activity: "identify",
        // Command all the things [ "-s, --somecommand", "Run this plugin for awesomesauce" ]
        commander: [
            ["--cdnjs:install [name]", "Install a cdnjs file."],
            ["--cdnjs:search [name]", "Install a cdnjs file."],
            ["-o, --output [output]", "Output directory."]
        ],
        url: "http://cdnjs.com/packages.json",
        packageName: "",
        output: "ext",
        baseUrl: "http://cdnjs.cloudflare.com/ajax/libs/",
        // Configure all the things...
        configure: function( config, command, done ) {

            if( command["cdnjs:install"] ) {
                this.packageName = command[ "cdnjs:install" ];
            }

            if( command["cdnjs:search"] ) {
                this.search = command[ "cdnjs:search" ];
            }

            if( command["output"] ) {
                this.output = command[ "output" ];
            }

            done();
        },
        // Run all the things...
        run: function( done ) {
            var libs, pkg, url;
            
            if ( !this.search && !this.packageName ) {
                done();
                return;
            }
            

            request( this.url, function( err, response, body ) {
                if( err || response.statusCode !== 200 ) {
                    anvil.log.error( err );
                    done();
                }

                libs = JSON.parse( body ).packages;

                if ( this.packageName ) {
                    pkg = _.find( libs, function(lib) {
                        return lib.name === this.packageName;
                    }.bind(this));

                    if( !pkg ) {
                        anvil.log.warning( "anvil.cdnjs: No library with named: " + this.packageName + " exists on cdnjs." );
                        done();
                    }

                    url = this.baseUrl + pkg.name + "/" + pkg.version + "/" + pkg.filename;
                    this.pkg = pkg;

                    request( url, function( err, response, body ) {
                        this.getPkg( err, response, body, done );
                    }.bind( this ));

                }
                else if ( this.search ) {
                    pkg = _.filter( libs, function( lib ) {
                        if( !lib.name ) {
                            return;
                        }
                        return lib.name === this.search || ~lib.name.indexOf(this.search);
                    }.bind( this ));

                    _.each( pkg, function( p ) {
                        anvil.log.complete( p.name );
                    });
                    done();
                }
                else {
                    done();
                }

            }.bind( this ));
        },
        getPkg: function( err, response, body, done ) {
            var target;
            anvil.fs.ensurePath( this.output, function( err ) {
                if( err ) {
                    anvil.log.error( err );
                    done();
                }
                target = this.output + "/" + this.pkg.filename;
                anvil.fs.write( target, body, function( err) {
                    if( err ) {
                        anvil.log.error( err );
                        done();
                    }

                    anvil.log.complete( this.pkg.filename + " has been installed to " + target );

                    done();
                }.bind( this ));

            }.bind( this ));
        }
    });
};

module.exports = pluginFactory;