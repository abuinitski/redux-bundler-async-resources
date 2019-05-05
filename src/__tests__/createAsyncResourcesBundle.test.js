import timekeeper from 'timekeeper'
import { createReactorBundle, appTimeBundle, composeBundlesRaw } from 'redux-bundler'

import MockApiClient from '../__mocks__/MockApiClient'
import { createAsyncResourcesBundle, asyncResources } from '../index'

const START_TIME = 1000
const DEFAULT_RETRY_IN = 60000

describe('createAsyncResourcesBundle', () => {
  beforeEach(() => timekeeper.freeze(START_TIME))

  afterEach(() => timekeeper.reset())

  test('provides declared interface', () => {
    const { store } = createStore()
    expect(store.selectItemsOfTestResources).toBeDefined()
    expect(store.doFetchItemOfTestResources).toBeDefined()
    expect(store.doClearItemOfTestResources).toBeDefined()
    expect(store.doMarkItemOfTestResourcesAsStale).toBeDefined()
    expect(store.doAdjustItemOfTestResources).toBeDefined()
  })

  test('checks for required parameters', () => {
    expect(() => createStore({ name: '' })).toThrow('createAsyncResourcesBundle: name parameter is required')
    expect(() => createStore({ getPromise: '' })).toThrow(
      'createAsyncResourcesBundle: getPromise parameter is required'
    )
  })

  test('correctly handles item initial state', () => {
    const { store } = createStore()

    assertItem(store, 1, {
      data: undefined,
      isLoading: false,
      isPresent: false,
      isPendingForFetch: true,
      error: null,
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: null,
    })
  })

  test('correctly handles item loading state', () => {
    const { store } = createStore()

    store.doFetchItemOfTestResources(1)

    assertItem(store, 1, {
      data: undefined,
      isLoading: true,
      isPresent: false,
      isPendingForFetch: false,
      error: null,
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: null,
    })
  })

  test('loads an item when requested', async () => {
    const { store, apiMock } = createStore()

    store.doFetchItemOfTestResources(1)

    expect(apiMock.pendingQueueCount(1)).toBe(1)
    await apiMock.resolveFetchRequest(1)

    assertItem(store, 1, {
      data: 'One',
      isLoading: false,
      isPresent: true,
      isPendingForFetch: false,
      error: null,
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: null,
    })
  })

  test('correctly handles item error state', async () => {
    const { store, apiMock } = createStore()

    store.doFetchItemOfTestResources(1)

    await apiMock.resolveFetchRequest(1, 'error!')

    assertItem(store, 1, {
      data: undefined,
      isLoading: false,
      isPresent: false,
      isPendingForFetch: false,
      error: 'error!',
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: START_TIME + DEFAULT_RETRY_IN,
    })
  })

  test('correctly handles error state on re-fetch', async () => {
    const { store, apiMock } = createStore()

    store.doFetchItemOfTestResources(1)
    await apiMock.resolveFetchRequest(1)

    store.doFetchItemOfTestResources(1)
    await apiMock.resolveFetchRequest(1, 'error!')

    assertItem(store, 1, {
      data: 'One',
      isLoading: false,
      isPresent: true,
      isPendingForFetch: false,
      error: 'error!',
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: START_TIME + DEFAULT_RETRY_IN,
    })
  })

  test('marks item for a retry after specified interval', async () => {
    const { store, apiMock } = createStore({ retryAfter: 10 })

    store.doFetchItemOfTestResources(1)

    await apiMock.resolveFetchRequest(1, 'error!')

    await timeTravelTo(9, store)

    assertItem(store, 1, {
      data: undefined,
      isLoading: false,
      isPresent: false,
      isPendingForFetch: false,
      error: 'error!',
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: START_TIME + 10,
    })

    await timeTravelTo(11, store)

    assertItem(store, 1, {
      data: undefined,
      isLoading: false,
      isPresent: false,
      isPendingForFetch: true,
      error: 'error!',
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: true,
      retryAt: START_TIME + 10,
    })
  })

  test('does not mark item for a retry if error is permanent', async () => {
    const { store, apiMock } = createStore({ retryAfter: 10 })
    const error = { message: 'error!', permanent: true }

    store.doFetchItemOfTestResources(1)

    await apiMock.resolveFetchRequest(1, error)

    await timeTravelTo(15, store)

    assertItem(store, 1, {
      data: undefined,
      isLoading: false,
      isPresent: false,
      isPendingForFetch: false,
      error: error,
      errorPermanent: true,
      isStale: false,
      isReadyForRetry: false,
      retryAt: null,
    })
  })

  test('marks item as stale manually or by a timer', async () => {
    const { store, apiMock } = createStore({ staleAfter: 15 })

    store.doFetchItemOfTestResources(1)
    store.doFetchItemOfTestResources(2)

    await apiMock.resolveFetchRequest(1)
    await apiMock.resolveFetchRequest(2)

    store.doMarkItemOfTestResourcesAsStale(1)

    assertItem(store, 1, {
      data: 'One',
      isLoading: false,
      isPresent: true,
      isPendingForFetch: true,
      error: null,
      errorPermanent: false,
      isStale: true,
      isReadyForRetry: false,
      retryAt: null,
    })

    assertItem(store, 2, {
      data: 'Two',
      isLoading: false,
      isPresent: true,
      isPendingForFetch: false,
      error: null,
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: null,
    })

    await timeTravelTo(16, store)

    assertItem(store, 1, {
      data: 'One',
      isLoading: false,
      isPresent: true,
      isPendingForFetch: true,
      error: null,
      errorPermanent: false,
      isStale: true,
      isReadyForRetry: false,
      retryAt: null,
    })

    assertItem(store, 2, {
      data: 'Two',
      isLoading: false,
      isPresent: true,
      isPendingForFetch: true,
      error: null,
      errorPermanent: false,
      isStale: true,
      isReadyForRetry: false,
      retryAt: null,
    })
  })

  test("clears an item from the store when it's expired", async () => {
    const { store, apiMock } = createStore({ expireAfter: 20 })

    store.doFetchItemOfTestResources(1)
    await apiMock.resolveFetchRequest(1)

    await timeTravelTo(21, store)

    assertItem(store, 1, {
      data: undefined,
      isLoading: false,
      isPresent: false,
      isPendingForFetch: true,
      error: null,
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: null,
    })
  })

  test("does not expire items that don't have data", async () => {
    const { store, apiMock } = createStore({ expireAfter: 20 })

    store.doFetchItemOfTestResources(2)
    await apiMock.resolveFetchRequest(2, 'error!')

    await timeTravelTo(21, store)

    assertItem(store, 2, {
      data: undefined,
      isLoading: false,
      isPresent: false,
      isPendingForFetch: false,
      error: 'error!',
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: START_TIME + DEFAULT_RETRY_IN,
    })
  })

  test('expires items that are pending for a retry', async () => {
    const { store, apiMock } = createStore({ expireAfter: 20 })

    store.doFetchItemOfTestResources(3)
    await apiMock.resolveFetchRequest(3)

    store.doFetchItemOfTestResources(3)
    await apiMock.resolveFetchRequest(3, 'error!')

    await timeTravelTo(21, store)

    assertItem(store, 3, {
      data: undefined,
      isLoading: false,
      isPresent: false,
      isPendingForFetch: true,
      error: null,
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: null,
    })
  })

  test('allows to clear an item from the store', async () => {
    const { store, apiMock } = createStore({ expireAfter: 20 })

    store.doFetchItemOfTestResources(1)
    await apiMock.resolveFetchRequest(1)

    store.doClearItemOfTestResources(3)

    assertItem(store, 3, {
      data: undefined,
      isLoading: false,
      isPresent: false,
      isPendingForFetch: true,
      error: null,
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: null,
    })
  })

  test('helper itemIsPendingForFetch respects online property', async () => {
    expect(asyncResources.itemIsPendingForFetch(null)).toBe(true)
    expect(asyncResources.itemIsPendingForFetch(null, { isOnline: false })).toBe(false)
  })

  test('respects null as valid item data', async () => {
    const { store, apiMock } = createStore()

    store.doFetchItemOfTestResources('nilItem')
    await apiMock.resolveFetchRequest('nilItem')

    assertItem(store, 'nilItem', {
      data: null,
      isLoading: false,
      isPresent: true,
      isPendingForFetch: false,
      error: null,
      errorPermanent: false,
      isStale: false,
      isReadyForRetry: false,
      retryAt: null,
    })
  })

  describe('adjust action creator', () => {
    test('replaces data when called with parameter', async () => {
      const { store, apiMock } = createStore()

      store.doFetchItemOfTestResources(1)
      await apiMock.resolveFetchRequest(1)

      store.doAdjustItemOfTestResources(1, 'foobar')
      assertItem(store, 1, {
        data: 'foobar',
        isLoading: false,
        isPresent: true,
        isPendingForFetch: false,
        error: null,
        errorPermanent: false,
        isStale: false,
        isReadyForRetry: false,
        retryAt: null,
      })
    })

    test('accepts updater function as a parameter', async () => {
      const { store, apiMock } = createStore()

      store.doFetchItemOfTestResources(1)
      await apiMock.resolveFetchRequest(1)

      store.doAdjustItemOfTestResources(1, value => `${value}:${value}`)
      assertItem(store, 1, {
        data: 'One:One',
        isLoading: false,
        isPresent: true,
        isPendingForFetch: false,
        error: null,
        errorPermanent: false,
        isStale: false,
        isReadyForRetry: false,
        retryAt: null,
      })
    })

    test('ignores adjustments when there is no data', async () => {
      const { store } = createStore()

      store.doAdjustItemOfTestResources(1, 'XX')
      assertItem(store, 1, {
        data: undefined,
        isLoading: false,
        isPresent: false,
        isPendingForFetch: true,
        error: null,
        errorPermanent: false,
        isStale: false,
        isReadyForRetry: false,
        retryAt: null,
      })

      store.doAdjustItemOfTestResources(1, () => {
        throw new Error('I should not be called')
      })
    })
  })
})

function createStore(settings = {}) {
  const apiMock = new MockApiClient()

  const apiMockBundle = {
    name: 'withApiClient',
    getExtraArgs: () => ({ apiClient: apiMock }),
  }

  const asyncResourceBundle = createAsyncResourcesBundle({
    name: 'testResources',
    getPromise: (itemId, { apiClient }) => apiClient.fetchItem(itemId),
    ...settings,
  })

  const storeFactory = composeBundlesRaw(appTimeBundle, createReactorBundle(), apiMockBundle, asyncResourceBundle)

  return { store: storeFactory(), apiMock }
}

function timeTravelTo(time, store) {
  return new Promise((resolve, reject) => {
    try {
      timekeeper.travel(START_TIME + time)
      store.dispatch({ type: 'dummy action', payload: null }) // just tap the app time
      setTimeout(resolve, 0) // reactors might need a tick to settle down
    } catch (e) {
      reject(e)
    }
  })
}

function assertItem(
  store,
  itemId,
  { data, isLoading, isStale, isReadyForRetry, retryAt, isPresent, isPendingForFetch, error, errorPermanent }
) {
  const items = store.selectItemsOfTestResources()
  const item = items[itemId]

  const {
    getItemData,
    itemIsLoading,
    itemIsPresent,
    itemIsPendingForFetch,
    getItemError,
    itemErrorIsPermanent,
    itemIsStale,
    itemIsReadyForRetry,
    itemRetryAt,
  } = asyncResources

  expect(getItemData(item)).toStrictEqual(data)
  expect(itemIsLoading(item)).toBe(isLoading)
  expect(itemIsPresent(item)).toBe(isPresent)
  expect(itemIsPendingForFetch(item)).toBe(isPendingForFetch)
  expect(getItemError(item)).toStrictEqual(error)
  expect(itemErrorIsPermanent(item)).toBe(errorPermanent)
  expect(itemIsStale(item)).toBe(isStale)
  expect(itemIsReadyForRetry(item)).toBe(isReadyForRetry)
  expect(itemRetryAt(item)).toBe(retryAt)
}
