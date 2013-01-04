anvil.cdnjs
===========

anvil.js plugin for installing files from cdnjs

To install, run...

```bash
anvil install anvil.cdnjs
```

### Searching
To search for a package to install...

```bash
anvil --cdjs:search [packageName]
```

This will return a list of the packages matching **packageName**

### Installing
There are two ways to install a library.

One way is to install them individually by running...

```bash
anvil --cdnjs:install jquery
```

The other way is by working with the `build.json` file.

```js
{
	"anvil.cdnjs": {
		"libs":{
			"jquery": {},
			"backbone.js": {},
			"underscore.js": {}
		}
	}
}
```

Then run...

```bash
anvil --cdnjs:install
```

When installing individually or by the build.json way, the build file will be updated with metadata from cdnjs.

```js
{
    "anvil.cdnjs": {
        "libs": {
            "jquery": {
                "version": "1.8.3",
                "url": "http://cdnjs.cloudflare.com/ajax/libs/jquery/1.8.3/jquery.min.js"
            },
            "knockout": {
                "version": "2.2.0",
                "url": "http://cdnjs.cloudflare.com/ajax/libs/knockout/2.2.0/knockout-min.js"
            },
            "backbone.js": {
                "version": "0.9.9",
                "url": "http://cdnjs.cloudflare.com/ajax/libs/backbone.js/0.9.9/backbone-min.js"
            },
            "underscore.js": {
                "version": "1.4.3",
                "url": "http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.3/underscore-min.js"
            }
        }
    }
}
```

### Configuring
You can configure where the libraries are installed by setting the output variable.

```js
{
	"anvil.cdnjs": {
		"output": "src/js/vendor"
	}
}
```