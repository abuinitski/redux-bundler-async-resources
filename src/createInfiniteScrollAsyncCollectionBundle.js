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
    ResourceDependenciesFeature.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys }),
    StalingFeature.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys }),
    ExpiryFeature.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys }),
    ClearingFeature.withInputOptions(inputOptions, { baseActionTypeName, bundleKeys })
  )

  const enhancedInitialState = features.enhanceCleanState(InitialState)

  const actions = {
    // TODO
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
