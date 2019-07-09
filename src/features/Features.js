export default class Features {
  #features = []

  constructor(...features) {
    this.#features = features
  }

  enhanceInitialState(initialState) {
    return this.#enhance(initialState, 'enhanceInitialState')
  }

  enhanceBundle(bundle) {
    return this.#enhance(bundle, 'enhanceBundle')
  }

  enhanceThunkArgs(thunkArgs) {
    return this.#enhance(thunkArgs, 'enhanceThunkArgs')
  }

  enhanceReducer(reducer, { initialState }) {
    return this.#enhance(reducer, 'enhanceReducer', { initialState })
  }

  #enhance(something, enhanceMethodName, enhanceArgs) {
    return this.#features.reduce((result, feature) => {
      if (!feature[enhanceMethodName]) {
        return result
      }
      return feature[enhanceMethodName](result, enhanceArgs)
    }, something)
  }
}
