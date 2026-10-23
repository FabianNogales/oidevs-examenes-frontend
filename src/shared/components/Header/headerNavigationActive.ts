import type { HeaderNavigationItem } from './header.types'

export function isHeaderDestinationActive(
  item: HeaderNavigationItem,
  location: { pathname: string; search: string },
): boolean {
  if (!item.to) return false
  const [path, search = ''] = item.to.split('?')
  if (
    location.pathname !== path &&
    (item.end || !location.pathname.startsWith(`${path}/`))
  )
    return false

  const current = new URLSearchParams(location.search)
  return [...new URLSearchParams(search)].every(
    ([name, value]) =>
      (current.get(name) ?? item.defaultSearchParams?.[name]) === value,
  )
}
