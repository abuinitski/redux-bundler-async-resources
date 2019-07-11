export default class Features {
  #features = []

  constructor(features) {
    this.#features = features
  }

  enhanceCleanState(rawInitialState, currentState = undefined) {
    return this.#enhance(rawInitialState, 'enhanceCleanState', currentState)
  }

  enhanceBundle(bundle) {
    return this.#enhance(bundle, 'enhanceBundle')
  }

  enhanceThunkArgs(thunkArgs) {
    return this.#enhance(thunkArgs, 'enhanceThunkArgs')
  }

  enhanceActionHandlers(actionHandlers, { rawInitialState }) {
    const makeCleanState = currentState => this.enhanceCleanState(rawInitialState, currentState)
    const getActionHandlersArgs = { makeCleanState }

    return this.#features.reduce(
      (actionHandlers, feature) => ({
        ...actionHandlers,
        ...(feature.getActionHandlers && feature.getActionHandlers(getActionHandlersArgs)),
      }),
      actionHandlers
    )
  }

  enhancePersistActions(persistActions) {
    return this.#enhance(persistActions, 'enhancePersistActions')
  }

  #enhance(something, enhanceMethodName, ...enhanceMethodArgs) {
    return this.#features.reduce((result, feature) => {
      if (!feature[enhanceMethodName]) {
        return result
      }
      return feature[enhanceMethodName](result, ...enhanceMethodArgs)
    }, something)
  }
}
