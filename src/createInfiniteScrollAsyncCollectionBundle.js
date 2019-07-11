import { createSelector } from 'redux-bundler'

import { nameToUnderscoreCase } from './common/nameToUnderscoreCase'
import ResourceDependenciesFeature from './features/ResourceDependenciesFeature'
import Features from './features/Features'
import cookOptionsWithDefaults from './common/cookOptionsWithDefaults'
import makeInfiniteScrollAsyncCollectionBundleKeys from './makeInfiniteScrollAsyncCollectionBundleKeys'
import StalingFeature from './features/StalingFeature'
import ExpiryFeature from './features/ExpiryFeature'
import ClearingFeature from './features/ClearingFeature'

const InitialState = {
  isReloading: false,
  isLoadingMore: false,
  isPristine: true,
  hasMoreItems: true,

  items: [],
  reloadedAt: null,
  reloadError: null,

  loadMoreError: null,
  loadMoreErrorIsPermanent: false,
}

export const InfiniteScrollAsyncCollectionBundleFeatures = [
  ResourceDependenciesFeature,
  StalingFeature,
  ExpiryFeature,
  ClearingFeature,
]

export default function createInfiniteScrollAsyncCollectionBundle(inputOptions) {
  const { name, getPromise, actionBaseType, persist } = cookOptionsWithDefaults(inputOptions, {})
  const baseActionTypeName = actionBaseType || nameToUnderscoreCase(name)

  const bundleKeys = makeInfiniteScrollAsyncCollectionBundleKeys(name)
  const { selectors, actionCreators, reactors } = bundleKeys

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

  const reducer = (state = enhancedInitialState, { type, payload }) => {
    return state
  }

  const bundle = {
    name,

    reducer: features.enhanceReducer(reducer, { rawInitialState: InitialState }),

    [selectors.raw]: state => state[name],

    [selectors.data]: createSelector(
      selectors.raw,
      ({ items }) => items
    ),

    [selectors.dataAt]: createSelector(
      selectors.raw,
      ({ reloadedAt }) => reloadedAt
    ),

    // TODO: persist actions
    persistActions: (persist && features.enhancePersistActions([])) || null,
  }

  return features.enhanceBundle(bundle)
}
