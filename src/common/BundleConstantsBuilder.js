import nameToCapitalizedCase from './nameToCapitalizedCase'

export default class BundleConstantsBuilder {
  #selectors = {}
  #keys = {}
  #actionCreators = {}
  #reactors = {}

  #name = null
  #upName = null

  constructor(name) {
    this.#name = name
    this.#upName = nameToCapitalizedCase(name)
  }

  addSelector(
    key,
    selectorTemplate = `select:UPNAME:${nameToCapitalizedCase(key)}`,
    keyTemplate = `:NAME:${nameToCapitalizedCase(key)}`
  ) {
    this.#selectors[key] = this.#interpolate(selectorTemplate)
    this.#keys[key] = this.#interpolate(keyTemplate)
    return this
  }

  addActionCreator(key, template = `${key}:UPNAME:`) {
    this.#actionCreators[key] = this.#interpolate(template)
    return this
  }

  addReactor(key, template = `react:UPNAME:${nameToCapitalizedCase(key)}`) {
    this.#reactors[key] = this.#interpolate(template)
    return this
  }

  buildBundleConstants() {
    return {
      selectors: this.#makeConstantsHash('selectors', this.#selectors),
      keys: this.#makeConstantsHash('keys', this.#keys),
      actionCreators: this.#makeConstantsHash('actionCreators', this.#actionCreators),
      reactors: this.#makeConstantsHash('reactors', this.#reactors),
    }
  }

  #interpolate(template) {
    return template.replace(/:NAME:/g, this.#name).replace(/:UPNAME:/g, this.#upName)
  }

  #makeConstantsHash(name, constants) {
    if (process.env.NODE_ENV === 'production') {
      return constants
    }

    return new Proxy(constants, {
      get(target, prop) {
        if (prop in target) {
          return target[prop]
        }

        throw new Error(
          `async resource constant "${name}.${prop}" was requested but not defined for this resource; this is internal error in library implementation`
        )
      },
    })
  }
}
