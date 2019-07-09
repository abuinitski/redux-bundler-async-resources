export default class Features {
  #features = []

  constructor(...features) {
    this.#features = features
  }

  enhanceCleanState(rootBundleInitialState, currentState = undefined) {
    return this.#enhance(rootBundleInitialState, 'enhanceCleanState', { currentState })
  }

  enhanceBundle(bundle) {
    return this.#enhance(bundle, 'enhanceBundle')
  }

  enhanceThunkArgs(thunkArgs) {
    return this.#enhance(thunkArgs, 'enhanceThunkArgs')
  }

  enhanceReducer(reducer, { rawInitialState }) {
    const makeCleanState = currentState => this.#enhance(rawInitialState, 'enhanceCleanState', currentState)
    return this.#enhance(reducer, 'enhanceReducer', { makeCleanState })
  }

  enhancePersistActions(persistActions) {
    return this.#enhance(persistActions, 'enhancePersistActions')
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
