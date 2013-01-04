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
            ["--cdnjs:update [name]", "Update a cdnjs file."],
            ["-v [version]", "The version of the cdnjs package to install" ],
            ["-o, --output [output]", "Output directory."]
        ],
        url: "http://cdnjs.com/packages.json",
        packageName: "",
        config: {
            output: "src/vendor"
        },
        baseUrl: "http://cdnjs.cloudflare.com/ajax/libs/",
        // Configure all the things...
        configure: function( config, command, done ) {

            if( command[ "cdnjs:install" ] ) {
                this.config.packageName = command[ "cdnjs:install" ];
                this.command = "install";
            }

            else if( command[ "cdnjs:search" ] ) {
                this.query = command[ "cdnjs:search" ];
                this.command = "search";
            }

            if( command[ "output" ] ) {
                this.config.output = command[ "output" ];
            }

            done();
        },
        // Run all the things...
        run: function( done ) {
            var pkg, url;
            
            if ( !this.query && !this.config.packageName ) {
                done();
                return;
            }

            request( this.url, function( err, response, body ) {
                if( err || response.statusCode !== 200 ) {
                    anvil.log.error( err );
                    done();
                }

                this.libs = JSON.parse( body ).packages;

                if ( this[ this.command ] ) {
                    this[ this.command ].call( this, done );
                }
                else {
                    done();
                }

            }.bind( this ));
        },
        install: function( done ) {
            var pkg, url, packages = [];

            // Needs to be explicitly true, basically means they left out the package name.
            if ( this.config.packageName === true ) {
                _.each( this.config.libs, function( pkg, libName ) {
                    var cdnjsPackage = _.find( this.libs, function( cdnjsLib ) {
                        return cdnjsLib.name === libName;
                    });
                    if ( cdnjsPackage ) {
                        packages.push( cdnjsPackage );
                    }
                }.bind( this ));

                if ( packages.length ) {
                    anvil.scheduler.parallel( packages, this.installPackage, function() {
                        anvil.log.complete( "anvil.cdnjs: libraries installed" );
                        anvil.raise( "all.stop", 0 );
                        done();
                    });
                }
                else {
                    anvil.log.error( "anvil.cdnjs: No libaries present in config are available on cdnjs" );
                    anvil.raise( "all.stop", 0 );
                    done();
                }
            }
            else if ( this.config.packageName ) {
                pkg = _.find( this.libs, function(lib) {
                    return lib.name === this.config.packageName;
                }.bind(this));

                this.installPackage( pkg, function() {
                    anvil.raise( "all.stop", 0 );
                    done();
                });
            }
        },
        installPackage: function( pkg, done ) {
            var url;

            if( typeof pkg === "undefined" ) {
                anvil.log.error( "anvil.cdnjs: No library with named: " + this.config.packageName + " exists on cdnjs." );
                anvil.raise( "all.stop", 0 );
                done();
                return;
            }
            
            url = this.baseUrl + pkg.name + "/" + pkg.version + "/" + pkg.filename;
            pkg.url = url;

            request( url, function( err, response, body ) {
                this.getPkg( err, body, pkg, done );
            }.bind( this ));
        },
        search: function( done ) {
            var pkg;

            pkg = _.filter( this.libs, function( lib ) {
                if( !lib.name ) {
                    return;
                }
                return lib.name === this.query || ~lib.name.indexOf(this.query);
            }.bind( this ));

            _.each( pkg, function( p ) {
                anvil.log.complete( p.name );
            });
            anvil.raise( "all.stop", 0 );
            done();
        },
        getPkg: function( err, body, pkg, done ) {
            var target;
            anvil.fs.ensurePath( this.config.output, function( err ) {
                if( err ) {
                    anvil.log.error( "anvil.cdnjs:" + err );
                    done();
                }
                target = anvil.fs.buildPath( [ this.config.output, pkg.filename ] );

                anvil.fs.write( target, body, function( err) {
                    if( err ) {
                        anvil.log.error( "anvil.cdnjs:" + err );
                        done();
                    }

                    anvil.log.complete( pkg.filename + " has been installed to " + target );

                    if ( !anvil.fs.pathExists( "./build.json" ) ) {
                        anvil.fs.write( "./build.json", "{}", function()  {
                            this.updateBuild( pkg, done );
                        }.bind(this));
                    }

                    this.updateBuild( pkg, done );
                }.bind( this )); // anvil.fs.write
            }.bind( this )); // anvil.fs.ensurePath
        },
        compareVersion: function( a, b ) {
            var a_components = a.split("."),
                b_components = b.split("."),
                len, i;

            if ( a === b ) {
               return 0;
            }

            len = Math.min( a_components.length, b_components.length );

            // loop while the components are equal
            for ( i = 0; i < len; i++ ) {
                // A bigger than B
                if ( +a_components[ i ] > +b_components[ i ] ) {
                    return 1;
                }

                // B bigger than A
                if ( +a_components[ i ] < +b_components[ i ] )
                {
                    return -1;
                }
            }

            // If one's a prefix of the other, the longer one is greater.
            if ( a_components.length > b_components.length ) {
                return 1;
            }

            if ( a_components.length < b_components.length ) {
                return -1;
            }

            // Otherwise they are the same.
            return 0;
        },
        updateBuild: function( pkg, done ) {
            anvil.fs.transform( "./build.json", function( contents, transform ) {
                var build = JSON.parse( contents ),
                    libs, buildPkg;

                libs = (build[ "anvil.cdnjs" ] = build[ "anvil.cdnjs" ] || {
                    libs: {}
                }).libs;

                buildPkg = libs[ pkg.name ] = libs[ pkg.name ] || {};

                // If the current version is older than the version being installed.
                if (  _.isEmpty( buildPkg ) ||
                    ( buildPkg.version && this.compareVersion( pkg.version, buildPkg.version ) === 1 ) ) {
                    if ( !_.isEmpty( buildPkg ) ) {
                        buildPkg.history = buildPkg.history || [];

                        buildPkg.history.push({
                            version: pkg.version,
                            url: pkg.url
                        });
                    }

                    buildPkg.version = pkg.version;
                    buildPkg.url = pkg.url;
                }

                transform( JSON.stringify( build, null, 4 ) );
            }.bind( this ), "./build.json", function() {
                // All done...
                done();
            }.bind( this )); // anvil.fs.transform
        }
    });
};

module.exports = pluginFactory;