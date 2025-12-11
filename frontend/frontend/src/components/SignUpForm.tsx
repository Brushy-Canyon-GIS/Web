import React, { useState } from 'react';
import { supabase } from './supabaseClient.tsx';
import { Link } from 'react-router-dom';
import './Auth.css'

const SignUpForm: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Please check your email to confirm your account!');
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <div className="form-container">
        <form className="auth-form" onSubmit={handleSignup}>
          <h2>Sign Up</h2>
          <div className="inputs">
            <div className="input-div">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-div">
              <label htmlFor="password">Password:</label>
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
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
          {message && <p className="message">{message}</p>}
        </form>
        <div>
          <Link to="/signin" className="sign-up-link">Already have an account? Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default SignUpForm;