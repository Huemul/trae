/* global describe it expect */

import trae from '../../lib';

describe('trae', () => {
  it('exposed as a singleton instance of Trae class with the default config', () => {
    expect(trae._baseUrl).toEqual('');
    expect(trae._middleware).toBeDefined();
    expect(trae._config).toBeDefined();
  });
});
