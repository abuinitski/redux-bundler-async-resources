import { createSelector } from 'redux-bundler'

import makeAsyncResourceBundleKeys from './makeAsyncResourceBundleKeys'
import { nameToUnderscoreCase } from './common/nameToUnderscoreCase'
import ResourceDependenciesFeature from './features/ResourceDependenciesFeature'
import Features from './features/Features'

const Defaults = {
  name: undefined, // required
  getPromise: undefined, // required
  actionBaseType: null, // ${toUnderscoreCase(name)}
  retryAfter: 60000, // one minute,
  staleAfter: 900000, // fifteen minutes
  expireAfter: Infinity,
  persist: true,
  dependencyKey: null,
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

  const baseActionTypeName = actionBaseType || nameToUnderscoreCase(name)

  const bundleKeys = makeAsyncResourceBundleKeys(name)
  const { selectors, actionCreators, reactors } = bundleKeys

  const features = new Features(
    ResourceDependenciesFeature.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys })
  )

  const enhancedInitialState = features.enhanceInitialState(InitialState)

  const expireEnabled = expireAfter && expireAfter !== Infinity
  const staleEnabled = staleAfter && staleAfter !== Infinity
  const retryEnabled = retryAfter && retryAfter !== Infinity

  const actions = {
    STARTED: `${baseActionTypeName}_FETCH_STARTED`,
    FINISHED: `${baseActionTypeName}_FETCH_FINISHED`,
    FAILED: `${baseActionTypeName}_FETCH_FAILED`,
    CLEARED: `${baseActionTypeName}_CLEARED`,
    STALE: `${baseActionTypeName}_STALE`,
    EXPIRED: `${baseActionTypeName}_EXPIRED`,
    READY_FOR_RETRY: `${baseActionTypeName}_READY_FOR_RETRY`,
    ADJUSTED: `${baseActionTypeName}_ADJUSTED`,
  }

  const reducer = (state = enhancedInitialState, { type, payload }) => {
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
      return enhancedInitialState
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
  }

  const bundle = {
    name,

    reducer: features.enhanceReducer(reducer, { initialState: enhancedInitialState }),

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
      selectors.error,
      selectors.isPresent,
      selectors.isStale,
      selectors.isLoading,
      selectors.isReadyForRetry,
      selectors.isDependencyResolved,
      (error, isPresent, isStale, isLoading, isReadyForRetry, isDependencyResolved) => {
        if (!isDependencyResolved || isLoading) {
          return false
        }

        if (error) {
          return isReadyForRetry
        }

        return isStale || !isPresent
      }
    ),

    [actionCreators.doFetch]: () => thunkArgs => {
      const { dispatch } = thunkArgs
      dispatch({ type: actions.STARTED })

      const enhancedThunkArgs = features.enhanceThunkArgs(thunkArgs)

      return getPromise(enhancedThunkArgs).then(
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

  return features.enhanceBundle(bundle)
}

function cookOptionsWithDefaults(inputOptions) {
  if (process.env.NODE_ENV !== 'production') {
    const { name, getPromise } = inputOptions

    if (!name) {
      throw new Error('createAsyncResourceBundle: name parameter is required')
    }

    if (!getPromise) {
      throw new Error('createAsyncResourceBundle: getPromise parameter is required')
    }
  }

  return { ...Defaults, ...inputOptions }
}
