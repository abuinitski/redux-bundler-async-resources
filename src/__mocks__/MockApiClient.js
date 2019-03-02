const Items = {
  1: 'One',
  2: 'Two',
  3: 'Three'
}

export default function MockApiClient() {
  let requestQueue = []

  this.fetchItem = itemId =>
    new Promise((resolve, reject) => {
      requestQueue.push({
        itemId,
        resolve,
        reject,
        resolved: false,
      })
    })

  this.resolveFetchRequest = async (itemId, error = null) => {
    const index = requestQueue.findIndex(r => r.itemId === itemId && !r.resolved)
    if (index < 0) {
      throw new Error(`ApiClient.resolveFetchRequest: item "${itemId}" is not in the request queue`)
    }

    const request = requestQueue[index]

    requestQueue[index] = {
      ...request,
      resolved: true,
    }

    const item = Items[itemId]
    if (!item) {
      request.reject('404')
    } else if (error) {
      request.reject(error)
    } else {
      request.resolve(item)
    }
  }

  this.pendingQueueCount = itemId => requestQueue.filter(r => r.itemId === itemId && !r.resolved).length
}
