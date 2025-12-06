'use client';

import { handleSignOut } from '../utils/auth'; // Adjust the import path

const SignOutButton = () => {
  return (
    <button
      onClick={handleSignOut}
    >
      Sign Out
    </button>
  );
};

export default SignOutButton;
