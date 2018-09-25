# transpile-js

Default Babel config and build scripts for other JavaScript packages

## Use

1. Install using:
    ```sh
    npm install @wisersolutions/transpile-js
    ```
1. Add a pre-publish task to `package.json` and set the entry points for the published package:
    ```json5
    {
      "main": "./lib/index.js",
      "module": "./es/index.js",
      "scripts": {
        "prepublishOnly": "transpile-js"
      }
    }
    ```
    (assuming your entry point is `src/index.js`).
1. Add `/es` and `/lib` to `.gitignore` and create (and populate if needed) a `.npmignore` file,
  so that the transpiled code isn't added to VCS, but it _is_ published.

If you need to customize Babel config, create a `babel.config.js` or `.babelrc.js` file in the root folder
of your package and extend the default config:

```javascript
const defaultConfig = require('@wisersolutions/transpile-js/babel.config')
module.exports = Object.assign(defaultConfig, { /* ... */ })
```

## Development

### Install

Install dependencies using:

```sh
npm install
```

### Develop

After you modify sources, run the following (or set up your IDE to do it for you):

- format the code using `npm run format`
- lint it using `npm run lint`

and fix the errors, if there are any.

### Publish

Publishing is done in two steps:

1. Create a new version tag and push it to the repository:
    ```sh
    npm version <patch|minor|major>
    git push --follow-tags
    ```
1. Build and publish the new version as a npm package:
    ```sh
    npm publish --access public
    ``` 
