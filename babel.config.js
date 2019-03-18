const { MODULE } = require('./env')

module.exports = api => ({
  presets: [
    [
      '@babel/preset-env',
      {
        // when transpiling as ES6 module, import only used polyfills...
        useBuiltIns: api.env(MODULE) ? 'usage' : false,
        // ...and don't transpile import/export statements
        modules: api.env(MODULE) ? false : 'commonjs'
      }
    ],
    '@babel/preset-react'
  ],
  plugins: [
    // ES next transforms
    [
      '@babel/plugin-transform-runtime',
      {
        regenerator: true
      }
    ],
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-syntax-import-meta',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-json-strings',
    [
      '@babel/plugin-proposal-decorators',
      {
        legacy: true
      }
    ],
    '@babel/plugin-proposal-function-sent',
    '@babel/plugin-proposal-export-namespace-from',
    '@babel/plugin-proposal-numeric-separator',
    '@babel/plugin-proposal-throw-expressions',
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-logical-assignment-operators',
    '@babel/plugin-proposal-optional-chaining',
    [
      '@babel/plugin-proposal-pipeline-operator',
      {
        proposal: 'minimal'
      }
    ],
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-do-expressions',
    '@babel/plugin-proposal-function-bind',

    // custom transforms
    'styled-components'
  ]
})
