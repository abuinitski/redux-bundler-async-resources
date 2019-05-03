import {
  getItemData,
  itemIsPresent,
  itemIsLoading,
  itemIsPendingForFetch,
  getItemError,
  itemIsReadyForRetry,
  itemErrorIsPermanent,
  itemIsStale,
} from './asyncResourcesHelpers'

export { default as createAsyncResourcesBundle } from './createAsyncResourcesBundle'

export { default as createAsyncResourceBundle } from './createAsyncResourceBundle'

export const asyncResources = {
  getItemData,
  itemIsPresent,
  itemIsLoading,
  itemIsPendingForFetch,
  getItemError,
  itemIsReadyForRetry,
  itemErrorIsPermanent,
  itemIsStale,
}
