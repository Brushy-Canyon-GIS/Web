import { supabase } from '../components/supabaseClient';

export const handleSignOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    // Optional: Redirect user to login page after successful sign out
    // window.location.href = '/login'; 
  } catch (error) {
    console.error('Error signing out:', error);
  }
};
