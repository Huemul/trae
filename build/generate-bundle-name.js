module.exports = (format, isProd) => {
  if (format === 'cjs') {
    return 'trae';
  }
  return isProd ? 'trae.umd.min' : 'trae.umd';
};
