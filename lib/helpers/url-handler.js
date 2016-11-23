/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */

function combineURLs(baseURL, relativeURL) {
  return `${baseURL.replace(/\/+$/, '')}/${relativeURL.replace(/^\/+/, '')}`;
}

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url); // eslint-disable-line
}

function formatURLs(baseUrl, relativeURL) {
  if (!baseUrl || isAbsoluteURL(relativeURL)) {
    return relativeURL;
  }

  return combineURLs(baseUrl, relativeURL);
}

module.exports = {
  format    : formatURLs,
  combine   : combineURLs,
  isAbsolute: isAbsoluteURL
};
