// Copies the pdf.js worker into /public so the reader can load it from the same origin.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

try {
  const pdfjsDir = dirname(require.resolve('pdfjs-dist/package.json', { paths: [require.resolve('react-pdf')] }))
  const source = join(pdfjsDir, 'build', 'pdf.worker.min.mjs')
  const target = join(process.cwd(), 'public', 'pdf.worker.min.mjs')
  if (!existsSync(join(process.cwd(), 'public'))) mkdirSync(join(process.cwd(), 'public'))
  copyFileSync(source, target)
  console.log('[booktor] pdf.worker.min.mjs copied to /public')
} catch (error) {
  console.warn('[booktor] Could not copy pdf.js worker:', error instanceof Error ? error.message : error)
}
