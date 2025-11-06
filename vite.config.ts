import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pagesのベースパスを設定
// リポジトリ名が異なる場合は、環境変数 VITE_BASE_PATH で設定可能
const basePath = process.env.VITE_BASE_PATH || '/zoom-clone/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? basePath : '/',
})
