import { createReactorBundle, appTimeBundle, composeBundlesRaw } from 'redux-bundler'

import MockApiClient from '../__mocks__/MockApiClient'
import { createInfiniteScrollAsyncCollectionBundle, makeInfiniteScrollAsyncCollectionBundleKeys } from '../index'
import pagingBundle from '../__mocks__/pagingBundle'
import { setUpTimeTravel, timeTravelTo } from '../__mocks__/time'
import behavesAsStalingResource from '../__test_behaviors__/behavesAsStalingResource'
import behavesAsResourceWithDependencies from '../__test_behaviors__/behavesAsResourceWithDependencies'

describe('createInfiniteScrollAsyncCollectionBundle', () => {
  setUpTimeTravel()

  const bundleKeys = makeInfiniteScrollAsyncCollectionBundleKeys('testResources')
  const featureTestParameters = {
    createStore,
    fetchActionCreator: 'doRefreshTestResources',
    fetchPendingSelector: 'selectTestResourcesIsPendingForRefresh',
  }

  behavesAsStalingResource(bundleKeys, featureTestParameters)
  behavesAsResourceWithDependencies(bundleKeys, featureTestParameters)

  test('provides declared interface', () => {
    const { store } = createStore()

    expect(store.selectTestResourcesRaw).toBeDefined()
    expect(store.selectTestResources).toBeDefined()
    expect(store.selectIsRefreshingTestResources).toBeDefined()
    expect(store.selectTestResourcesIsPresent).toBeDefined()

    expect(store.selectIsLoadingMoreTestResources).toBeDefined()
    expect(store.selectCanLoadMoreTestResources).toBeDefined()
    expect(store.selectHasMoreTestResources).toBeDefined()
    expect(store.selectLoadMoreTestResourcesError).toBeDefined()
    expect(store.selectLoadMoreTestResourcesErrorIsPermanent).toBeDefined()

    expect(store.selectTestResourcesError).toBeDefined()
    expect(store.selectTestResourcesErrorIsPermanent).toBeDefined()
    expect(store.selectTestResourcesIsReadyForRetry).toBeDefined()

    expect(store.selectTestResourcesIsStale()).toBeDefined()
  })

  test('checks for required parameters', () => {
    expect(() => createStore({ name: '' })).toThrow('resource bundle factory: name parameter is required')
    expect(() => createStore({ getPromise: '' })).toThrow('resource bundle factory: getPromise parameter is required')
  })

  test('correctly handles item initial state', () => {
    const { store } = createStore()

    assertCollection(store, {
      items: [],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: false,
      hasMore: true,
      isStale: false,
      isPresent: false,
      error: null,
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })

  test('correctly handles item loading state', () => {
    const { store } = createStore()

    store.doRefreshTestResources()

    assertCollection(store, {
      items: [],
      isRefreshing: true,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: false,
      hasMore: true,
      isStale: false,
      isPresent: false,
      error: null,
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })

  test('loads an item when requested', async () => {
    const { store, apiMock } = createStore()

    store.doRefreshTestResources()

    expect(apiMock.pendingQueueCount('collection1')).toBe(1)
    await apiMock.resolveFetchRequest('collection1')

    assertCollection(store, {
      items: ['one', 'two', 'three'],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: true,
      hasMore: true,
      isStale: false,
      isPresent: true,
      error: null,
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })

  test('loads more items when requested', async () => {
    const { store, apiMock } = createStore()
    store.doRefreshTestResources()
    await apiMock.resolveFetchRequest('collection1')

    store.doLoadMoreTestResources()
    await apiMock.resolveFetchRequest('collection1')

    assertCollection(store, {
      items: ['one', 'two', 'three', 'one', 'two', 'three'],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: true,
      hasMore: true,
      isStale: false,
      isPresent: true,
      error: null,
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })

  test('correctly handles item error state', async () => {
    const { store, apiMock } = createStore()

    store.doRefreshTestResources()

    await apiMock.resolveFetchRequest('collection1', 'error!')

    assertCollection(store, {
      items: [],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: false,
      hasMore: true,
      isStale: false,
      isPresent: false,
      error: 'error!',
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })

  test('correctly handles error state on re-fetch', async () => {
    const { store, apiMock } = createStore()

    store.doRefreshTestResources()
    await apiMock.resolveFetchRequest('collection1')

    store.doRefreshTestResources()
    await apiMock.resolveFetchRequest('collection1', 'error!')

    assertCollection(store, {
      items: ['one', 'two', 'three'],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: true,
      hasMore: true,
      isStale: false,
      isPresent: true,
      error: 'error!',
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })

  test('marks item for a retry after specified interval', async () => {
    const { store, apiMock } = createStore({ retryAfter: 10 })

    store.doRefreshTestResources()

    await apiMock.resolveFetchRequest('collection1', 'error!')

    await timeTravelTo(9, store)

    assertCollection(store, {
      items: [],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: false,
      hasMore: true,
      isStale: false,
      isPresent: false,
      error: 'error!',
      errorPermanent: false,
      isReadyForRetry: false,
    })

    await timeTravelTo(11, store)

    assertCollection(store, {
      items: [],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: false,
      hasMore: true,
      isStale: false,
      isPresent: false,
      error: 'error!',
      errorPermanent: false,
      isReadyForRetry: true,
    })
  })

  test('does not mark item for a retry if error is permanent', async () => {
    const { store, apiMock } = createStore({ retryAfter: 10 })
    const error = { message: 'error!', permanent: true }

    store.doRefreshTestResources()

    await apiMock.resolveFetchRequest('collection1', error)

    await timeTravelTo(15, store)

    assertCollection(store, {
      items: [],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: false,
      hasMore: true,
      isStale: false,
      isPresent: false,
      error: { message: 'error!', permanent: true },
      errorPermanent: true,
      isReadyForRetry: false,
    })
  })

  test('marks item as stale manually', async () => {
    const { store, apiMock } = createStore({ staleAfter: 15 })

    store.doRefreshTestResources()

    await apiMock.resolveFetchRequest('collection1')

    store.doMarkTestResourcesAsStale()

    assertCollection(store, {
      items: ['one', 'two', 'three'],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: true,
      hasMore: true,
      isStale: true,
      isPresent: true,
      error: null,
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })

  test('marks item as stale with a timer', async () => {
    const { store, apiMock } = createStore({ staleAfter: 15 })

    store.doRefreshTestResources()

    await apiMock.resolveFetchRequest('collection1')

    await timeTravelTo(16, store)

    assertCollection(store, {
      items: ['one', 'two', 'three'],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: true,
      hasMore: true,
      isStale: true,
      isPresent: true,
      error: null,
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })

  test("clears an item from the store when it's expired", async () => {
    const { store, apiMock } = createStore({ expireAfter: 20 })

    store.doRefreshTestResources()
    await apiMock.resolveFetchRequest('collection1')

    await timeTravelTo(21, store)

    assertCollection(store, {
      items: [],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: false,
      hasMore: true,
      isStale: false,
      isPresent: false,
      error: null,
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })

  test("does not expire items that don't have data", async () => {
    const { store, apiMock } = createStore({ expireAfter: 20 })

    store.doRefreshTestResources()
    await apiMock.resolveFetchRequest('collection1', 'error!')

    await timeTravelTo(21, store)

    assertCollection(store, {
      items: [],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: false,
      hasMore: true,
      isStale: false,
      isPresent: false,
      error: 'error!',
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })

  test('expires items that are pending for a retry', async () => {
    const { store, apiMock } = createStore({ expireAfter: 20 })

    store.doRefreshTestResources()
    await apiMock.resolveFetchRequest('collection1')

    store.doRefreshTestResources()
    await apiMock.resolveFetchRequest('collection1', 'error!')

    await timeTravelTo(21, store)

    assertCollection(store, {
      items: [],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: false,
      hasMore: true,
      isStale: false,
      isPresent: false,
      error: null,
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })

  test('allows to clear an item from the store', async () => {
    const { store, apiMock } = createStore({ expireAfter: 20 })

    store.doRefreshTestResources()
    await apiMock.resolveFetchRequest('collection1')

    store.doClearTestResources()

    assertCollection(store, {
      items: [],
      isRefreshing: false,
      isLoadingMore: false,
      loadMoreError: null,
      canLoadMore: false,
      hasMore: true,
      isStale: false,
      isPresent: false,
      error: null,
      errorPermanent: false,
      isReadyForRetry: false,
    })
  })
})

function createStore(settings = {}, itemId = 'collection1') {
  const apiMock = new MockApiClient()

  const apiMockBundle = {
    name: 'withApiClient',
    getExtraArgs: () => ({ apiClient: apiMock }),
  }

  const asyncCollectionBundle = createInfiniteScrollAsyncCollectionBundle({
    name: 'testResources',
    getPromise: async (items, { apiClient }) => apiClient.fetchItem(itemId),
    ...settings,
  })

  const storeFactory = composeBundlesRaw(
    createReactorBundle(),
    appTimeBundle,
    apiMockBundle,
    asyncCollectionBundle,
    pagingBundle
  )

  return { store: storeFactory(), apiMock }
}

function assertCollection(
  store,
  {
    items,
    isRefreshing,
    isLoadingMore,
    loadMoreError,
    canLoadMore,
    hasMore,
    isStale,
    isPresent,
    error,
    errorPermanent,
    isReadyForRetry,
  }
) {
  expect(store.selectTestResources()).toEqual(items)
  expect(store.selectIsRefreshingTestResources()).toBe(isRefreshing)
  expect(store.selectTestResourcesIsPresent()).toBe(isPresent)

  expect(store.selectIsLoadingMoreTestResources()).toBe(isLoadingMore)
  expect(store.selectHasMoreTestResources()).toBe(hasMore)
  expect(store.selectCanLoadMoreTestResources()).toBe(canLoadMore)
  expect(store.selectLoadMoreTestResourcesError()).toStrictEqual(loadMoreError)

  expect(store.selectTestResourcesError()).toStrictEqual(error)
  expect(store.selectTestResourcesErrorIsPermanent()).toBe(errorPermanent)
  expect(store.selectTestResourcesIsReadyForRetry()).toBe(isReadyForRetry)

  expect(store.selectTestResourcesIsStale()).toBe(isStale)
}
