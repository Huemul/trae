export default function(node, { type, value }) {
  if (type === 'comment2') {
    // multiline comment
    return /Trae/i.test(value);
  }
}
