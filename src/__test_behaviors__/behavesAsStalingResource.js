import { timeTravelTo } from '../__mocks__/time'

export default function behavesAsStalingResource({ selectors, actionCreators }, { fetchActionCreator, createStore }) {
  describe('staling feature', () => {
    test('marks item as stale manually', async () => {
      const { store, apiMock } = createStore({ staleAfter: 15 })

      store[fetchActionCreator]()

      await apiMock.resolveAllFetchRequests()

      store[actionCreators.doMarkAsStale]()

      expect(store[selectors.isPresent]()).toBe(true)
      expect(store[selectors.isStale]()).toBe(true)

      await timeTravelTo(16, store)

      expect(store[selectors.isPresent]()).toBe(true)
      expect(store[selectors.isStale]()).toBe(true)
    })

    test('marks item as stale with a timer', async () => {
      const { store, apiMock } = createStore({ staleAfter: 15 })

      store[fetchActionCreator]()

      await apiMock.resolveAllFetchRequests()

      expect(store[selectors.isStale]()).toBe(false)

      await timeTravelTo(16, store)

      expect(store[selectors.isStale]()).toBe(true)
    })
  })
}
