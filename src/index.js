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
