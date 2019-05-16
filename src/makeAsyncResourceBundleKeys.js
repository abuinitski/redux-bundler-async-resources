import nameToCapitalizedCase from './common/nameToCapitalizedCase'

export default function makeAsyncResourceBundleKeys(name) {
  const upName = nameToCapitalizedCase(name)

  return {
    selectors: {
      raw: `select${upName}Raw`,
      data: `select${upName}`,
      dependencyValues: `select${upName}DependencyValues`,
      isLoading: `select${upName}IsLoading`,
      isPresent: `select${upName}IsPresent`,
      error: `select${upName}Error`,
      isReadyForRetry: `select${upName}IsReadyForRetry`,
      retryAt: `select${upName}RetryAt`,
      errorIsPermanent: `select${upName}ErrorIsPermanent`,
      isStale: `select${upName}IsStale`,
      isPendingForFetch: `select${upName}IsPendingForFetch`,
      isDependencyResolved: `select${upName}IsDependencyResolved`,
    },
    keys: {
      raw: `${name}Raw`,
      data: name,
      isLoading: `${name}IsLoading`,
      isPresent: `${name}IsPresent`,
      error: `${name}Error`,
      isReadyForRetry: `${name}IsReadyForRetry`,
      retryAt: `${name}RetryAt`,
      errorIsPermanent: `${name}ErrorIsPermanent`,
      isStale: `${name}IsStale`,
      isPendingForFetch: `${name}IsPendingForFetch`,
      isDependencyResolved: `${name}IsDependencyResolved`,
    },
    actionCreators: {
      doFetch: `doFetch${upName}`,
      doClear: `doClear${upName}`,
      doMarkAsStale: `doMark${upName}AsStale`,
      doAdjust: `doAdjust${upName}`,
    },
    reactors: {
      shouldExpire: `react${upName}ShouldExpire`,
      shouldRetry: `react${upName}ShouldRetry`,
      shouldBecomeStale: `react${upName}ShouldBecomeStale`,
      shouldUpdateDependencyValues: `react${upName}ShouldUpdateDependencyValues`,
    },
  }
}
