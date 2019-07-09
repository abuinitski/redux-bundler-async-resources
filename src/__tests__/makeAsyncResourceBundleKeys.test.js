import makeAsyncResourceBundleKeys from '../makeAsyncResourceBundleKeys'

describe('makeAsyncResourceBundleKeys', () => {
  test('creates correct object', () => {
    expect(makeAsyncResourceBundleKeys('myResource')).toEqual({
      selectors: {
        raw: 'selectMyResourceRaw',
        data: 'selectMyResource',
        dataAt: 'selectMyResourceDataAt',
        dependencyValues: 'selectMyResourceDependencyValues',
        isLoading: 'selectMyResourceIsLoading',
        isPresent: 'selectMyResourceIsPresent',
        error: 'selectMyResourceError',
        errorAt: 'selectMyResourceErrorAt',
        hasError: 'selectMyResourceHasError',
        isReadyForRetry: 'selectMyResourceIsReadyForRetry',
        retryAt: 'selectMyResourceRetryAt',
        errorIsPermanent: 'selectMyResourceErrorIsPermanent',
        isDependencyResolved: 'selectMyResourceIsDependencyResolved',
        isStale: 'selectMyResourceIsStale',
        isPendingForFetch: 'selectMyResourceIsPendingForFetch',
      },
      keys: {
        raw: `myResourceRaw`,
        data: 'myResource',
        dataAt: 'myResourceDataAt',
        isLoading: 'myResourceIsLoading',
        isPresent: 'myResourceIsPresent',
        error: 'myResourceError',
        errorAt: 'myResourceErrorAt',
        hasError: 'myResourceHasError',
        isReadyForRetry: 'myResourceIsReadyForRetry',
        retryAt: 'myResourceRetryAt',
        errorIsPermanent: 'myResourceErrorIsPermanent',
        isDependencyResolved: 'myResourceIsDependencyResolved',
        dependencyValues: 'myResourceDependencyValues',
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
        shouldUpdateDependencyValues: 'reactMyResourceShouldUpdateDependencyValues',
        shouldBecomeStale: 'reactMyResourceShouldBecomeStale',
      },
    })
  })
})
