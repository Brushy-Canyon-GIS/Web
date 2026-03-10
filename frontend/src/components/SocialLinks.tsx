import Box from '@mui/material/Box';
// import Typography from '@mui/material/Typography';
import minesLogo from "../assets/mines.png";
import githubLogo from "../assets/github.png";
import linkedinLogo from "../assets/linkedin.png";
import scholarLogo from "../assets/google_scholar.png"; // provide your own icon

const SocialLinks = () => {
  return (
    <Box display="flex" justifyContent="center" mt={2} gap={2}>
        <a
            href="https://core.mines.edu/"
            target="_blank"
            rel="noopener noreferrer"
        >
        <img
            src={minesLogo}
            alt="Mines"
            style={{ width: 40, height: 40 }}
        />
        </a>

        <a
            href="https://www.linkedin.com/in/zane-jobe"
            target="_blank"
            rel="noopener noreferrer"
        >
        <img
            src={linkedinLogo}
            alt="LinkedIn"
            style={{ width: 40, height: 40 }}
        />
        

        </a>
        
        <a
            href="https://github.com/zanejobe"
            target="_blank"
            rel="noopener noreferrer"
        >
        <img
            src={githubLogo}
            alt="GitHub"
            style={{ width: 40, height: 40 }}
        />
        </a>

        <a
            href="https://scholar.google.com/citations?user=58dKXjAAAAAJ&hl=en"
            target="_blank"
            rel="noopener noreferrer"
        >
        <img
            src={scholarLogo}
            alt="Google Scholar"
            style={{ width: 40, height: 40 }}
        />
        </a>
    </Box>
  );
};

export default SocialLinks;