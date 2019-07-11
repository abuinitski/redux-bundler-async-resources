import { createSelector } from 'redux-bundler'

export default class StalingFeature {
  static addBundleConstants(builder) {
    builder
      .addSelector('isStale')
      .addActionCreator('doMarkAsStale', 'doMark:UPNAME:AsStale')
      .addReactor('shouldBecomeStale')
  }

  static withInputOptions(inputOptions, { bundleKeys, baseActionTypeName }) {
    const {
      staleAfter = 900000, // fifteen minutes
    } = inputOptions

    return new StalingFeature({
      staleAfter,
      bundleKeys,
      baseActionTypeName,
    })
  }

  #autoStaleEnabled = false
  #staleAfter = Infinity
  #bundleKeys = null
  #actions = null

  constructor({ staleAfter, bundleKeys, baseActionTypeName }) {
    this.#autoStaleEnabled = Boolean(staleAfter) && staleAfter !== Infinity
    this.#staleAfter = staleAfter
    this.#bundleKeys = bundleKeys
    this.#actions = {
      STALE: `${baseActionTypeName}_STALE`,
    }
  }

  makeCleanStaleState() {
    return { isStale: false }
  }

  enhanceCleanState(cleanState) {
    return {
      ...cleanState,
      ...this.makeCleanStaleState(),
    }
  }

  getActionHandlers() {
    return {
      [this.#actions.STALE]: state => ({
        ...state,
        isStale: true,
      }),
    }
  }

  enhanceBundle(bundle) {
    const { selectors, actionCreators, reactors } = this.#bundleKeys

    const enhancedBundle = {
      ...bundle,

      [selectors.isStale]: createSelector(
        selectors.raw,
        ({ isStale }) => isStale
      ),

      [actionCreators.doMarkAsStale]: () => ({ type: this.#actions.STALE }),
    }

    if (this.#autoStaleEnabled) {
      enhancedBundle[reactors.shouldBecomeStale] = createSelector(
        selectors.dataAt,
        selectors.isStale,
        'selectAppTime',
        (dataAt, isStale, appTime) => {
          if (!isStale && dataAt && appTime - dataAt > this.#staleAfter) {
            return { type: this.#actions.STALE }
          }
        }
      )
    }

    return enhancedBundle
  }
}
