import { createSelector } from 'redux-bundler'

import makeAsyncResourceBundleKeys from './makeAsyncResourceBundleKeys'

const Defaults = {
  name: undefined, // required
  getPromise: undefined, // required
  actionBaseType: null, // ${toUnderscoreCase(name)}
  retryAfter: 60000, // one minute,
  staleAfter: 900000, // fifteen minutes
  expireAfter: Infinity,
  persist: true,
}

const InitialState = {
  isLoading: false,

  data: undefined,
  dataAt: null,
  isStale: false,

  error: null,
  errorAt: null,
  errorPermanent: false,
  isReadyForRetry: false,
}

export default function createAsyncResourceBundle(inputOptions) {
  const { name, getPromise, actionBaseType, retryAfter, expireAfter, staleAfter, persist } = cookOptionsWithDefaults(
    inputOptions
  )

  const baseType = actionBaseType || toUnderscoreCase(name)

  const expireEnabled = expireAfter && expireAfter !== Infinity
  const staleEnabled = staleAfter && staleAfter !== Infinity
  const retryEnabled = retryAfter && retryAfter !== Infinity

  const { selectors, actionCreators, reactors } = makeAsyncResourceBundleKeys(name)

  const actions = {
    STARTED: `${baseType}_FETCH_STARTED`,
    FINISHED: `${baseType}_FETCH_FINISHED`,
    FAILED: `${baseType}_FETCH_FAILED`,
    CLEARED: `${baseType}_CLEARED`,
    STALE: `${baseType}_STALE`,
    EXPIRED: `${baseType}_EXPIRED`,
    READY_FOR_RETRY: `${baseType}_READY_FOR_RETRY`,
    ADJUSTED: `${baseType}_ADJUSTED`,
  }

  const bundle = {
    name,

    reducer: (state = InitialState, { type, payload }) => {
      if (type === actions.STARTED) {
        return {
          ...state,
          isLoading: true,
        }
      }

      if (type === actions.FINISHED) {
        return {
          ...state,

          isLoading: false,

          data: payload,
          dataAt: Date.now(),
          isStale: false,

          error: null,
          errorAt: null,
          errorPermanent: false,
          isReadyForRetry: false,
        }
      }

      if (type === actions.FAILED) {
        return {
          ...state,

          isLoading: false,

          error: payload,
          errorAt: Date.now(),
          errorPermanent: Boolean(payload.permanent),
          isReadyForRetry: false,
        }
      }

      if (type === actions.CLEARED || type === actions.EXPIRED) {
        return InitialState
      }

      if (type === actions.STALE) {
        return {
          ...state,
          isStale: true,
        }
      }

      if (type === actions.READY_FOR_RETRY) {
        return {
          ...state,
          isReadyForRetry: true,
        }
      }

      if (type === actions.ADJUSTED) {
        if (!state.dataAt) {
          return state
        }

        if (typeof payload === 'function') {
          return {
            ...state,
            data: payload(state.data),
          }
        }

        return {
          ...state,
          data: payload,
        }
      }

      return state
    },

    [selectors.raw]: state => state[name],

    [selectors.data]: createSelector(
      selectors.raw,
      ({ data }) => data
    ),

    [selectors.isPresent]: createSelector(
      selectors.raw,
      ({ dataAt }) => Boolean(dataAt)
    ),

    [selectors.isLoading]: createSelector(
      selectors.raw,
      ({ isLoading }) => isLoading
    ),

    [selectors.error]: createSelector(
      selectors.raw,
      ({ error }) => error
    ),

    [selectors.isReadyForRetry]: createSelector(
      selectors.raw,
      ({ isReadyForRetry }) => isReadyForRetry
    ),

    [selectors.retryAt]: createSelector(
      selectors.raw,
      ({ errorAt, errorPermanent }) => {
        if (!errorAt || errorPermanent || !retryEnabled) {
          return null
        }
        return errorAt + retryAfter
      }
    ),

    [selectors.errorIsPermanent]: createSelector(
      selectors.raw,
      ({ errorPermanent }) => errorPermanent
    ),

    [selectors.isStale]: createSelector(
      selectors.raw,
      ({ isStale }) => isStale
    ),

    [selectors.isPendingForFetch]: createSelector(
      selectors.raw,
      ({ isLoading, errorAt, isReadyForRetry, isStale, dataAt }) => {
        if (isLoading) {
          return false
        }

        if (errorAt) {
          return isReadyForRetry
        }

        return isStale || !dataAt
      }
    ),

    [actionCreators.doFetch]: () => thunkArgs => {
      const { dispatch } = thunkArgs
      dispatch({ type: actions.STARTED })

      return getPromise(thunkArgs).then(
        payload => {
          dispatch({ type: actions.FINISHED, payload })
        },
        error => {
          dispatch({ type: actions.FAILED, payload: error })
        }
      )
    },

    [actionCreators.doClear]: () => ({ type: actions.CLEARED }),

    [actionCreators.doMarkAsStale]: () => ({ type: actions.STALE }),

    [actionCreators.doAdjust]: payload => ({ type: actions.ADJUSTED, payload }),

    persistActions: (persist && [actions.FINISHED, actions.CLEARED, actions.EXPIRED]) || null,
  }

  if (expireEnabled) {
    bundle[reactors.shouldExpire] = createSelector(
      selectors.raw,
      'selectAppTime',
      ({ dataAt }, appTime) => {
        if (dataAt && appTime - dataAt > expireAfter) {
          return { type: actions.EXPIRED }
        }
      }
    )
  }

  if (retryEnabled) {
    bundle[reactors.shouldRetry] = createSelector(
      selectors.retryAt,
      selectors.isReadyForRetry,
      'selectAppTime',
      (retryAt, isReadyForRetry, appTime) => {
        if (!isReadyForRetry && retryAt && appTime >= retryAt) {
          return { type: actions.READY_FOR_RETRY }
        }
      }
    )
  }

  if (staleEnabled) {
    bundle[reactors.shouldBecomeStale] = createSelector(
      selectors.raw,
      'selectAppTime',
      ({ dataAt, isStale }, appTime) => {
        if (!isStale && dataAt && appTime - dataAt > staleAfter) {
          return { type: actions.STALE }
        }
      }
    )
  }

  return bundle
}

function cookOptionsWithDefaults(options) {
  if (process.env.NODE_ENV !== 'production') {
    const { name, getPromise } = options

    if (!name) {
      throw new Error('createAsyncResourceBundle: name parameter is required')
    }

    if (!getPromise) {
      throw new Error('createAsyncResourceBundle: getPromise parameter is required')
    }
  }

  return Object.assign({}, Defaults, options)
}

function toUnderscoreCase(input) {
  return input
    .replace(/\.?([A-Z]+)/g, (x, y) => '_' + y.toLowerCase())
    .replace(/^_/, '')
    .toUpperCase()
}
