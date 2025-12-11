import React, { useState } from 'react';
import { supabase } from './supabaseClient.tsx';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx'
import './Auth.css'

const SigninForm: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const { user } = useAuth();
  const navigate = useNavigate();


  if (user) {
    navigate('/dashboard', { replace: true });
    return null; // Don't render the login form if already authenticated
  }

  const handleSignin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Successfully logged in!');
      // Redirect to a protected page or update UI
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <div className="form-container">
        <form className="auth-form" onSubmit={handleSignin}>
          <h2>Login</h2>
          <div className="inputs">
            <div className="input-div">
              <label htmlFor="email">Email</label>
              <br></br>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-div">
              <label htmlFor="password">Password</label>
              <br></br>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          {message && <p className="message">{message}</p>}
        </form>
        <div>
          <Link to="/signup" className="sign-up-link">Don't have an account? Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default SigninForm;