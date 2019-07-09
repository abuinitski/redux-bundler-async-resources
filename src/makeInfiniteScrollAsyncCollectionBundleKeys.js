import BundleConstantsBuilder from './common/BundleConstantsBuilder'
import { InfiniteScrollAsyncCollectionBundleFeatures } from './createInfiniteScrollAsyncCollectionBundle'

export default function makeInfiniteScrollAsyncCollectionBundleKeys(name) {
  const builder = new BundleConstantsBuilder(name)

  InfiniteScrollAsyncCollectionBundleFeatures.forEach(featureClass => featureClass.addBundleConstants(builder))

  return builder.buildBundleConstants()
}
