module.exports = (n, f) => {
  const name = n.replace('.js', '').replace('lib/', '')
  const format = f === 'cjs' ? '' : '.umd'

  return `dist/${name}${format}.js`
}
