import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker, requestNotificationPermission } from './lib/notifications'

registerServiceWorker().then(() => {
  requestNotificationPermission()
})

const root = document.getElementById('root')
if (!root) {
  document.body.innerHTML = '<div style="padding:20px;font-family:sans-serif;color:red">Error: #root element not found</div>'
} else {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch (e) {
    root.innerHTML = `<div style="padding:20px;font-family:sans-serif">
      <h2 style="color:red">App Failed to Load</h2>
      <p>Check browser console (F12) for errors.</p>
      <pre style="background:#f5f5f5;padding:10px;border-radius:4px;overflow:auto">${e instanceof Error ? e.message : String(e)}</pre>
    </div>`
  }
}
