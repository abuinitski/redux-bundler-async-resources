export default function makeAsyncResourcesBundleKeys(name) {
  const upName = name.charAt(0).toUpperCase() + name.slice(1)

  return {
    selectors: {
      raw: `select${upName}Raw`,
      items: `selectItemsOf${upName}`,
      nextExpiringItem: `selectNextExpiringItemOf${upName}`,
      nextRetryingItem: `selectNextRetryingItemOf${upName}`,
      nextStaleItem: `selectNextStaleItemOf${upName}`,
    },
    keys: {
      raw: `${name}Raw`,
      items: `itemsOf${upName}`,
      nextExpiringItem: `nextExpiringItemOf${upName}`,
      nextRetryingItem: `nextRetryingItemOf${upName}`,
      nextStaleItem: `nextStaleItemOf${upName}`,
    },
    actionCreators: {
      doFetch: `doFetchItemOf${upName}`,
      doClear: `doClearItemOf${upName}`,
      doMarkAsStale: `doMarkItemOf${upName}AsStale`,
      doAdjust: `doAdjustItemOf${upName}`,
    },
    reactors: {
      shouldExpire: `reactItemOf${upName}ShouldExpire`,
      shouldRetry: `reactItemOf${upName}ShouldRetry`,
      shouldBecomeStale: `reactItemOf${upName}ShouldBecomeStale`,
    },
  }
}
