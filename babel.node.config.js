// Transpilação dos testes Node (shared e functions). A checagem de tipos fica com `tsc --noEmit`.
module.exports = {
  babelrc: false,
  configFile: false,
  presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
};
