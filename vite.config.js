import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ GitHub Pages 자동 base 설정:
// - 로컬 실행: base '/'
// - GitHub Actions(배포): base '/<repo-name>/'
const repo = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split('/')[1]
  : ''

export default defineConfig({
  plugins: [react()],
  base: repo ? `/${repo}/` : '/',
})
