import {
  getItemData,
  itemIsPresent,
  itemIsLoading,
  itemIsPendingForFetch,
  getItemError,
  itemIsReadyForRetry,
  itemRetryAt,
  itemErrorIsPermanent,
  itemIsStale,
} from './asyncResourcesHelpers'

export { default as createAsyncResourcesBundle } from './createAsyncResourcesBundle'
export { default as makeAsyncResourceBundleKeys } from './makeAsyncResourceBundleKeys'

export { default as createAsyncResourceBundle } from './createAsyncResourceBundle'
export { default as makeAsyncResourcesBundleKeys } from './makeAsyncResourcesBundleKeys'

export { default as createInfiniteScrollAsyncCollectionBundle } from './createInfiniteScrollAsyncCollectionBundle'
export { default as makeInfiniteScrollAsyncCollectionBundleKeys } from './makeInfiniteScrollAsyncCollectionBundleKeys'

export const asyncResources = {
  getItemData,
  itemIsPresent,
  itemIsLoading,
  itemIsPendingForFetch,
  getItemError,
  itemIsReadyForRetry,
  itemRetryAt,
  itemErrorIsPermanent,
  itemIsStale,
}
