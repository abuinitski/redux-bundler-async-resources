import { createSelector } from 'redux-bundler'

import {
  itemErrorIsPermanent,
  itemIsReadyForRetry,
  itemIsStale,
  getItemData,
  itemIsPresent,
} from './asyncResourcesHelpers'

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
}

export default function createAsyncResourcesBundle(inputOptions) {
  const { name, getPromise, actionBaseType, retryAfter, expireAfter, staleAfter, persist } = cookOptionsWithDefaults(
    inputOptions
  )

  const uCaseName = name.charAt(0).toUpperCase() + name.slice(1)
  const baseType = actionBaseType || toUnderscoreCase(name)

  const expireEnabled = expireAfter && expireAfter !== Infinity
  const staleEnabled = staleAfter && staleAfter !== Infinity
  const retryEnabled = retryAfter && retryAfter !== Infinity

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
      nextRetryingItem:
        retryEnabled &&
        selectEarliestItem(nextItems, 'errorAt', item => !itemIsReadyForRetry(item) && !itemErrorIsPermanent(item)),
    }
  }

  const doClearItem = itemId => ({ type: actions.CLEARED, itemId })

  const doMarkItemAsStale = itemId => ({ type: actions.STALE, itemId })

  const doAdjustItem = (itemId, payload) => ({ type: actions.ADJUSTED, itemId, payload })

  const rawSelectorName = `select${uCaseName}Raw`

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
        })
      }

      if (type === actions.FAILED) {
        return updateItem(state, itemId, {
          isLoading: false,

          error: payload,
          errorAt: Date.now(),
          errorPermanent: Boolean(payload.permanent),
          isReadyForRetry: false,
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

    [rawSelectorName]: state => state[name],

    [`selectItemsOf${uCaseName}`]: createSelector(
      rawSelectorName,
      state => state.items
    ),

    [`doFetchItemOf${uCaseName}`]: doFetchItem,

    [`doClearItemOf${uCaseName}`]: doClearItem,

    [`doMarkItemOf${uCaseName}AsStale`]: doMarkItemAsStale,

    [`doAdjustItemOf${uCaseName}`]: doAdjustItem,

    persistActions: (persist && [actions.FINISHED, actions.CLEARED, actions.EXPIRED]) || null,
  }

  if (expireEnabled) {
    const nextExpiringItemSelectorName = `selectNextExpiringItemOf${uCaseName}`

    bundle[nextExpiringItemSelectorName] = createSelector(
      rawSelectorName,
      state => state.nextExpiringItem
    )

    bundle[`react${uCaseName}ShouldExpire`] = createSelector(
      nextExpiringItemSelectorName,
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
    const nextRetryingItemSelectorName = `selectNextRetryingItemOf${uCaseName}`

    bundle[nextRetryingItemSelectorName] = createSelector(
      rawSelectorName,
      state => state.nextRetryingItem
    )

    bundle[`reactItemOf${uCaseName}ShouldRetry`] = createSelector(
      nextRetryingItemSelectorName,
      'selectAppTime',
      (nextRetryingItem, appTime) => {
        if (!nextRetryingItem) {
          return false
        }

        if (appTime - nextRetryingItem.errorAt > retryAfter) {
          return { type: actions.READY_FOR_RETRY, itemId: nextRetryingItem.id }
        }
      }
    )
  }

  if (staleEnabled) {
    const nextStaleItemSelectorName = `selectNextStaleItemOf${uCaseName}`

    bundle[nextStaleItemSelectorName] = createSelector(
      rawSelectorName,
      state => state.nextStaleItem
    )

    bundle[`reactItemOf${uCaseName}ShouldBecomeStale`] = createSelector(
      nextStaleItemSelectorName,
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

function cookOptionsWithDefaults(options) {
  if (process.env.NODE_ENV !== 'production') {
    const { name, getPromise } = options

    if (!name) {
      throw new Error('createAsyncResourcesBundle: name parameter is required')
    }

    if (!getPromise) {
      throw new Error('createAsyncResourcesBundle: getPromise parameter is required')
    }
  }

  return { ...Defaults, ...options }
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
