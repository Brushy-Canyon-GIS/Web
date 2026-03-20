import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import { useAuth } from '../contexts/AuthContext';
import { Link as RouterLink } from "react-router-dom"; // React Router link
import logo from "../assets/top_banner.jpg";
import { useNavigate } from 'react-router-dom';
// import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Tooltip from '@mui/material/Tooltip';

const Nav = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roundedButtonStyle = {
    borderRadius: "8px",
    margin: "0 8px",
    borderWidth: "2px"
  };

  const handleReset = () => {
    if (window.location.pathname === "/") {
      window.location.reload(); // force refresh if already home
    } else {
      navigate("/"); 
    }
  };

  const handleAboutScroll = () => {
    document.getElementById("about-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundImage: `url(${logo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: 100,
        justifyContent: "center", 
        fontFamily: "Verdana, Helvetica, sans-serif"
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
            Outcrop Analog: Brushy Canyon Formation
          </Typography>
          
          <Tooltip title="About">
            <Button
              color="inherit"
              variant="outlined"
              onClick={handleAboutScroll}
              sx={{
                borderRadius: "8px",
                margin: "0 8px",
                fontWeight: 500,
                fontSize: 30,
                textTransform: "none",
                backgroundColor: "rgba(255, 255, 255, 0.2)", // translucent background
                borderColor: "white",                          // ensures outline is visible
                color: "white",                                // text color
                minWidth: "120px",
                minHeight: "40px",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.3)", // slightly stronger on hover
                  borderColor: "white",
                },
              }}
            >
              About
            </Button>
          </Tooltip>

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