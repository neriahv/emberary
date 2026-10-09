// Whether an email address's domain can receive mail at all, from its DNS
// records: 'ok', 'none' (it does not exist, or says it takes no mail), or
// 'unknown' (DNS did not answer). This catches made-up and mistyped domains,
// like me@gmial.con. It cannot tell whether the mailbox itself exists: only
// sending the reader a message they open can prove that.

import { promises as dns } from 'node:dns'

// Asked when the computer's own DNS settings do not answer (some VPNs and
// security tools point them at a local address that refuses outside programs).
const PUBLIC_DNS = ['1.1.1.1', '8.8.8.8']

const isNullMx = (record) => !record.exchange || record.exchange === '.'

async function askDns(resolver, domain) {
  try {
    const records = await resolver.resolveMx(domain)
    // A "null MX" (RFC 7505) is a domain saying it accepts no mail.
    return records.some((record) => !isNullMx(record)) ? 'ok' : 'none'
  } catch (error) {
    if (error.code === 'ENOTFOUND') return 'none'
    if (error.code !== 'ENODATA') return 'unknown'
  }
  // No mail records: mail goes to the domain's own address, if it has one.
  try {
    await resolver.resolve4(domain)
    return 'ok'
  } catch (error) {
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') return 'none'
    return 'unknown'
  }
}

export async function emailDomainStatus(domain, { timeout = 3000 } = {}) {
  const status = await askDns(new dns.Resolver({ timeout, tries: 2 }), domain)
  if (status !== 'unknown') return status
  const fallback = new dns.Resolver({ timeout, tries: 2 })
  fallback.setServers(PUBLIC_DNS)
  return askDns(fallback, domain)
}
