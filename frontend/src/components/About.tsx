import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
// import Button from '@mui/material/Button';
// import { useAuth } from '../contexts/AuthContext';
// import { Link as RouterLink } from "react-router-dom"; 
import lower_banner from "../assets/lower_banner.jpg";
import right_about from "../assets/right_about.jpg";
import below_about from "../assets/below_about.jpg";
import SocialLinks from './SocialLinks';

const About = () => {
  return (
    <AppBar
      position="static"
      sx={{
        top: "auto",
        bottom: 0,
        backgroundColor: "#464444", // dark background
        height: 1200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between", // pushes img to bottom
        // padding: "1rem 0"
      }}
    >
      {/* Lower Banner now at the top */}
      <img
        src={lower_banner}
        alt="About Banner"
        style={{
          width: "100%",
          objectFit: "cover",
          height: "300px",
          marginBottom: "2rem"
        }}
      />

      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ 
          minHeight: 0,
          display: "flex",
          flexDirection: { xs: "column", md: "row" }, // stack children vertically
          alignItems: "flex-start", // align text to the left
          gap: 1 // optional spacing between header and text  
        }}>
          <Typography
            variant="h4"
            sx={{
              color: "white",
              fontWeight: "bold"
            }}
          >
            About
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "white", marginTop: 10 }}
          >
            This dataset forms the basis of a joint industry project (JIP) focused on outcrop-to-subsurface characterization of the Delaware Mountain Group with applications for: <br />
            <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
              <li>Delaware Basin hydrocarbon production</li>
              <li>Delaware Basin salt-water disposal</li>
              <li>Conventional reservoir model parameterization</li>
              <li>Field-based training for geoscientists and mixed-discipline teams</li>
            </ul>
            <br />
            Please contact Zane Jobe (zanejobe@mines.edu) with interest, or to contribute data.  <br />

            Proudly using VRGS by{" "}
            <a
              href="https://www.vrgeoscience.com"
              target="_blank" // opens in a new tab
              rel="noopener noreferrer" // security best practice
              style={{ color: "#4fc3f7", textDecoration: "underline" }} // optional styling
            >
              VRG Geoscience
            </a>
            <br />
            <SocialLinks />
            <br />
            Website created by: <br />
            Chris Giere, Katie Schneider Assaf, Varsha Sathiskumar
          </Typography>
          {/* Image to the right*/}
          <img
            src={right_about}
            alt="right about picture"
            style={{
              width: "300px",      
              maxWidth: "100%",   
              height: "auto",      
              objectFit: "contain", 
              borderRadius: "8px"
            }}
          />
        </Toolbar>
      </Container>

      
      {/* Lower banner image*/}
      <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          marginTop: "-5rem",
          marginBottom: "2rem" 
        }}
      >
        <img
          src={below_about}
          alt="below about picture"
          style={{
            width: "500px",      
            maxWidth: "100%",   
            height: "auto",      
            objectFit: "contain", 
            borderRadius: "8px"
          }}
        />
      </div>
    </AppBar>
  );
};

export default About;