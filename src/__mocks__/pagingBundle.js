export default {
  name: 'paging',
  reducer: (state = { currentPage: null, pageSize: 10 }, action) => {
    if (action.type === 'paging.change') {
      return {
        ...state,
        ...action.payload,
      }
    }
    return state
  },
  doChangePaging: payload => ({ type: 'paging.change', payload: payload }),
  selectCurrentPage: state => state.paging.currentPage,
  selectPageSize: state => state.paging.pageSize,
}
