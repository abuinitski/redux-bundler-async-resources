export function itemIsPendingForFetch(item, { isOnline = undefined } = {}) {
  if (isOnline !== undefined && !isOnline) {
    return false
  }

  if (itemIsLoading(item)) {
    return false
  }

  if (getItemError(item)) {
    return itemIsReadyForRetry(item)
  }

  return itemIsStale(item) || !itemIsPresent(item)
}

export function itemIsLoading(item) {
  return Boolean(item && item.isLoading)
}

export function itemIsPresent(item) {
  return Boolean(item && item.dataAt)
}

export function itemIsStale(item) {
  return Boolean(item && item.isStale)
}

export function itemIsReadyForRetry(item) {
  return Boolean(item && item.isReadyForRetry)
}

export function itemRetryAt(item) {
  if (!item || !item.retryAt) {
    return null
  }
  return item.retryAt
}

export function getItemData(item) {
  if (!itemIsPresent(item)) {
    return undefined
  }
  return item.data
}

export function getItemError(item) {
  if (!item || !item.errorAt) {
    return null
  }

  return item.error
}

export function itemErrorIsPermanent(item) {
  if (!item || !item.errorAt) {
    return false
  }

  return item.errorPermanent
}
