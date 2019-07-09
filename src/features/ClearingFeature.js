export default class ClearingFeature {
  #bundleKeys = {}
  #actions = {}

  static addBundleConstants(builder) {
    builder.addActionCreator('doClear')
  }

  static withInputOptions(inputOptions, { bundleKeys, baseActionTypeName }) {
    return new ClearingFeature({ bundleKeys, baseActionTypeName })
  }

  constructor({ bundleKeys, baseActionTypeName }) {
    this.#bundleKeys = bundleKeys

    this.#actions = {
      CLEARED: `${baseActionTypeName}_CLEARED`,
    }
  }

  enhanceReducer(originalReducer, { makeCleanState }) {
    return (originalState, action) => {
      const state = originalReducer(originalState, action)

      if (action.type === this.#actions.CLEARED) {
        return makeCleanState(state)
      }

      return state
    }
  }

  enhanceBundle(bundle) {
    const { actionCreators } = this.#bundleKeys

    return {
      ...bundle,
      [actionCreators.doClear]: () => ({ type: this.#actions.CLEARED }),
    }
  }

  enhancePersistActions(persistActions) {
    return [...persistActions, this.#actions.CLEARED]
  }
}
