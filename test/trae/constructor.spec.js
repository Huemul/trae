/* global describe it expect */

import trae from '../../lib'
import { version } from '../../package.json'

describe.only('trae', () => {
  it('exposes the version using the package.json', () => {
    expect(trae.version).toEqual(version)
  })

  it('exposes a singleton instance of Trae class with the default config', () => {
    expect(trae._baseUrl).toEqual('')
    expect(trae._middleware).toBeDefined()
    expect(trae._config).toBeDefined()
  })

  it('adds "Content-Type": "application/json" header to the methods with body', () => {
    expect(trae.defaults().post).toMatchSnapshot()
    expect(trae.defaults().patch).toMatchSnapshot()
    expect(trae.defaults().put).toMatchSnapshot()

    expect(trae.defaults().head).toBe(undefined)
    expect(trae.defaults().get).toBe(undefined)
    expect(trae.defaults().delete).toBe(undefined)
  })
})
