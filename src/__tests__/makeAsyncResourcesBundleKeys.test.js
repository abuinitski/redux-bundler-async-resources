import makeAsyncResourcesBundleKeys from '../makeAsyncResourcesBundleKeys'

describe('makeAsyncResourcesBundleKeys', () => {
  test('creates correct object', () => {
    expect(makeAsyncResourcesBundleKeys('myResources')).toEqual({
      selectors: {
        raw: `selectMyResourcesRaw`,
        items: `selectItemsOfMyResources`,
        nextExpiringItem: `selectNextExpiringItemOfMyResources`,
        nextRetryingItem: `selectNextRetryingItemOfMyResources`,
        nextStaleItem: `selectNextStaleItemOfMyResources`,
      },
      keys: {
        raw: `myResourcesRaw`,
        items: `itemsOfMyResources`,
        nextExpiringItem: `nextExpiringItemOfMyResources`,
        nextRetryingItem: `nextRetryingItemOfMyResources`,
        nextStaleItem: `nextStaleItemOfMyResources`,
      },
      actionCreators: {
        doFetch: `doFetchItemOfMyResources`,
        doClear: `doClearItemOfMyResources`,
        doMarkAsStale: `doMarkItemOfMyResourcesAsStale`,
        doAdjust: `doAdjustItemOfMyResources`,
      },
      reactors: {
        shouldExpire: `reactItemOfMyResourcesShouldExpire`,
        shouldRetry: `reactItemOfMyResourcesShouldRetry`,
        shouldBecomeStale: `reactItemOfMyResourcesShouldBecomeStale`,
      },
    })
  })
})
