import { createSelector } from 'redux-bundler'

import makeAsyncResourceBundleKeys from './makeAsyncResourceBundleKeys'
import { nameToUnderscoreCase } from './common/nameToUnderscoreCase'
import ResourceDependenciesFeature from './features/ResourceDependenciesFeature'
import Features from './features/Features'
import cookOptionsWithDefaults from './common/cookOptionsWithDefaults'
import StalingFeature from './features/StalingFeature'
import ExpiryFeature from './features/ExpiryFeature'
import ClearingFeature from './features/ClearingFeature'

const Defaults = {
  persist: true,
}

const InitialState = {
  isLoading: false,

  data: undefined,
  dataAt: null,

  error: null,
  errorAt: null,
  errorPermanent: false,
  isReadyForRetry: false,
}

export const AsyncResourceBundleFeatures = [ResourceDependenciesFeature, StalingFeature, ExpiryFeature, ClearingFeature]

export default function createAsyncResourceBundle(inputOptions) {
  const { name, getPromise, actionBaseType, retryAfter, persist } = cookOptionsWithDefaults(inputOptions, Defaults)

  const baseActionTypeName = actionBaseType || nameToUnderscoreCase(name)

  const bundleKeys = makeAsyncResourceBundleKeys(name)
  const { selectors, actionCreators, reactors } = bundleKeys

  const features = new Features(
    ResourceDependenciesFeature.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys }),
    StalingFeature.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys }),
    ExpiryFeature.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys }),
    ClearingFeature.withInputOptions(inputOptions, { bundleKeys, baseActionTypeName })
  )

  const enhancedInitialState = features.enhanceCleanState(InitialState)

  const retryEnabled = retryAfter && retryAfter !== Infinity

  const actions = {
    STARTED: `${baseActionTypeName}_FETCH_STARTED`,
    FINISHED: `${baseActionTypeName}_FETCH_FINISHED`,
    FAILED: `${baseActionTypeName}_FETCH_FAILED`,
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

    reducer: features.enhanceReducer(reducer, { rawInitialState: InitialState }),

    [selectors.raw]: state => state[name],

    [selectors.data]: createSelector(
      selectors.raw,
      ({ data }) => data
    ),

    [selectors.dataAt]: createSelector(
      selectors.raw,
      ({ dataAt }) => dataAt
    ),

    [selectors.isPresent]: createSelector(
      selectors.dataAt,
      dataAt => Boolean(dataAt)
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

    [actionCreators.doAdjust]: payload => ({ type: actions.ADJUSTED, payload }),

    persistActions: (persist && features.enhancePersistActions([actions.FINISHED])) || null,
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

  return features.enhanceBundle(bundle)
}
