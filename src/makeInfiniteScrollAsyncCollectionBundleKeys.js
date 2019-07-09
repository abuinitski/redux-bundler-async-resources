import nameToCapitalizedCase from './common/nameToCapitalizedCase'

export default function makeInfiniteScrollAsyncCollectionBundleKeys(name) {
  const upName = nameToCapitalizedCase(name)

  return {
    selectors: {
      raw: `select${upName}Raw`,
      data: `select${upName}`,
      dataAt: `select${upName}DataAt`,
      dependencyValues: `select${upName}DependencyValues`,
      isDependencyResolved: `select${upName}IsDependencyResolved`,
      isStale: `select${upName}IsStale`,
    },
    keys: {
      raw: `${name}Raw`,
      data: name,
      dataAt: `${name}DataAt`,
      dependencyValues: `${name}DependencyValues`,
      isDependencyResolved: `${name}IsDependencyResolved`,
      isStale: `${name}IsStale`,
    },
    actionCreators: {
      doMarkAsStale: `doMark${upName}AsStale`,
    },
    reactors: {
      shouldBecomeStale: `react${upName}ShouldBecomeStale`,
      shouldExpire: `react${upName}ShouldExpire`,
    },
  }
}
