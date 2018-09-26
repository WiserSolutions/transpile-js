#!/usr/bin/env node

const { spawnSync } = require('child_process')
const { relative, resolve, join } = require('path')
const { readdirSync, statSync, readFileSync } = require('fs')
const { copySync, outputFileSync } = require('fs-extra')
const babel = require('@babel/core')
const chalk = require('chalk')
const minimatch = require('minimatch')
const parseArgs = require('minimist')

const { MODULE, LIB } = require('./env')

//region Config

const { cyan, green, red, white } = chalk
const path = cyan

const {
  _: [sourceFolder = 'src'],
  verbose
} = parseArgs(process.argv.slice(2), { boolean: ['verbose'] })
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

function* walkSync(dir) {
  const files = readdirSync(dir)
  for (const file of files) {
    const pathToFile = join(dir, file)
    if (statSync(pathToFile).isDirectory()) {
      yield* walkSync(pathToFile)
    } else {
      yield pathToFile
    }
  }
}

function transpileJs(filename, relativePath) {
  const code = readFileSync(filename, 'utf8')
  const { ast } = babel.transformSync(code, {
    filename,
    ast: true,
    code: false,
    configFile: useDefaultBabelConfig ? resolve(__dirname, 'babel.config.js') : undefined
  })

  const { code: moduleCode } = babel.transformFromAstSync(ast, code, {
    filename,
    envName: MODULE,
    sourceMaps: false
  })
  outputFileSync(resolve(mod, relativePath), moduleCode)

  const { code: libCode } = babel.transformFromAstSync(ast, code, { filename, envName: LIB, sourceMaps: false })
  outputFileSync(resolve(lib, relativePath), libCode)
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

const ignore = ['**/*.test.js']
const rules = [['**/*.js', transpileJs, 'transpiled'], ['**/*', copyAsset, 'copied']]
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