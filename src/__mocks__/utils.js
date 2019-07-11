export async function tapReactors() {
  const tapOneReactor = () => new Promise(resolve => setTimeout(resolve, 0))
  await tapOneReactor()
  await tapOneReactor()
  await tapOneReactor()
}
