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
import makeReducer from './common/makeReducer'

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

  const actionHandlers = {
    [actions.STARTED]: state => ({
      ...state,
      isLoading: true,
    }),

    [actions.FINISHED]: (state, action) => ({
      ...state,

      isLoading: false,

      data: action.payload,
      dataAt: Date.now(),
      isStale: false,

      ...retryFeature.makeCleanErrorState(),
    }),

    [actions.FAILED]: (state, action) => ({
      ...state,

      isLoading: false,

      ...retryFeature.makeNewErrorState(action.payload, Date.now()),
    }),

    [actions.ADJUSTED]: (state, action) => {
      if (!state.dataAt) {
        return state
      }

      if (typeof action.payload === 'function') {
        return {
          ...state,
          data: action.payload(state.data),
        }
      }

      return {
        ...state,
        data: action.payload,
      }
    },
  }

  return features.enhanceBundle({
    name,

    reducer: makeReducer(
      features.enhanceActionHandlers(actionHandlers, { rawInitialState: InitialState }),
      enhancedInitialState
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
