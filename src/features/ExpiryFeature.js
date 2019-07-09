import { createSelector } from 'redux-bundler'

export default class ExpiryFeature {
  static withInputOptions(inputOptions, { bundleKeys, baseActionTypeName }) {
    const {
      expireAfter = Infinity, // never
    } = inputOptions

    return new ExpiryFeature({
      expireAfter,
      bundleKeys,
      baseActionTypeName,
    })
  }

  #expiryEnabled = false
  #expireAfter = Infinity
  #bundleKeys = null
  #actions = null

  constructor({ expireAfter, bundleKeys, baseActionTypeName }) {
    this.#expiryEnabled = Boolean(expireAfter) && expireAfter !== Infinity
    this.#expireAfter = expireAfter
    this.#bundleKeys = bundleKeys
    this.#actions = {
      EXPIRED: `${baseActionTypeName}_EXPIRED`,
    }
  }

  enhanceReducer(originalReducer, { makeCleanState }) {
    return (originalState, action) => {
      const state = originalReducer(originalState, action)

      if (action.type === this.#actions.EXPIRED) {
        return makeCleanState(state)
      }

      return state
    }
  }

  enhanceBundle(bundle) {
    if (!this.#expiryEnabled) {
      return bundle
    }

    const { selectors, reactors } = this.#bundleKeys

    return {
      ...bundle,
      [reactors.shouldExpire]: createSelector(
        selectors.dataAt,
        'selectAppTime',
        (dataAt, appTime) => {
          if (dataAt && appTime - dataAt > this.#expireAfter) {
            return { type: this.#actions.EXPIRED }
          }
        }
      ),
    }
  }

  enhancePersistActions(persistActions) {
    return [...persistActions, this.#actions.EXPIRED]
  }
}
