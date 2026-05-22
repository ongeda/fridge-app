import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// 서비스 워커 등록 (푸시 알림용) - 배포 환경에서만 동작
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('서비스 워커 등록 실패:', err)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
