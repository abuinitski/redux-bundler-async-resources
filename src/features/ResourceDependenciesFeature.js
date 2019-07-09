import { createSelector } from 'redux-bundler'

import forceArray from '../common/forceArray'
import keyToSelector from '../common/keyToSelector'

export default class ResourceDependenciesFeature {
  static withInputOptions(inputOptions, { bundleKeys, baseActionTypeName }) {
    const {
      allDependencyKeys,
      dependencyKeysThatStaleResource,
      dependencyKeysAllowedToBeBlank,
    } = this.#cookInputOptions(inputOptions)

    return new ResourceDependenciesFeature({
      bundleKeys,
      baseActionTypeName,
      allDependencyKeys,
      dependencyKeysThatStaleResource,
      dependencyKeysAllowedToBeBlank,
    })
  }

  #enabled = false
  #bundleKeys = null
  #actions = null
  #allDependencyKeys = []
  #dependencyKeysThatStaleResource = new Set()
  #dependencyKeysAllowedToBeBlank = new Set()

  constructor({
    bundleKeys,
    baseActionTypeName,
    allDependencyKeys,
    dependencyKeysThatStaleResource,
    dependencyKeysAllowedToBeBlank,
  }) {
    this.#enabled = Boolean(allDependencyKeys.length)
    this.#bundleKeys = bundleKeys
    this.#actions = {
      DEPENDENCIES_CHANGED: `${baseActionTypeName}_DEPENDENCIES_CHANGED`,
    }
    this.#allDependencyKeys = allDependencyKeys
    this.#dependencyKeysThatStaleResource = dependencyKeysThatStaleResource
    this.#dependencyKeysAllowedToBeBlank = dependencyKeysAllowedToBeBlank
  }

  enhanceCleanState(cleanState, currentState) {
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

  enhanceReducer(originalReducer, { makeCleanState }) {
    if (!this.#enabled) {
      return originalReducer
    }

    return (originalState, action) => {
      const state = originalReducer(originalState, action)

      if (action.type === this.#actions.DEPENDENCIES_CHANGED) {
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
      }

      return state
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

      [selectors.dependencyValues]: createSelector(
        selectors.raw,
        ({ dependencyValues }) => dependencyValues
      ),

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
            dependencyKeys.some((key, keyIndex) => dependencyValues[key] !== nextDependencyValuesList[keyIndex])

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
        const { allDependencyKeys, dependencyKeysThatStaleResource, dependencyKeysAllowedToBeBlank } = options

        if (typeof option === 'string') {
          allDependencyKeys.push(option)
        } else {
          const { key, staleOnChange, allowBlank } = option
          allDependencyKeys.push(key)
          if (staleOnChange) {
            dependencyKeysThatStaleResource.add(key)
          }
          if (allowBlank) {
            dependencyKeysAllowedToBeBlank.add(key)
          }
        }

        return options
      },
      {
        allDependencyKeys: [],
        dependencyKeysThatStaleResource: new Set(),
        dependencyKeysAllowedToBeBlank: new Set(),
      }
    )
  }

  static #getChangedKeys(left, right) {
    return Object.keys(left).filter(key => left[key] !== right[key])
  }
}
