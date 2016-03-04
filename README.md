# delivery-packer

JavaScript lightweight delivery artifact creator. 
This module is available as node module, <a href='#command-line-interface'>command line interface</a> and <a href='#grunt-plugin'>grunt plugin</a>.

<p/>
<img src="https://nodei.co/npm/delivery-packer.png?downloads=true&stars=true" alt=""/>

<p/>
<img src="https://david-dm.org/msg-systems/delivery-packer.png" alt=""/>

## Modules purpose

This module is used to create delivery artifacts (meaning combined JavaScript and CSS files).
The input for the delivery artifacts are `delivery.yaml` files that contain a description of the single `delivery parts` and the proper packaging instructions (`build order`).

The purpose is simply explained with an amazon metapher:

- We want to get products (single JavaScript libraries) from amazon (`delivery-packer`)
- So we build a shopping cart (`delivery.yaml`)
- in the shopping cart we reference to single products (`delivery parts`)
- at last we want to get our delivery

now it is amazons (`delivery-packer`) turn

- check the shopping cart (`delivery.yaml`) for legal products (`delivery parts`)
- bundle the delivery packages in the proper packaging order (`build order`)
- bundle the order in one or more deliveries
	-  one deliverable for JavaScript
	-  one for CSS
	-  and any assets (images, fonts, etc.) used by the single products

 
## Command Line Interface

The cli of `delivery-packer` encapsules the node module. The tool has the following interface:

```shell
deliveryPacker: USAGE: deliveryPacker [options] arguments
options:
    -V, --version               Print tool version and exit.
    -h, --help                  Print this help and exit.
    -v, --verbose               Print verbose processing information.
    -d ARG, --outputFolder=ARG  Output folder for the created delivery.
    -a ARG, --assetsFolder=ARG  Output assets folder for the created delivery.
    -R, --listreg               List all registered delivery parts.
    -B, --listbld               List delivery build order.
    -U, --listunused            List unused registered delivery parts.
    -p ARG, --outputPrefix=ARG  Output file prefix for the delivery.
    -m, --minimize              Minimize the delivery.
```

## Grunt Plugin

The grunt plugin requires Grunt `>=0.4.0` and  encapsules the node module. 

If you haven't used [Grunt](http://gruntjs.com/)
before, be sure to check out the [Getting
Started](http://gruntjs.com/getting-started) guide, as it explains how
to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as
install and use Grunt plugins. Once you're familiar with that process,
you may install this plugin with this command:

```shell
npm install delivery-packer --save-dev
```

Once the plugin has been installed, it may be enabled inside your
Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('delivery-packer');
```

### deliveryPacker Task

_Run this task with the `grunt deliveryPacker` command._

Since this task is creating possibly more then one output delivery artifact it is not using the grunt files and options as used by grunt. We specify the output using the task options below. The tasks input is a file or directory directing to the initial `delivery.yaml` file.

### Task Options
<table>
	<tr>
		<th>Option</th>
		<th>Default value</th>
		<th>Description</th>
	</tr>
	<tr>
		<td>listreg</td>
		<td>false</td>
		<td>List all registered delivery parts.</td>
	</tr>
	<tr>
		<td>listbld</td>
		<td>false</td>
		<td>List delivery build order.</td>
	</tr>
	<tr>
		<td>listunused</td>
		<td>false</td>
		<td>List unused registered delivery parts.</td>
	</tr>
	<tr>
		<td>minimize</td>
		<td>false</td>
		<td>Minimize the delivery using uglify and cssmin</td>
	</tr>
	<tr>
		<td>prefix</td>
		<td>"lib"</td>
		<td>Output file prefix for the delivery.</td>
	</tr>
	<tr>
		<td>outputFolder</td>
		<td>"bld"</td>
		<td>Output folder for the created delivery.</td>
	</tr>
	<tr>
		<td>assetsFolder</td>
		<td>"assets"</td>
		<td>Output assets folder for the created delivery.</td>
	</tr>
</table>

### Task Example

```grunt
    grunt.initConfig({
        deliveryPacker: {
            "all": {
                src: ["."],
                options: {
                    listreg: true,
                    listbld: true,
                    listunused: true,
                    minimize: true,
                    outputFolder: "www/foo",
                    outputPrefix: "bar",
                    assetsFolder: "quux"
                }
            }
        }
    });

```

## delivery.yaml

The `delivery.yaml` file defines the content and the order of the delivery. Since a single `delivery part` might be assembled out of different files the `delivery.yaml` works with alias names for the `delivery parts`. In order to get the artifact delivery order (`build`) work correctly the `delivery parts` must be `registered` with its alias name. The `delivery.yaml` therefore is able to `import` the `delivery parts`.  

### Importing Delivery Parts

An `import` for a `delivery Part` is done within the `delivery.yaml` using a collection within the `import` attribute. 

You can `import` using 
- a glob pattern like `- deliveryParts/**/*.yaml`. In this case a list of files will be imported.
- a node module name `- lodash`. In this case the import looks for a `delivery.yaml` inside the node modules root.
   
### Delivery Build Order

The building order of each `delivery part` is specified within the `delivery.yaml` using a collection within the `build` attribute.

The build order entries reference registered alias names. Due to the `import` functionality the `delivery.yaml` files can be hierarchically and a build order is built sequentially in the order of the 'build' attributes appearances.   

A `delivery part` in the build order can be excluded by later `build` entries using an exclamation mark `!`. Unfortunatly that mark has a meaning in YAML files so we have to wrap the excluded `delivery part` in quotes inside the `delivery.yaml`. 

### Example delivery.yaml

The following example imports all `delivery part` files with the given glob pattern and builds a delivery artifact with the given build order. The alias names for `jquery`, `lodash`, `moment` and `font-awesome` must have been defined in the imported `delivery parts`.

```yaml
import:
# use the glob pattern to import other delivery parts
- deliveryParts/**/*.yaml
# use a node module name to import that modules delivery.yaml (it might contain its own build order)
- lodash

build:
# exclude lodash, since the import already added it to the build order. Quotes around !lodash required.
- "!lodash"
# add jquery first
- jquery
# then readd the lodash part in a different build order - after jquery
- lodash
- moment
- font-awesome
```

## deliveryPart.yaml

Registering a `delivery part` is necessary in order to use it in the delivery artifact creation. The `deliveryPart.yaml` register those alias names. 

### Delivery Part Registration

Inside a `deliveryPart.yaml` the `register` attribute allows the specification of any alias name. That name should be unique in the delivery creation process. Within the defined alias name we can specify the connected `JS`, `CSS`  and `MARKUP` files. Files are defined as a collection using the `-` in the yaml.

The `CSS` files can be simple strings or an object with `name` and `ASSETS` attribute. The `ASSETS` should be a list of assets used within the CSS file. Those assets will be copied to a folder equal to the registered alias name within the given asset output folder.  

### Example deliveryPart.yaml

The `delivery part` example registers the `font-awesome` alias and defines the subparts of the single `delivery part`. Font-Awesome only works when its CSS and Fonts are included in the created delivery artifacts.  

```yaml
register:
  # register 'jquery' and direct to its JS file using simple string style
  jquery:
    JS:
    - ../../node_modules/jquery/dist/jquery.js
  # register 'bootstrap' and direct to all of its JS files using multipe strings
  bootstrap:
    JS:
    - ../lib/bootstrap/js/affix.js
    - ../lib/bootstrap/js/alert.js
    - ../lib/bootstrap/js/button.js
    - ../lib/bootstrap/js/carousel.js
    - ../lib/bootstrap/js/collapse.js
    - ../lib/bootstrap/js/dropdown.js
    - ../lib/bootstrap/js/modal.js
    - ../lib/bootstrap/js/tooltip.js
    - ../lib/bootstrap/js/popover.js
    - ../lib/bootstrap/js/scrollspy.js
    - ../lib/bootstrap/js/tab.js
    - ../lib/bootstrap/js/transition.js
  # register 'normalize.css' and direct to its CSS file using simple string style 
  normalize.css:
    CSS:
    - ../../node_modules/normalize.css/normalize.css
  # register 'font-awesome' and direct to its CSS file - including its ASSETS - using object style 
  font-awesome:
    CSS:
    - name: ../node_modules/font-awesome/css/font-awesome.css
      ASSETS:
      - ../node_modules/font-awesome/fonts/FontAwesome.otf
      - ../node_modules/font-awesome/fonts/fontawesome-webfont.eot
      - ../node_modules/font-awesome/fonts/fontawesome-webfont.svg
      - ../node_modules/font-awesome/fonts/fontawesome-webfont.ttf
      - ../node_modules/font-awesome/fonts/fontawesome-webfont.woff
      - ../node_modules/font-awesome/fonts/fontawesome-webfont.woff2
```