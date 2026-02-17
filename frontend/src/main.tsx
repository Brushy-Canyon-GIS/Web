// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import SignUpForm from './components/SignUpForm';
import SignInForm from './components/SignInForm';

// No AuthProvider needed if you don't require login
// If some components depend on it, you can keep it but ignore login logic

const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <App /> // always accessible
  },
  {
    path: '/signin',
    element: <SignInForm /> // optional
  },
  {
    path: '/signup',
    element: <SignUpForm /> // optional
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
