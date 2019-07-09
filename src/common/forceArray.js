export default function forceArray(item) {
  if (!item) {
    return []
  }

  if (Array.isArray(item) && item.length) {
    return item
  }

  return [item]
}
