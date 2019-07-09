import BundleConstantsBuilder from './common/BundleConstantsBuilder'

export default function makeAsyncResourcesBundleKeys(name) {
  const builder = new BundleConstantsBuilder(name)

  builder
    .addSelector('raw')
    .addSelector('items', 'selectItemsOf:UPNAME:', 'itemsOf:UPNAME:')
    .addSelector('nextExpiringItem', 'selectNextExpiringItemOf:UPNAME:', 'nextExpiringItemOf:UPNAME:')
    .addSelector('nextRetryingItem', 'selectNextRetryingItemOf:UPNAME:', 'nextRetryingItemOf:UPNAME:')
    .addSelector('nextStaleItem', 'selectNextStaleItemOf:UPNAME:', 'nextStaleItemOf:UPNAME:')

    .addActionCreator('doFetch', 'doFetchItemOf:UPNAME:')
    .addActionCreator('doClear', 'doClearItemOf:UPNAME:')
    .addActionCreator('doAdjust', 'doAdjustItemOf:UPNAME:')
    .addActionCreator('doMarkAsStale', 'doMarkItemOf:UPNAME:AsStale')

    .addReactor('shouldExpire', 'reactItemOf:UPNAME:ShouldExpire')
    .addReactor('shouldRetry', 'reactItemOf:UPNAME:ShouldRetry')
    .addReactor('shouldBecomeStale', 'reactItemOf:UPNAME:ShouldBecomeStale')

  return builder.buildBundleConstants()
}
