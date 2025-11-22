import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import App from './App'
import { TradingPage } from './pages/TradingPage'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/trade/:symbol" element={<TradingPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)

