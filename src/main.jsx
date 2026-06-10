import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerServiceWorker } from '@/registerServiceWorker'
import UpdatePrompt from '@/components/shared/UpdatePrompt'
import { bootstrapThemeFromStorage } from '@/lib/themes'

bootstrapThemeFromStorage()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <UpdatePrompt />
  </React.StrictMode>,
)

registerServiceWorker()