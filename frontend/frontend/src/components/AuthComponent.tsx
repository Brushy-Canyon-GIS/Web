import SigninForm from './SignInForm';
import { supabase } from './supabaseClient';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import SignOutButton from './SignOutButton';

const AuthComponent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        const fetchUser = async () => {
          setLoading(true);
          const { data: { user } } = await supabase.auth.getUser();
          setUser(user);
          setLoading(false);
        };

        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user || null);
        });

        return () => {
          subscription?.unsubscribe();
        };
      }, []);

      if (loading) {
        return <div>Loading user...</div>;
      }

      return (
        <div>
          {user ? (
            <div>
              <h1>Welcome, {user.email}</h1>
              <SignOutButton></SignOutButton>
            </div>
          ) : (
            <div>
              <SigninForm></SigninForm>              
            </div>
          )}
        </div>
      );
};

export default AuthComponent;

