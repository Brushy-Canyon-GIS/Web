
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



const  NavBar = () => {
  const { user } = useAuth();
  const roundedButtonStyle = {
    borderRadius: "8px",
    margin: "0 8px",
    borderWidth: "2px"
  }

  return (
    <AppBar position="fixed"  sx={{
    backgroundColor: "#568259"
  }}>
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
            <Button color="inherit" variant="outlined" sx={roundedButtonStyle} onClick={handleSignOut}>
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" variant="outlined" component={Link} href="/signin" sx={roundedButtonStyle}>
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
