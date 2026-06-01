import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerServiceWorker } from '@/registerServiceWorker'
import { bootstrapThemeFromStorage } from '@/lib/themes'

bootstrapThemeFromStorage()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

registerServiceWorker()
