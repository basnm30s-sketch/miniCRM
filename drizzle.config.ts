import type { Config } from 'drizzle-kit'
import { getDatabasePath } from './lib/db-config'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: getDatabasePath(),
  },
} satisfies Config
