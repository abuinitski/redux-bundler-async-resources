import { createSelector } from 'redux-bundler'

export default class RetryFeature {
  static addBundleConstants(builder) {
    builder.addSelector('error')
    builder.addSelector('errorIsPermanent')
    builder.addSelector('hasError')
    builder.addSelector('isReadyForRetry')
    builder.addSelector('errorAt')
    builder.addSelector('retryAt')
  }

  static withInputOptions(inputOptions, { bundleKeys, baseActionTypeName }) {
    const {
      retryAfter = 15000, // 15 seconds
    } = inputOptions

    return new RetryFeature({
      retryAfter,
      bundleKeys,
      baseActionTypeName,
    })
  }

  #autoRetryEnabled = false
  #retryAfter = Infinity
  #bundleKeys = null

  constructor({ retryAfter, bundleKeys }) {
    this.#autoRetryEnabled = Boolean(retryAfter) && retryAfter !== Infinity
    this.#retryAfter = retryAfter
    this.#bundleKeys = bundleKeys
  }

  makeCleanErrorState() {
    return {
      error: null,
      errorIsPermanent: false,
      errorAt: null,
    }
  }

  makeNewErrorState(error, errorAt) {
    return {
      error,
      errorIsPermanent: Boolean(error && error.permanent),
      errorAt,
    }
  }

  enhanceCleanState(cleanState) {
    return {
      ...cleanState,
      ...this.makeCleanErrorState(),
    }
  }

  enhanceBundle(bundle) {
    const { selectors } = this.#bundleKeys

    return {
      ...bundle,

      [selectors.error]: createSelector(
        selectors.raw,
        ({ error }) => error
      ),

      [selectors.errorAt]: createSelector(
        selectors.raw,
        ({ errorAt }) => errorAt
      ),

      [selectors.errorIsPermanent]: createSelector(
        selectors.raw,
        ({ errorIsPermanent }) => errorIsPermanent
      ),

      [selectors.hasError]: createSelector(
        selectors.errorAt,
        errorAt => Boolean(errorAt)
      ),

      [selectors.retryAt]: this.#autoRetryEnabled
        ? createSelector(
            selectors.errorAt,
            selectors.errorIsPermanent,
            (errorAt, errorIsPermanent) => {
              if (!errorAt || errorIsPermanent) {
                return null
              }
              return errorAt + this.#retryAfter
            }
          )
        : () => null,

      [selectors.isReadyForRetry]: this.#autoRetryEnabled
        ? createSelector(
            selectors.retryAt,
            'selectAppTime',
            (retryAt, appTime) => {
              if (!retryAt) {
                return false
              }
              return appTime > retryAt
            }
          )
        : () => false,
    }
  }
}
