import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
// import Button from '@mui/material/Button';
// import { useAuth } from '../contexts/AuthContext';
// import { Link as RouterLink } from "react-router-dom"; 
import logo from "../assets/top_banner.jpg";

const About = () => {
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
            sx={{
              color: "white",
              fontWeight: "bold",
              flexGrow: 1
            }}
          >
            About
          </Typography>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default About;