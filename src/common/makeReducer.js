export default function makeReducer(actionHandlers, initialState) {
  return (state = initialState, action) => {
    const actionHandler = actionHandlers[action.type]
    if (actionHandler) {
      return actionHandler(state, action)
    }
    return state
  }
}
