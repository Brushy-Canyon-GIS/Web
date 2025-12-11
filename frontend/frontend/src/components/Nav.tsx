
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import AdbIcon from '@mui/icons-material/Adb';
import Link from '@mui/material/Link'
import { useAuth } from '../contexts/AuthContext';
import Button from '@mui/material/Button';
import { handleSignOut } from '../utils/auth';



const pages = ['Products', 'Pricing', 'Blog'];
const settings = ['Profile', 'Account', 'Dashboard', 'Logout'];

const  NavBar = () => {
  const { user } = useAuth();

  return (
    <AppBar position="fixed">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component="a"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: '#ffffff' ,
              textDecoration: 'none',
              flexGrow: 1
            }}
          >
            Brushy Canyon
          </Typography>
          {user ? (
          <>
            <Button color="inherit" onClick={handleSignOut}>
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" component={Link} href="/signin">
              Sign In
            </Button>
            <Button color="inherit" component={Link} href="/signup">
              Sign Up
            </Button>
          </>
        )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
export default NavBar;
