#!/usr/bin/env node

const { spawnSync } = require('child_process')
const { relative, resolve, join } = require('path')
const { readdirSync, statSync, readFileSync } = require('fs')
const { copySync, outputFileSync } = require('fs-extra')
const babel = require('@babel/core')
const chalk = require('chalk')
const minimatch = require('minimatch')

const { MODULE, LIB } = require('./env')

const { cyan, green, white } = chalk
const path = cyan
const log = (...args) => console.log(white.dim('transpile-js:'), ...args)

const [, , sourceFolder = 'src'] = process.argv
const moduleFolder = 'es'
const libFolder = 'lib'

const cwd = resolve('./')
const src = resolve(sourceFolder)
const mod = resolve(moduleFolder)
const lib = resolve(libFolder)

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

const partialConfig = babel.loadPartialConfig({ filename: resolve('./package.json') })
const useDefaultBabelConfig = !partialConfig.hasFilesystemConfig()

const rules = [
  ['**/*.test.js', () => {}, 'ignore'],
  [
    '**/*.js',
    (filename, relativePath) => {
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
    },
    'transpile'
  ],
  [
    '**/*',
    (file, relativePath) => {
      copySync(file, resolve(mod, relativePath))
      copySync(file, resolve(lib, relativePath))
    },
    'copy'
  ]
]

log(`Cleaning files from previous build (${path(moduleFolder)}, ${path(libFolder)}).`)
spawnSync('rm', ['-rf', moduleFolder, libFolder])

log(
  useDefaultBabelConfig
    ? `Babel config not found -> using default config.`
    : `Babel config found in ${path(relative(cwd, partialConfig.babelrc || partialConfig.config))}.`
)

for (const absolutePath of walkSync(src)) {
  const [, task, msg] = rules.find(rule => minimatch(absolutePath, rule[0]))
  const relativePath = relative(src, absolutePath)
  task(absolutePath, relativePath)
  log(`${path(relativePath)} ... ${msg}`)
}

log(`${green('√ Done.')} Sources are transpiled and ready for publishing.`)
