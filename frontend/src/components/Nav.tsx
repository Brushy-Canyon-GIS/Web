import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import { useAuth } from '../contexts/AuthContext';
import { Link as RouterLink } from "react-router-dom"; // React Router link
import logo from "../assets/top_banner.jpg";
import { useNavigate } from 'react-router-dom';

const Nav = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roundedButtonStyle = {
    borderRadius: "8px",
    margin: "0 8px",
    borderWidth: "2px"
  };

  const handleReset = () => {
    navigate("/");       // navigate to home
    window.scrollTo(0,0) // optional: scroll to top
  };
  
  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundImage: `url(${logo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: 100,
        justifyContent: "center" // vertically centers the content
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: 100 }}>
          <Typography
            variant="h4"
            onClick={handleReset}
            sx={{
              color: "white",
              fontWeight: "bold",
              flexGrow: 1,
              cursor: "pointer",
            }}
          >
            Outcrop Analog
          </Typography>

          {user ? (
            <>
              {/* Sign Out button can go here */}
            </>
          ) : (
            <>
              <Button
                color="inherit"
                variant="outlined"
                component={RouterLink}
                to="/signin"
                sx={roundedButtonStyle}
              >
                Sign In
              </Button>
              <Button
                color="inherit"
                component={RouterLink}
                to="/signup"
              >
                Sign Up
              </Button>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Nav;