import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AuthComponent from './components/AuthComponent.tsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import SignUpForm from './components/SignUpForm.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />, // Your main component or a layout component
    children: [
      // Define your nested routes here
      { path: 'signin', element: <AuthComponent /> },
      { path: 'signup', element: <SignUpForm />}
    ],
  },
  // Add other top-level routes as needed
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
