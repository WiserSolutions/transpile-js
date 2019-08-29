#!/usr/bin/env node

const { spawnSync } = require('child_process')
const { relative, resolve } = require('path')
const { readFileSync } = require('fs')
const { copySync, outputFileSync } = require('fs-extra')
const babel = require('@babel/core')
const chalk = require('chalk')
const minimatch = require('minimatch')
const parseArgs = require('minimist')
const { walkSync } = require('@hon2a/walk-sync')
const escapeRegExp = require('lodash.escaperegexp')

const { MODULE, LIB } = require('./env')

//region Config

const { cyan, green, red, white } = chalk
const path = cyan

const {
  _: [sourceFolder = 'src'],
  verbose,
  extensions
} = parseArgs(process.argv.slice(2), { boolean: ['verbose'], string: ['extensions'], default: { extensions: '.js' } })
const moduleFolder = 'es'
const libFolder = 'lib'

const cwd = resolve('./')
const src = resolve(sourceFolder)
const mod = resolve(moduleFolder)
const lib = resolve(libFolder)

const partialConfig = babel.loadPartialConfig({ filename: resolve('./package.json') })
const useDefaultBabelConfig = !partialConfig.hasFilesystemConfig()

//endregion
//region Helpers

const log = (...args) => console.log(white.dim('transpile-js:'), ...args) // eslint-disable-line no-console

const extensionRegExp = new RegExp(
  `(?:${extensions
    .split(',')
    .map(escapeRegExp)
    .join('|')})$`
)
function transpileJs(filename, relativePath) {
  const outputPath = relativePath.replace(extensionRegExp, '.js')
  const code = readFileSync(filename, 'utf8')
  const { ast } = babel.transformSync(code, {
    filename,
    // `modules: false` apparently needs to be set in both the AST parsing and the code transform steps.
    // If it's missing in either one, ES6 module statements (import/export) get transformed.
    envName: MODULE,
    ast: true,
    code: false,
    configFile: useDefaultBabelConfig ? resolve(__dirname, 'babel.config.js') : undefined
  })

  const { code: moduleCode } = babel.transformFromAstSync(ast, code, {
    filename,
    envName: MODULE,
    sourceMaps: false
  })
  outputFileSync(resolve(mod, outputPath), moduleCode)

  const { code: libCode } = babel.transformFromAstSync(ast, code, { filename, envName: LIB, sourceMaps: false })
  outputFileSync(resolve(lib, outputPath), libCode)
}

function copyAsset(filename, relativePath) {
  copySync(filename, resolve(mod, relativePath))
  copySync(filename, resolve(lib, relativePath))
}

//endregion
//region Script

log(`Cleaning files from previous build (${path(moduleFolder)}, ${path(libFolder)}).`)
spawnSync('rm', ['-rf', moduleFolder, libFolder])

log(
  useDefaultBabelConfig
    ? `Babel config not found -> using default config.`
    : `Babel config found in ${path(relative(cwd, partialConfig.babelrc || partialConfig.config))}.`
)

const ignore = [`**/*.test${extensions}`, `**/*.test${extensions}.snap`]
const rules = [[`**/*${extensions}`, transpileJs, 'transpiled'], ['**/*', copyAsset, 'copied']]
let processedCount = 0
try {
  for (const absolutePath of walkSync(src)) {
    const [, task, msg = 'ignored'] =
      (!ignore.find(glob => minimatch(absolutePath, glob)) && rules.find(rule => minimatch(absolutePath, rule[0]))) ||
      []
    const relativePath = relative(src, absolutePath)
    if (task) {
      task(absolutePath, relativePath)
      ++processedCount
    }
    if (verbose) log(`${path(relativePath)} ... ${msg}`)
  }
} catch (e) {
  log(`${red('✖ Failed.')}\n${e.message ? `${e.name}: ${e.message}` : e}`)
  process.exit(1)
}

log(`${green('√ Done.')} ${processedCount} sources are ready for publishing.`)

//endregion
