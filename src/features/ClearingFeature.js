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

  getActionHandlers({ makeCleanState }) {
    return {
      [this.#actions.CLEARED]: state => makeCleanState(state),
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
