import timekeeper from 'timekeeper'
import { tapReactors } from './utils'

export const START_TIME = 1000

export function setUpTimeTravel() {
  beforeEach(() => timekeeper.freeze(START_TIME))

  afterEach(() => timekeeper.reset())
}

export function timeTravelTo(time, store) {
  return new Promise(async (resolve, reject) => {
    try {
      timekeeper.travel(START_TIME + time)
      store.dispatch({ type: 'dummy action', payload: null }) // just tap the app time
      await tapReactors()
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}
