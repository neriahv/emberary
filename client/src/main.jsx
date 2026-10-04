import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// Self-hosted, so the fonts load from the app itself: no third-party request,
// and the deployed content security policy needs no extra source.
import '@fontsource-variable/fraunces'
import '@fontsource-variable/nunito'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
