import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import SignUpForm from './components/SignUpForm.tsx'
import SignInForm from './components/SignInForm.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import HomePage from './components/HomePage.tsx';
import PageLayout from './components/PageLayout.tsx';
import App from './App.tsx';

const router = createBrowserRouter([
  {
    element: <PageLayout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/dashboard',
            element: <App />,
          },
        ],
      },
    ],
  },
  {
    path: 'signin',
    element: <SignInForm />
  },
  {
    path: 'signup',
    element: <SignUpForm />
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);