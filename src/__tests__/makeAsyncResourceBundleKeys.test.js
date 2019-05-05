import makeAsyncResourceBundleKeys from '../makeAsyncResourceBundleKeys'

describe('createAsyncResourcesBundle', () => {
  test('creates correct object', () => {
    expect(makeAsyncResourceBundleKeys('myResource')).toEqual({
      selectors: {
        raw: 'selectMyResourceRaw',
        data: 'selectMyResource',
        isLoading: 'selectMyResourceIsLoading',
        isPresent: 'selectMyResourceIsPresent',
        error: 'selectMyResourceError',
        isReadyForRetry: 'selectMyResourceIsReadyForRetry',
        retryAt: 'selectMyResourceRetryAt',
        errorIsPermanent: 'selectMyResourceErrorIsPermanent',
        isStale: 'selectMyResourceIsStale',
        isPendingForFetch: 'selectMyResourceIsPendingForFetch',
      },
      keys: {
        raw: `myResourceRaw`,
        data: 'myResource',
        isLoading: 'myResourceIsLoading',
        isPresent: 'myResourceIsPresent',
        error: 'myResourceError',
        isReadyForRetry: 'myResourceIsReadyForRetry',
        retryAt: 'myResourceRetryAt',
        errorIsPermanent: 'myResourceErrorIsPermanent',
        isStale: 'myResourceIsStale',
        isPendingForFetch: 'myResourceIsPendingForFetch',
      },
      actionCreators: {
        doFetch: 'doFetchMyResource',
        doClear: 'doClearMyResource',
        doMarkAsStale: 'doMarkMyResourceAsStale',
        doAdjust: 'doAdjustMyResource',
      },
      reactors: {
        shouldExpire: 'reactMyResourceShouldExpire',
        shouldRetry: 'reactMyResourceShouldRetry',
        shouldBecomeStale: 'reactMyResourceShouldBecomeStale',
      },
    })
  })
})
