import { promises as dns } from 'node:dns'
// Injectable resolvers make DNS behavior testable without external requests.
export async function inspectDomain(resolver, domain) {
  try {
    const mx = await resolver.resolveMx(domain)
    if (mx.length) return mx.some((row) => row.exchange && row.exchange !== '.') ? 'ok' : 'none'
  } catch (error) {
    if (error.code === 'ENOTFOUND') return 'none'
    if (error.code !== 'ENODATA') return 'unknown'
  }
  // RFC 5321 implicit MX can use either address family.
  let unknown = false
  for (const method of ['resolve4', 'resolve6']) {
    try {
      if ((await resolver[method](domain)).length) return 'ok'
    } catch (error) {
      if (!['ENODATA', 'ENOTFOUND'].includes(error.code)) unknown = true
    }
  }
  return unknown ? 'unknown' : 'none'
}
export async function emailDomainStatus(
  domain,
  { timeout = 3000, makeResolver = () => new dns.Resolver({ timeout, tries: 1 }) } = {}
) {
  const primary = await inspectDomain(makeResolver(), domain)
  if (primary !== 'unknown') return primary
  const fallback = makeResolver()
  fallback.setServers(['1.1.1.1', '8.8.8.8'])
  return inspectDomain(fallback, domain)
}
