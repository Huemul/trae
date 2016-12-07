export default function(node, { type, value }) {
  if (type === 'comment') {
    // multiline comment
    return /Trae/i.test(value);
  }
}
