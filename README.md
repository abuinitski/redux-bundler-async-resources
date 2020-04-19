# Redux-Bundler Async Resource**s**

![](https://img.shields.io/npm/v/redux-bundler-async-resources.svg) ![](https://img.shields.io/npm/dt/redux-bundler-async-resources.svg) [![CircleCI](https://circleci.com/gh/abuinitski/redux-bundler-hook/tree/master.svg?style=svg)](https://circleci.com/gh/abuinitski/redux-bundler-async-resources/tree/master)

A bundle factory for [redux-bundler](https://reduxbundler.com/) that clearly manages remote resources.

## Motivation

It is questionable that `createAsyncResourceBundle` should be a native part of redux-bundler in the first place. Either way, it's missing some features that are usually needed and usually re-implemented as extensions.

This package:

- re-implements `createAsyncResourceBundle` with a bit clearer semantics and few additional missing features
- adds a new concept: `createAsyncResourcesBundle` (note plural form). Instead of a single resource instance, it manages a collection of async resource instances referenced by ID. Each managed instance has it's own lifecycle in terms of loading, expiration etc.

## Installation

```
npm install --save redux-bundler-async-resources
```

## Usage

If you use React, take a look at [redux-bundler-async-resources-hooks](https://github.com/abuinitski/redux-bundler-async-resources-hooks/)

### createAsyncResourceBundle

##### bundles/hotCarDeals.js

```javascript
import { createSelector } from 'redux-bundler'
import { createAsyncResourceBundle } from 'redux-bundler-async-resources'

export default {
  ...createAsyncResourceBundle({
    name: 'hotCarDeals',
    staleAfter: 180000, // refresh every 3 minutes
    expireAfter: 60 * 60000, // delete if not refreshed in an hour
    getPromise: ({ shopApi }) => shopApi.fetchHotCarDeals(),
  }),

  reactShouldFetchHotCarDeals: createSelector(
    'selectHotCarDealsIsPendingForFetch',
    shouldFetch => {
      if (shouldFetch) {
        return { actionCreator: 'doFetchHotCarDeals' }
      }
    }
  ),
}
```

##### HotCarDeals.js

```javascript
import React from 'react'
import { useConnect } from 'redux-bundler-hook'

// ... other imports

export default function HotCarDeals() {
  const { hotCarDeals, hotCarDealsError } = useConnect('selectHotCarDeals', 'selectHotCarDealsError')

  if (!hotCarDeals && hotCarDealsError) {
    return <ErrorMessage error={hotCarDealsError} />
  }

  if (!hotCarDeals) {
    return <Spinner />
  }

  return <CarDealsList deals={hotCarDeals} />
}
```

#### Options

- **name** (required): bundle name as usual
- **getPromise** (required): a function to get usual action creator context parameters; should return a promise that would either resolved with item data or rejected with an error.
- **actionBaseType** _(toUnderscoreNotation(name))_: a prefix to be used with internal action types
- **retryAfter** _(60000 i.e. one minute)_: an interval after which an `select${Name}IsPendingForFetch` for a failed request will turn back on. Falsie value or `Infinity` will disable retries.
- **staleAfter** _(900000 i.e. 15 minutes)_: an interval of time after which a successfully fetched item will try to refresh itself (e.g. turn `select${Name}IsPendingForFetch` back on). Falsie value or `Infinity` will disable staling mechanism.
- **expireAfter** _(`Infinity`)_: similar to `staleAfter` but will hard-remove the item from the store, resetting it to pristine state. Useful with caching to to prevent app user to see really old data when re-opening the page.
- **persist** _(true)_: will instruct `cacheBundle` to cache on meaningful updates.
- **dependencyKey** _(null)_: when given, will listen for values of related selectors:
  - as an example, dependency key `userId` will listen to selector `selectUserId`
  - when dependency selector resolves with `null` or `undefined`, it will prevent resource from fetching
  - when dependency selector resolves to a value, this value will be mixed-in into `getPromise` parameters
  - when resolved value changes, bundle will force-clear itself
  - example values used in most cases: `currentUserId` or `['myResourceListPage', 'myResourceListPageSize']'`
  - as shown above, to listen to several selectors, pass an array
  - rather than a simple string, each selector can be represented as an object with additional parameters (i.e. `{ key: 'userId', staleOnChange: true '}`):
    - **staleOnChange**: _(false)_ - if `true`, will stale a resource when dependency changes, rather than clearing the store
    - **allowBlank**: _(false)_ – if `true`, will not lock resource from fetching when resolved value is `null` or `undefined`
    - **equality**: _(===)_ - for rare cases when it is needed to override equality check which decides whether dependency value changed or not    

#### Selectors

- `select${Name}Raw` – just get raw bundle state, to be used internally
- `select${Name}` – returns item data or `undefined` if there's nothing there
- `select${Name}IsPresent` – returns `true` if there is something to be returned by `select${Name}` (i.e. there was at least one successful load before)
- `select${Name}IsLoading` – returns `true` if item is currently loading (irrelevant of whether there is some data or not in `select${Name}`)
- `select${Name}IsPendingForFetch` – returns `true` if resource thinks it should load now (i.e. pristine or stale or there was an error and `retryAfter` has passed or dependencies were specified and changed)
- `select${Name}Error` – returns whatever `gerPromise` rejected with previously; reset to `null` or new error value after next load is finished
- `select${Name}IsReadyForRetry` – returns `true` if previous fetch resulted in error and `retryAfter` has passed
- `select${Name}RetryAt` – returns `null` or a timestamp at which item fetch will be retried
- `select${Name}ErrorIsPermanent` – returns `true` if previous fetch resulted in error and error object had `permanent` field on
- `select${Name}IsStale` – returns `true` if item is stale (manually or respective interval has passed) 

#### Action Creators

- `doFetch${Name}` – trigger a fetch
- `doClear${Name}` – force-clear a bundle and reset it to pristine state
- `doMark${Name}AsStale` – force-mark resource as outdated. Will not remove item from the bundle, but will turn "refetch me!" flag on.
- `doAdjust${Name}(payload)` – if there is some data present, replace item data with specified `payload`. If `payload` is a function, call it a with single parameter (current data value), and replace data with that it returns. Primary use case is when you have some mutation API calls to your resource that always render a predictable change of your resource properties – so you want to save up on re-fetching it and just update in place.

... some other selectors and action creators are present, though mostly technical and are needed for bundle  functioning 

### createAsyncResourcesBundle

##### createStore.js

```javascript
import { composeBundles, createSelector } from 'redux-bundler'
import { createAsyncResourcesBundle } from 'redux-bundler-async-resources'

export default composeBundles(
  createAsyncResourcesBundle({
    name: 'carReviews',
    staleAfter: 60000, // refresh every a minute
    expireAfter: 60 * 60000, // delete if not refreshed in an hour
    getPromise: (carId, { shopApi }) => shopApi.fetchCarReviews(carId),
  }),

  {
    name: 'currentCarReviews',
    reducer: (state = null, action) => {
      if (action.type === 'currentCarReviews.CHANGED') {
        return action.payload
      }
      return state
    },

    selectCurrentCarReviewsRaw: state => state.currentCarReviews,

    selectCurrentCarReviews: createSelector(
      'selectCurrentCarReviewsRaw',
      reviewsItem => asyncResources.getItemData(reviewsItem)
    ),

    selectCurrentCarReviewsError: createSelector(
      'selectCurrentCarReviewsRaw',
      reviewsItem => asyncResources.getItemError(reviewsItem)
    ),

    selectCurrentCarReviewsLoading: createSelector(
      'selectCurrentCarReviewsRaw',
      reviewsItem => asyncResources.itemIsLoading(reviewsItem)
    ),

    reactCurrentCarReviewsChanged: createSelector(
      'selectCurrentCarReviewsRaw',
      'selectCurrentCarId',
      'selectItemsOfCarReviews',
      (prevReviewsItem, carId, carReviews) => {
        const reviewsItem = carReviews[carId]
        if (prevReviewsItem !== reviewsItem) {
          return { type: 'currentCarReviews.CHANGED', payload: reviewsItem }
        }
      }
    ),

    reactShouldFetchCurrentCarReviews: createSelector(
      'selectCurrentCarId',
      'selectItemsOfCarReviews',
      'selectIsOnline',
      (carId, carReviews, isOnline) => {
        if (carId && asyncResources.itemIsPendingForFetch(carReviews[carId], { isOnline })) {
          return { actionCreator: 'doFetchItemOfCarReviews', args: [carId] }
        }
      }
    ),
  }
  // ... other bundles of your application
)
```

##### CurrentCarReviews.js

```javascript
import React from 'react'
import { useConnect } from 'redux-bundler-hook'
import { asyncResources } from 'redux-bundler-async-resources'

// ... other imports

export default function CurrentCarReviews() {
  const { currentCarReviews, currentCarReviewsError, currentCarReviewsLoading } = useConnect(
    'selectCurrentCarReviews',
    'selectCurrentCarReviewsError',
    'selectCurrentCarReviewsLoading'
  )

  if (currentCarReviewsLoading) {
    return <Spinner />
  }

  if (currentCarReviewsError) {
    return <ErrorMessage error={currentCarReviewsError} />
  }

  return <ReviewList reviews={currentCarReviews} />
}
```

#### Options

- **name** (required): bundle name as usual
- **getPromise** (required): a function to get item id as first parameter, and usual action creator context parameters as a second; should return a promise that would either resolved with item data or rejected with an error. In both cases result will appear as `asyncResources.getItemData(itemId)` or `asyncResources.getItemError(itemId)`
- **actionBaseType** _(toUnderscoreNotation(name))_: a prefix to be used with internal action types
- **retryAfter** _(60000 i.e. one minute)_: an interval after which an `asyncResources.itemIsPendingForFetch` for an item that has failed to fetch will turn back on. Falsie value or `Infinity` will disable retries.
- **staleAfter** _(900000 i.e. 15 minutes)_: an interval of time after which a successfully fetched item will try to refresh itself (e.g. turn `asyncResources.itemIsPendingForFetch` back on). Falsie value or `Infinity` will disable staling mechanism.
- **expireAfter** _(`Infinity`)_: similar to `staleAfter` but will hard-remove the item from the store. Useful with caching to to prevent app user to see really old data when re-opening the page.
- **persist** _(true)_: same behavior as for `createAsyncResource` – will instruct `cacheBundle` to cache on meaningful updates.

#### Selectors

- `select${Name}Raw` – as usual, just get raw bundle state
- `selectItemsOf${Name}` – returns a hash of `{ [itemId]: item }`; `item` to be used with `asyncResources` helpers to get meaningful information from it.

#### Action Creators

- `doFetchItemOf${Name}(itemId)` – trigger a fetch of a specific item
- `doClearItemOf${Name}(itemId)` – force-remove a certain item from the bundle, resetting it to pristine state
- `doMarkItemOf${Name}AsStale(itemId)` – force-mark certain item as outdated. Will not remove item from the bundle, but will turn "refetch me!" flag on.
- `doAdjustItemOf${Name}(itemId, payload)` – if there is some data present, replace item data with specified `payload`. If `payload` is a function, call it a with single parameter (current data value), and replace data with that it returns. Primary use case is when you have some mutation API calls to your resource that always render a predictable change of your resource properties – so you want to save up on re-fetching it and just update in place.

#### `asyncResources` helpers

- `getItemData(item)` – will return anything that `getPromise` previously resolved with or `undefined` if it didn't happen before
- `itemIsPresent(item)` – `true` if `getItemData` is currently able to return some data to show
- `itemIsLoading(item)` – `true` if item is currently loading (irrelevant of whether it has some data or not, i.e. of `itemIsPresent` / `getItemData` result)
- `itemIsPendingForFetch(item, [{ isOnline = undefined }])` – `true` if there are any of mentioned conditions are present that result in necessity to trigger `doFetchItemOf${Name}`:
  - either this item is in pristine state
  - or it failed, retry is enabled and `retryAfter` has passed (and error is not permanent)
  - or it fetched and is stale (either manually or because `staleAfter` has passed)
  - `isOnline` is an optional check to not even try loading anything if device is offline; may omit if online check is not needed
- `getItemError(item)` – something that `getPromise` previously rejected with. Will reset on when next fetch will finish (or fail).
- `itemIsReadyForRetry(item)` – `true` if this item contains an error, and `retryAfter` has passed.
- `itemRetryAt(item)` – returns a timestamp at which item fetch will be retried (if it will be, otherwise `null`)
- `itemErrorIsPermanent(item)` – `true` if `getPromise` has rejected with something that had `persistent: true` property in it. Retry behavior will be disabled in this case.
- `itemIsStale(item)` – `true` if this item is stale (manually or because `staleAfter` has passed since last successful fetch)

### Naming helpers

In (rare) cases when you need to async resources in a resource-agnostic manner, there are two helpers available: `makeAsyncResourceBundleKeys` and `makeAsyncResourcesBundleKeys` for it's multi-item counterpart.

Calling this with a resource `name` will return you an object of the following shape (assuming resource name `"myResource"`):

(similar to)

```json
{
  "selectors": {
    "raw": "selectMyResourceRaw",
    "data": "selectMyResource",
    "isLoading": "selectMyResourceIsLoading",
    "isPresent": "selectMyResourceIsPresent",
    "error": "selectMyResourceError",
    "isReadyForRetry": "selectMyResourceIsReadyForRetry",
    "errorIsPermanent": "selectMyResourceErrorIsPermanent",
    "isStale": "selectMyResourceIsStale",
    "isPendingForFetch": "selectMyResourceIsPendingForFetch"
  },
  "keys": {
    "raw": "myResourceRaw",
    "data": "myResource",
    "isLoading": "myResourceIsLoading",
    "isPresent": "myResourceIsPresent",
    "error": "myResourceError",
    "isReadyForRetry": "myResourceIsReadyForRetry",
    "errorIsPermanent": "myResourceErrorIsPermanent",
    "isStale": "myResourceIsStale",
    "isPendingForFetch": "myResourceIsPendingForFetch"
  },
  "actionCreators": {
    "doFetch": "doFetchMyResource",
    "doClear": "doClearMyResource",
    "doMarkAsStale": "doMarkMyResourceAsStale",
    "doAdjust": "doAdjustMyResource"
  },
  "reactors": {
    "shouldExpire": "reactMyResourceShouldExpire",
    "shouldRetry": "reactMyResourceShouldRetry",
    "shouldBecomeStale": "reactMyResourceShouldBecomeStale"
  }
}
```

... and for `makeAsyncResourcesBundleKeys` it will be similar to:

```json
{
  "selectors": {
    "raw": "selectMyResourcesRaw",
    "items": "selectItemsOfMyResources",
    "nextExpiringItem": "selectNextExpiringItemOfMyResources",
    "nextRetryingItem": "selectNextRetryingItemOfMyResources",
    "nextStaleItem": "selectNextStaleItemOfMyResources"
  },
  "keys": {
    "raw": "myResourcesRaw",
    "items": "itemsOfMyResources",
    "nextExpiringItem": "nextExpiringItemOfMyResources",
    "nextRetryingItem": "nextRetryingItemOfMyResources",
    "nextStaleItem": "nextStaleItemOfMyResources"
  },
  "actionCreators": {
    "doFetch": "doFetchItemOfMyResources",
    "doClear": "doClearItemOfMyResources",
    "doMarkAsStale": "doMarkItemOfMyResourcesAsStale",
    "doAdjust": "doAdjustItemOfMyResources"
  },
  "reactors": {
    "shouldExpire": "reactItemOfMyResourcesShouldExpire",
    "shouldRetry": "reactItemOfMyResourcesShouldRetry",
    "shouldBecomeStale": "reactItemOfMyResourcesShouldBecomeStale"
  }
}
```
