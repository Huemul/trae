module.exports = (version, contributors) => {
  const banner = `/**
  * Trae, the fetch library!
  *
  * @version: ${version}
  * @authors: ${contributors.join(', ')}
  */`

  return banner
}
