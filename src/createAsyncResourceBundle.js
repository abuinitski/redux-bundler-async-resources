import { createSelector } from 'redux-bundler'

import makeAsyncResourceBundleKeys from './makeAsyncResourceBundleKeys'
import { nameToUnderscoreCase } from './common/nameToUnderscoreCase'
import ResourceDependenciesFeature from './features/ResourceDependenciesFeature'
import Features from './features/Features'
import cookOptionsWithDefaults from './common/cookOptionsWithDefaults'
import StalingFeature from './features/StalingFeature'
import ExpiryFeature from './features/ExpiryFeature'
import ClearingFeature from './features/ClearingFeature'
import RetryFeature from './features/RetryFeature'

const Defaults = {
  persist: true,
}

const InitialState = {
  isLoading: false,
  data: undefined,
  dataAt: null,
}

export const AsyncResourceBundleFeatures = [
  ResourceDependenciesFeature,
  StalingFeature,
  ExpiryFeature,
  ClearingFeature,
  RetryFeature,
]

export default function createAsyncResourceBundle(inputOptions) {
  const { name, getPromise, actionBaseType, persist } = cookOptionsWithDefaults(inputOptions, Defaults)

  const baseActionTypeName = actionBaseType || nameToUnderscoreCase(name)

  const bundleKeys = makeAsyncResourceBundleKeys(name)
  const { selectors, actionCreators, reactors } = bundleKeys

  const retryFeature = RetryFeature.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys })
  const features = new Features(
    AsyncResourceBundleFeatures.map(featureClass =>
      featureClass.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys })
    )
  )

  const enhancedInitialState = features.enhanceCleanState(InitialState)

  const actions = {
    STARTED: `${baseActionTypeName}_FETCH_STARTED`,
    FINISHED: `${baseActionTypeName}_FETCH_FINISHED`,
    FAILED: `${baseActionTypeName}_FETCH_FAILED`,
    ADJUSTED: `${baseActionTypeName}_ADJUSTED`,
  }

  return features.enhanceBundle({
    name,

    reducer: features.enhanceReducer(
      (state = enhancedInitialState, { type, payload }) => {
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

            ...retryFeature.makeCleanErrorState(),
          }
        }

        if (type === actions.FAILED) {
          return {
            ...state,

            isLoading: false,

            ...retryFeature.makeNewErrorState(payload, Date.now()),
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
      { rawInitialState: InitialState }
    ),

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

    [selectors.isPendingForFetch]: createSelector(
      selectors.hasError,
      selectors.isPresent,
      selectors.isStale,
      selectors.isLoading,
      selectors.isReadyForRetry,
      selectors.isDependencyResolved,
      (hasError, isPresent, isStale, isLoading, isReadyForRetry, isDependencyResolved) => {
        if (!isDependencyResolved || isLoading) {
          return false
        }

        if (hasError) {
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
  })
}
