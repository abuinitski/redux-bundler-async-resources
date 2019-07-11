export default function isErrorPermanent(error) {
  return Boolean(error && error.permanent)
}
