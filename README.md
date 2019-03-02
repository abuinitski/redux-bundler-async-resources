# Redux-Bundler Async Resource**s**

![](https://img.shields.io/npm/v/redux-bundler-async-resources.svg) ![](https://img.shields.io/npm/dt/redux-bundler-async-resources.svg) [![CircleCI](https://circleci.com/gh/abuinitski/redux-bundler-hook/tree/master.svg?style=svg)](https://circleci.com/gh/abuinitski/redux-bundler-async-resources/tree/master)

A bundle for [redux-bundler](https://reduxbundler.com/) that is similar to stock `createAsyncResourceBundle` but instead of a single item manages a collection of async resource instances referenced by ID.

Each managed instance has it's own lifecycle in terms of loading, expiration etc.

## Installation

```
npm install redux-bundler-async-resources
```

## Usage

Usage is very similar to `createAsyncResourceBundle`:

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

## Options

* **name** (required): bundle name as usual
* **getPromise** (required): a function to get item id as first parameter, and usual action creator context parameters as a second; should return a promise that would either resolved with item data or rejected with an error. In both cases result will appear as `asyncResources.getItemData(itemId)` or `asyncResources.getItemError(itemId)`    
* **actionBaseType** _(toUnderscoreNotation(name))_: a prefix to be used with internal action types
* **retryAfter** _(60000 i.e. one minute)_: an interval after which an `asyncResources.itemIsPendingForFetch` for an item that has failed to fetch will turn back on. Falsie value or `Infinity` will disable retries. 
* **staleAfter** _(900000 i.e. 15 minutes)_: an interval of time after which a successfully fetched item will try to refresh itself (e.g. turn `asyncResources.itemIsPendingForFetch` back on). Falsie value or `Infinity` will disable retries.
* **expireAfter** _(`Infinity`)_: similar to `staleAfter` but will hard-remove the item from the store. Useful with caching to to prevent app user to see really old data when re-opening the page.
* **persist** _(true)_: same behavior as for `createAsyncResource` – will instruct `cacheBundle` to cache on meaningful updates.

## Selectors

* `select${Name}Raw` – as usual, just get raw bundle state
* `selectItemsOf${Name}` – returns a hash of `{ [itemId]: item }`; `item` to be used with `asyncResources` helpers to get meaningful information from it.

## Action Creators

* `doFetchItemOf${Name}(itemId)` – trigger a fetch of a specific item
* `doClearItemOf${Name}(itemId)` – force-remove a certain item from the bundle, resetting it to pristine state
* `doExpireItemOf${Name}(itemId)` – equivalent to clear but with different semantics
* `doMarkItemOf${Name}AsStale` – force-mark certain item as outdated. Will not remove item from the bundle, but will turn "refetch me!" flag on.

## `asyncResources` helpers

* `getItemData(item)` – will return anything that `getPromise` previously resolved with or `undefined` if it didn't happen before 
* `itemIsPresent(item)` – `true` if `getItemData` is currently able to return some data to show 
* `itemIsLoading(item)` – `true` if item is currently loading (irrelevant of whether it has some data or not, i.e. of `itemIsPresent` / `getItemData` result)
* `itemIsPendingForFetch(item, [{ isOnline = undefined }])` – `true` if there are any of mentioned conditions are present that result in necessity to trigger `doFetchItemOf${Name}`:
  * either this item is in pristine state
  * or it failed, retry is enabled and `retryAfter` has passed (and error is not permanent)
  * or it fetched and is stale (either manually or because `staleAfter` has passed)
  * `isOnline` is an optional check to not even try loading anything if device is offline; may omit if online check is not needed
* `getItemError(item)` – something that `getPromise` previously rejected with. Will reset on when next fetch will finish (or fail).
* `itemIsReadyForRetry(item)` – `true` if this item contains an error, and `retryAfter` has passed.
* `itemErrorIsPermanent(item)` – `true` if `getPromise` has rejected with something that had `persistent: true` property in it. Retry behavior will be disabled in this case.
* `itemIsStale(item)` – `true` if this item is stale (manually or because `staleAfter` has passed since last successful fetch)
 
