import { createSelector } from 'redux-bundler'

import { nameToUnderscoreCase } from './common/nameToUnderscoreCase'
import ResourceDependenciesFeature from './features/ResourceDependenciesFeature'
import Features from './features/Features'
import cookOptionsWithDefaults from './common/cookOptionsWithDefaults'
import makeInfiniteScrollAsyncCollectionBundleKeys from './makeInfiniteScrollAsyncCollectionBundleKeys'
import StalingFeature from './features/StalingFeature'
import ExpiryFeature from './features/ExpiryFeature'
import ClearingFeature from './features/ClearingFeature'
import makeReducer from './common/makeReducer'
import RetryFeature from './features/RetryFeature'
import generateUuid from './common/generateUuid'
import isErrorPermanent from './common/isErrorPermanent'

const InitialState = {
  refreshRequestId: null,

  items: [],
  itemsAt: null,

  loadMoreRequestId: null,
  hasMore: true,
  loadMoreError: null,
  loadMoreErrorAt: null,
}

const DefaultProcessPromiseResult = items => ({ items, hasMore: Boolean(items && items.length) })

export const InfiniteScrollAsyncCollectionBundleFeatures = [
  ResourceDependenciesFeature,
  StalingFeature,
  ExpiryFeature,
  ClearingFeature,
  RetryFeature,
]

export default function createInfiniteScrollAsyncCollectionBundle(inputOptions) {
  const {
    name,
    getPromise,
    processPromiseResult = DefaultProcessPromiseResult,
    actionBaseType,
    persist,
  } = cookOptionsWithDefaults(inputOptions, {})
  const baseActionTypeName = actionBaseType || nameToUnderscoreCase(name)

  const bundleKeys = makeInfiniteScrollAsyncCollectionBundleKeys(name)
  const { selectors, actionCreators, reactors } = bundleKeys

  const retryFeature = RetryFeature.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys })
  const staleFeature = StalingFeature.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys })
  const features = new Features(
    InfiniteScrollAsyncCollectionBundleFeatures.map(featureClass =>
      featureClass.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys })
    )
  )

  const enhancedInitialState = features.enhanceCleanState(InitialState)

  const actions = {
    REFRESH_STARTED: `${baseActionTypeName}_REFRESH_STARTED`,
    REFRESH_FINISHED: `${baseActionTypeName}_REFRESH_FINISHED`,
    REFRESH_FAILED: `${baseActionTypeName}_REFRESH_FAILED`,
    LOAD_MORE_STARTED: `${baseActionTypeName}_LOAD_MORE_STARTED`,
    LOAD_MORE_FINISHED: `${baseActionTypeName}_LOAD_MORE_FINISHED`,
    LOAD_MORE_FAILED: `${baseActionTypeName}_LOAD_MORE_FAILED`,
  }

  const actionHandlers = {
    [actions.REFRESH_STARTED]: (state, { payload: { requestId } }) => ({
      ...state,
      refreshRequestId: requestId,
    }),

    [actions.REFRESH_FINISHED]: (state, { payload: { requestId, appTime, items, hasMore } }) => {
      if (state.refreshRequestId !== requestId) {
        return state
      }

      return {
        ...state,

        refreshRequestId: null,
        items,
        itemsAt: appTime,

        loadMoreRequestId: null,
        hasMore,
        loadMoreError: null,
        loadMoreErrorAt: null,

        ...retryFeature.makeCleanErrorState(),
        ...staleFeature.makeCleanStaleState(),
      }
    },

    [actions.REFRESH_FAILED]: (state, { payload: { requestId, appTime, error } }) => {
      if (state.refreshRequestId !== requestId) {
        return state
      }

      return {
        ...state,

        refreshRequestId: null,

        ...retryFeature.makeNewErrorState(error, appTime),
      }
    },

    [actions.LOAD_MORE_STARTED]: (state, { payload: { requestId } }) => {
      return {
        ...state,
        loadMoreRequestId: requestId,
      }
    },

    [actions.LOAD_MORE_FINISHED]: (state, { payload: { requestId, items, hasMore } }) => {
      if (state.loadMoreRequestId !== requestId) {
        return state
      }

      return {
        ...state,

        items: [...state.items, ...items],

        loadMoreRequestId: null,
        hasMore,
        loadMoreError: null,
        loadMoreErrorAt: null,
      }
    },

    [actions.LOAD_MORE_FAILED]: (state, { payload: { requestId, error, appTime } }) => {
      if (state.loadMoreRequestId !== requestId) {
        return state
      }

      return {
        ...state,
        
        loadMoreRequestId: null,
        loadMoreError: error,
        loadMoreErrorAt: appTime,
      }
    },
  }

  const bundle = {
    name,

    reducer: makeReducer(
      features.enhanceActionHandlers(actionHandlers, { rawInitialState: InitialState }),
      enhancedInitialState
    ),

    [selectors.raw]: state => state[name],

    [selectors.data]: createSelector(
      selectors.raw,
      ({ items }) => items
    ),

    [selectors.dataAt]: createSelector(
      selectors.raw,
      ({ itemsAt }) => itemsAt
    ),

    [selectors.isRefreshing]: createSelector(
      selectors.raw,
      ({ refreshRequestId }) => Boolean(refreshRequestId)
    ),

    [selectors.isPresent]: createSelector(
      selectors.dataAt,
      dataAt => Boolean(dataAt)
    ),

    [selectors.isLoadingMore]: createSelector(
      selectors.raw,
      ({ loadMoreRequestId }) => Boolean(loadMoreRequestId)
    ),

    [selectors.canLoadMore]: createSelector(
      selectors.isPresent,
      selectors.isRefreshing,
      selectors.isLoadingMore,
      selectors.hasMore,
      selectors.loadMoreErrorIsPermanent,
      selectors.isDependencyResolved,
      (isPresent, isRefreshing, isLoadingMore, hasMore, loadMoreErrorIsPermanent, isDependencyResolved) =>
        isDependencyResolved && isPresent && !isRefreshing && !isLoadingMore && hasMore && !loadMoreErrorIsPermanent
    ),

    [selectors.hasMore]: createSelector(
      selectors.raw,
      ({ hasMore }) => hasMore
    ),

    [selectors.loadMoreError]: createSelector(
      selectors.raw,
      ({ loadMoreError }) => loadMoreError
    ),

    [selectors.isPendingForRefresh]: createSelector(
      selectors.hasError,
      selectors.isPresent,
      selectors.isStale,
      selectors.isRefreshing,
      selectors.isReadyForRetry,
      selectors.isDependencyResolved,
      (hasError, isPresent, isStale, isRefreshing, isReadyForRetry, isDependencyResolved) => {
        if (!isDependencyResolved || isRefreshing) {
          return false
        }

        if (hasError) {
          return isReadyForRetry
        }

        return isStale || !isPresent
      }
    ),

    [selectors.loadMoreErrorIsPermanent]: createSelector(
      selectors.loadMoreError,
      error => isErrorPermanent(error)
    ),

    [actionCreators.doRefresh]: () => thunkArgs => {
      const { store, dispatch } = thunkArgs
      const requestId = generateUuid()

      dispatch({ type: actions.REFRESH_STARTED, payload: { requestId, appTime: store.selectAppTime() } })

      const enhancedThunkArgs = features.enhanceThunkArgs(thunkArgs)

      return getPromise(null, enhancedThunkArgs).then(
        promiseResult => {
          const { items, hasMore } = processPromiseResult(promiseResult)
          dispatch({
            type: actions.REFRESH_FINISHED,
            payload: { requestId, items, hasMore, appTime: store.selectAppTime() },
          })
        },
        error => {
          dispatch({ type: actions.REFRESH_FAILED, payload: { requestId, error, appTime: store.selectAppTime() } })
        }
      )
    },

    [actionCreators.doLoadMore]: () => thunkArgs => {
      const { store, dispatch } = thunkArgs

      const requestId = generateUuid()

      dispatch({ type: actions.LOAD_MORE_STARTED, payload: { requestId, appTime: store.selectAppTime() } })

      const enhancedThunkArgs = features.enhanceThunkArgs(thunkArgs)
      const existingItems = store[selectors.data]()

      return getPromise(existingItems, enhancedThunkArgs).then(
        promiseResult => {
          const { items, hasMore } = processPromiseResult(promiseResult, thunkArgs)
          dispatch({
            type: actions.LOAD_MORE_FINISHED,
            payload: { requestId, items, hasMore, appTime: store.selectAppTime() },
          })
        },
        error => {
          dispatch({ type: actions.LOAD_MORE_FAILED, payload: { requestId, error, appTime: store.selectAppTime() } })
        }
      )
    },

    persistActions:
      (persist && features.enhancePersistActions([actions.REFRESH_FINISHED, actions.LOAD_MORE_FINISHED])) || null,
  }

  return features.enhanceBundle(bundle)
}
