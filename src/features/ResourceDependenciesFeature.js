import { createSelector } from 'redux-bundler'

import forceArray from '../common/forceArray'
import keyToSelector from '../common/keyToSelector'

export default class ResourceDependenciesFeature {
  static addBundleConstants(builder) {
    builder
      .addSelector('dependencyValues')
      .addSelector('isDependencyResolved')
      .addReactor('shouldUpdateDependencyValues')
  }

  static withInputOptions(inputOptions, { name, bundleKeys, baseActionTypeName }) {
    const {
      allDependencyKeys,
      equalities,
      dependencyKeysThatStaleResource,
      dependencyKeysAllowedToBeBlank,
    } = this.#cookInputOptions(inputOptions)

    return new ResourceDependenciesFeature({
      name,
      bundleKeys,
      baseActionTypeName,
      allDependencyKeys,
      equalities,
      dependencyKeysThatStaleResource,
      dependencyKeysAllowedToBeBlank,
    })
  }

  #name = null
  #enabled = false
  #bundleKeys = null
  #actions = null
  #allDependencyKeys = []
  #equalities = new Map()
  #dependencyKeysThatStaleResource = new Set()
  #dependencyKeysAllowedToBeBlank = new Set()

  constructor({
    name,
    bundleKeys,
    baseActionTypeName,
    allDependencyKeys,
    equalities,
    dependencyKeysThatStaleResource,
    dependencyKeysAllowedToBeBlank,
  }) {
    this.#name = name
    this.#enabled = Boolean(allDependencyKeys.length)
    this.#bundleKeys = bundleKeys
    this.#actions = {
      DEPENDENCIES_CHANGED: `${baseActionTypeName}_DEPENDENCIES_CHANGED`,
    }
    this.#allDependencyKeys = allDependencyKeys
    this.#equalities = equalities
    this.#dependencyKeysThatStaleResource = dependencyKeysThatStaleResource
    this.#dependencyKeysAllowedToBeBlank = dependencyKeysAllowedToBeBlank
  }

  getInitHandler() {
    return store => {
      const dependencyValues = store.select(this.#allDependencyKeys.map(keyToSelector))
      const storeState = store.getState()

      store.dispatch({
        type: 'REPLACE_STATE',
        payload: {
          ...storeState,
          [this.#name]: {
            ...storeState[this.#name],
            dependencyValues,
          },
        },
      })
    }
  }

  enhanceCleanState(cleanState, currentState = undefined) {
    if (currentState) {
      return {
        ...cleanState,
        dependencyValues: currentState.dependencyValues,
      }
    }

    return {
      ...cleanState,
      dependencyValues: (currentState && currentState.dependencyValues) || null,
    }
  }

  getActionHandlers({ makeCleanState }) {
    if (!this.#enabled) {
      return {}
    }

    return {
      [this.#actions.DEPENDENCIES_CHANGED]: (state, action) => {
        const nextDependencyValues = action.payload

        const stale =
          Boolean(state.dependencyValues) &&
          ResourceDependenciesFeature.#getChangedKeys(state.dependencyValues, nextDependencyValues).every(key =>
            this.#dependencyShouldStaleResource(key)
          )

        if (stale) {
          return {
            ...state,
            isStale: true,
            dependencyValues: nextDependencyValues,
          }
        } else {
          return {
            ...makeCleanState(state),
            dependencyValues: nextDependencyValues,
          }
        }
      },
    }
  }

  enhanceThunkArgs(promiseArgs) {
    if (!this.#enabled) {
      return promiseArgs
    }

    return {
      ...promiseArgs,
      ...promiseArgs.store[this.#bundleKeys.selectors.dependencyValues](),
    }
  }

  enhanceBundle(bundle) {
    const { selectors, reactors } = this.#bundleKeys
    const dependencyKeys = this.#allDependencyKeys

    if (!this.#enabled) {
      const blankDependencyValues = []
      return {
        ...bundle,
        [selectors.dependencyValues]: () => blankDependencyValues,
        [selectors.isDependencyResolved]: () => true,
      }
    }

    return {
      ...bundle,

      [selectors.dependencyValues]: createSelector(selectors.raw, ({ dependencyValues }) => dependencyValues),

      [selectors.isDependencyResolved]: createSelector(
        selectors.dependencyValues,
        dependencyValues =>
          Boolean(dependencyValues) &&
          dependencyKeys.every(key => {
            const value = dependencyValues[key]
            return this.#dependencyCanBeBlank(key) || (value !== null && value !== undefined)
          })
      ),

      [reactors.shouldUpdateDependencyValues]: createSelector(
        selectors.dependencyValues,
        ...dependencyKeys.map(keyToSelector),
        (dependencyValues, ...nextDependencyValuesList) => {
          const dependenciesChanged =
            !dependencyValues ||
            dependencyKeys.some((key, keyIndex) => {
              const value = dependencyValues[key]
              const nextValue = nextDependencyValuesList[keyIndex]
              return !this.#equalities.get(key)(value, nextValue)
            })

          if (dependenciesChanged) {
            const payload = nextDependencyValuesList.reduce(
              (hash, value, index) => ({
                ...hash,
                [dependencyKeys[index]]: value,
              }),
              {}
            )

            return { type: this.#actions.DEPENDENCIES_CHANGED, payload }
          }
        }
      ),
    }
  }

  #dependencyShouldStaleResource(key) {
    return this.#dependencyKeysThatStaleResource.has(key)
  }

  #dependencyCanBeBlank(key) {
    return this.#dependencyKeysAllowedToBeBlank.has(key)
  }

  static #cookInputOptions(inputOptions) {
    const { dependencyKey = null } = inputOptions

    return forceArray(dependencyKey).reduce(
      (options, option) => {
        const {
          allDependencyKeys,
          equalities,
          dependencyKeysThatStaleResource,
          dependencyKeysAllowedToBeBlank,
        } = options

        if (typeof option === 'string') {
          allDependencyKeys.push(option)
          equalities.set(option, this.#shallowEquality)
        } else {
          const { key, staleOnChange, allowBlank, equality = this.#shallowEquality } = option

          allDependencyKeys.push(key)

          if (staleOnChange) {
            dependencyKeysThatStaleResource.add(key)
          }

          if (allowBlank) {
            dependencyKeysAllowedToBeBlank.add(key)
          }

          equalities.set(key, equality)
        }

        return options
      },
      {
        allDependencyKeys: [],
        equalities: new Map(),
        dependencyKeysThatStaleResource: new Set(),
        dependencyKeysAllowedToBeBlank: new Set(),
      }
    )
  }

  static #getChangedKeys(left, right) {
    return Object.keys(left).filter(key => left[key] !== right[key])
  }

  static #shallowEquality(left, right) {
    return left === right
  }
}
