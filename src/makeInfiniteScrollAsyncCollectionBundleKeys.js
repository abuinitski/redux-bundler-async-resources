import BundleConstantsBuilder from './common/BundleConstantsBuilder'
import { InfiniteScrollAsyncCollectionBundleFeatures } from './createInfiniteScrollAsyncCollectionBundle'

export default function makeInfiniteScrollAsyncCollectionBundleKeys(name) {
  const builder = new BundleConstantsBuilder(name)

  builder
    .addSelector('raw')
    .addSelector('data', 'select:UPNAME:', ':NAME:')
    .addSelector('dataAt')
    .addSelector('isRefreshing', 'selectIsRefreshing:UPNAME:', 'isRefreshing:UPNAME:')
    .addSelector('isPresent')
    .addSelector('isLoadingMore', 'selectIsLoadingMore:UPNAME:', 'isLoadingMore:UPNAME:')
    .addSelector('isPendingForRefresh')
    .addSelector('canLoadMore', 'selectCanLoadMore:UPNAME:', 'canLoadMore:UPNAME:')
    .addSelector('hasMore', 'selectHasMore:UPNAME:', 'hasMore:UPNAME:')
    .addSelector('loadMoreError', 'selectLoadMore:UPNAME:Error', 'loadMore:UPNAME:Error')
    .addSelector(
      'loadMoreErrorIsPermanent',
      'selectLoadMore:UPNAME:ErrorIsPermanent',
      'loadMore:UPNAME:ErrorIsPermanent'
    )

    .addActionCreator('doRefresh')
    .addActionCreator('doLoadMore')

  InfiniteScrollAsyncCollectionBundleFeatures.forEach(featureClass => featureClass.addBundleConstants(builder))

  return builder.buildBundleConstants()
}
