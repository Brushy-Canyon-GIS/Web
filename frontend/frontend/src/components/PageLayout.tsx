import { Outlet } from 'react-router-dom';
import NavBar from './Nav.tsx'

const PageLayout = () => {
  return (
    <>
      <NavBar />
      <main style={{ padding: '2rem' }}>
        {/* Outlet renders the current matched child route element */}
        <Outlet /> 
      </main>
    </>
  );
};

export default PageLayout;
