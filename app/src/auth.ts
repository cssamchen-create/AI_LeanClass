import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { Client } from 'ldapts'
import { prisma } from '@/lib/prisma'

const devProvider = Credentials({
  id: 'dev',
  name: '開發登入',
  credentials: {
    username: { label: '帳號 (adAccount)', type: 'text', placeholder: 'hr01 / employee01 / manager01' },
    password: { label: '密碼', type: 'password', placeholder: 'dev' },
  },
  async authorize(credentials) {
    if (credentials?.password !== 'dev') return null
    const employee = await prisma.employee.findUnique({
      where: { adAccount: credentials.username as string },
    })
    if (!employee || !employee.isActive) return null
    return {
      id: employee.adAccount,
      name: employee.name,
      email: employee.email,
      role: employee.role,
    }
  },
})

const ldapProvider = Credentials({
  id: 'ldap',
  name: 'SSO',
  credentials: {
    username: { label: '帳號', type: 'text' },
    password: { label: '密碼', type: 'password' },
  },
  async authorize(credentials) {
    if (!credentials?.username || !credentials?.password) return null

    const ldapUri = process.env.LDAP_URI
    const baseDn = process.env.LDAP_BASE_DN

    if (!ldapUri || !baseDn) {
      throw new Error('LDAP 設定缺失')
    }

    const client = new Client({ url: ldapUri })

    try {
      const userDn = `CN=${credentials.username},${baseDn}`
      await client.bind(userDn, credentials.password as string)

      const { searchEntries } = await client.search(baseDn, {
        filter: `(sAMAccountName=${credentials.username})`,
        attributes: ['sAMAccountName', 'mail', 'displayName', 'memberOf'],
      })

      if (searchEntries.length === 0) return null

      const entry = searchEntries[0]
      const memberOf = Array.isArray(entry.memberOf) ? entry.memberOf : [entry.memberOf]
      const isHR = memberOf.some(
        (group) => typeof group === 'string' && group.includes('HR'),
      )

      return {
        id: entry.sAMAccountName as string,
        name: entry.displayName as string,
        email: entry.mail as string,
        role: isHR ? 'HR' : 'EMPLOYEE',
      }
    } catch {
      return null
    } finally {
      await client.unbind()
    }
  },
})

const isDevAuth = process.env.DEV_AUTH_ENABLED === 'true'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: isDevAuth ? [devProvider] : [ldapProvider],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
