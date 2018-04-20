// eslint-disable-next-line consistent-return
module.exports = (node, { type, value }) => {
  if (type === 'comment') {
    // multiline comment
    return /Trae/i.test(value)
  }
}
