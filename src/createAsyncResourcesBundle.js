import { createSelector } from 'redux-bundler'

import {
  itemErrorIsPermanent,
  itemIsReadyForRetry,
  itemIsStale,
  getItemData,
  itemIsPresent,
} from './asyncResourcesHelpers'
import makeAsyncResourcesBundleKeys from './makeAsyncResourcesBundleKeys'
import cookOptionsWithDefaults from './common/cookOptionsWithDefaults'

const Defaults = {
  name: undefined, // required
  getPromise: undefined, // required
  actionBaseType: null, // ${toUnderscoreCase(name)}
  retryAfter: 60000, // one minute,
  staleAfter: 900000, // fifteen minutes
  expireAfter: Infinity,
  persist: true,
}

const BlankItemState = {
  isLoading: false,

  data: null,
  dataAt: null,
  isStale: false,

  error: null,
  errorAt: null,
  errorPermanent: false,
  isReadyForRetry: false,
  retryAt: null,
}

export default function createAsyncResourcesBundle(inputOptions) {
  const { name, getPromise, actionBaseType, retryAfter, expireAfter, staleAfter, persist } = cookOptionsWithDefaults(
    inputOptions,
    Defaults
  )

  const baseType = actionBaseType || toUnderscoreCase(name)

  const expireEnabled = expireAfter && expireAfter !== Infinity
  const staleEnabled = staleAfter && staleAfter !== Infinity
  const retryEnabled = retryAfter && retryAfter !== Infinity

  const { selectors, actionCreators, reactors } = makeAsyncResourcesBundleKeys(name)

  const actions = {
    STARTED: `${baseType}_FETCH_STARTED`,
    FINISHED: `${baseType}_FETCH_FINISHED`,
    FAILED: `${baseType}_FETCH_FAILED`,
    CLEARED: `${baseType}_ITEM_CLEARED`,
    STALE: `${baseType}_ITEM_STALE`,
    EXPIRED: `${baseType}_ITEM_EXPIRED`,
    READY_FOR_RETRY: `${baseType}_ITEM_READY_FOR_RETRY`,
    ADJUSTED: `${baseType}_ADJUSTED`,
  }

  const doFetchItem = itemId => args => {
    const { dispatch } = args
    dispatch({ type: actions.STARTED, itemId })

    return getPromise(itemId, args).then(
      payload => {
        dispatch({ type: actions.FINISHED, itemId, payload })
      },
      error => {
        dispatch({ type: actions.FAILED, itemId, payload: error })
      }
    )
  }

  const updateItem = (state, itemId, itemStateChange) => {
    const nextItems = { ...state.items }

    if (itemStateChange) {
      const prevItemState = state.items[itemId] || { ...BlankItemState, id: itemId }
      nextItems[itemId] = {
        ...prevItemState,
        ...itemStateChange,
      }
    } else {
      delete nextItems[itemId]
    }

    return {
      items: nextItems,
      nextStaleItem: staleEnabled && selectEarliestItem(nextItems, 'dataAt', item => !itemIsStale(item)),
      nextExpiringItem: expireEnabled && selectEarliestItem(nextItems, 'dataAt'),
      nextRetryingItem: retryEnabled && selectEarliestItem(nextItems, 'retryAt', item => !itemIsReadyForRetry(item)),
    }
  }

  const doClearItem = itemId => ({ type: actions.CLEARED, itemId })

  const doMarkItemAsStale = itemId => ({ type: actions.STALE, itemId })

  const doAdjustItem = (itemId, payload) => ({ type: actions.ADJUSTED, itemId, payload })

  const bundle = {
    name,

    reducer: (state = { items: {}, nextExpiringItem: null, nextRetryingItem: null }, { type, itemId, payload }) => {
      if (type === actions.STARTED) {
        return updateItem(state, itemId, { isLoading: true })
      }

      if (type === actions.FINISHED) {
        return updateItem(state, itemId, {
          isLoading: false,

          data: payload,
          dataAt: Date.now(),
          isStale: false,

          error: null,
          errorAt: null,
          errorPermanent: false,
          isReadyForRetry: false,
          retryAt: null,
        })
      }

      if (type === actions.FAILED) {
        const errorAt = Date.now()
        const errorPermanent = Boolean(payload.permanent)

        return updateItem(state, itemId, {
          isLoading: false,

          error: payload,
          errorAt,
          errorPermanent,
          isReadyForRetry: false,
          retryAt: (retryEnabled && !errorPermanent && errorAt + retryAfter) || null,
        })
      }

      if (type === actions.CLEARED || type === actions.EXPIRED) {
        return updateItem(state, itemId, null)
      }

      if (type === actions.STALE) {
        return updateItem(state, itemId, { isStale: true })
      }

      if (type === actions.READY_FOR_RETRY) {
        return updateItem(state, itemId, { isReadyForRetry: true })
      }

      if (type === actions.ADJUSTED) {
        const item = state.items[itemId]
        if (!itemIsPresent(item)) {
          return state
        }

        if (typeof payload === 'function') {
          return updateItem(state, itemId, { data: payload(getItemData(item)) })
        }

        return updateItem(state, itemId, { data: payload })
      }

      return state
    },

    [selectors.raw]: state => state[name],

    [selectors.items]: createSelector(
      selectors.raw,
      state => state.items
    ),

    [actionCreators.doFetch]: doFetchItem,

    [actionCreators.doClear]: doClearItem,

    [actionCreators.doMarkAsStale]: doMarkItemAsStale,

    [actionCreators.doAdjust]: doAdjustItem,

    persistActions: (persist && [actions.FINISHED, actions.CLEARED, actions.EXPIRED]) || null,
  }

  if (expireEnabled) {
    bundle[selectors.nextExpiringItem] = createSelector(
      selectors.raw,
      state => state.nextExpiringItem
    )

    bundle[reactors.shouldExpire] = createSelector(
      selectors.nextExpiringItem,
      'selectAppTime',
      (nextExpiringItem, appTime) => {
        if (!nextExpiringItem) {
          return false
        }

        if (appTime - nextExpiringItem.dataAt > expireAfter) {
          return { type: actions.EXPIRED, itemId: nextExpiringItem.id }
        }
      }
    )
  }

  if (retryEnabled) {
    bundle[selectors.nextRetryingItem] = createSelector(
      selectors.raw,
      state => state.nextRetryingItem
    )

    bundle[reactors.shouldRetry] = createSelector(
      selectors.nextRetryingItem,
      'selectAppTime',
      (nextRetryingItem, appTime) => {
        if (!nextRetryingItem) {
          return false
        }

        if (appTime >= nextRetryingItem.retryAt) {
          return { type: actions.READY_FOR_RETRY, itemId: nextRetryingItem.id }
        }
      }
    )
  }

  if (staleEnabled) {
    bundle[selectors.nextStaleItem] = createSelector(
      selectors.raw,
      state => state.nextStaleItem
    )

    bundle[reactors.shouldBecomeStale] = createSelector(
      selectors.nextStaleItem,
      'selectAppTime',
      (nextStaleItem, appTime) => {
        if (!nextStaleItem) {
          return false
        }

        if (appTime - nextStaleItem.dataAt > staleAfter) {
          return { type: actions.STALE, itemId: nextStaleItem.id }
        }
      }
    )
  }

  return bundle
}

function selectEarliestItem(items, timePropName, predicate) {
  // when possible can take a shortcut by only comparing "previous next expiring item" with a changed item
  // (fallback to full scan when there is no "prev next expiring item" or it is getting changed itself)
  // for now can be considered a premature optimization
  return Object.values(items).reduce((earliestItem, nextItem) => {
    if (!nextItem[timePropName] || nextItem.isLoading || (predicate && !predicate(nextItem))) {
      return earliestItem
    }

    if (!earliestItem) {
      return nextItem
    }

    if (nextItem[timePropName] < earliestItem[timePropName]) {
      return nextItem
    }

    return earliestItem
  }, null)
}

function toUnderscoreCase(input) {
  return input
    .replace(/\.?([A-Z]+)/g, (x, y) => '_' + y.toLowerCase())
    .replace(/^_/, '')
    .toUpperCase()
}
