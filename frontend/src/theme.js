import { createTheme } from "@mui/material/styles";

// PromptLens dark theme — Swiss/brutalist, terminal retro-futurism
const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#09090B",
      paper: "#121214",
    },
    primary: {
      main: "#EFEFEF",
      contrastText: "#09090B",
    },
    secondary: {
      main: "#007AFF",
    },
    error: { main: "#FF3B30" },
    warning: { main: "#FFCC00" },
    success: { main: "#34C759" },
    text: {
      primary: "#EDEDED",
      secondary: "#A1A1AA",
    },
    divider: "rgba(255, 255, 255, 0.08)",
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily:
      "'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    h1: {
      fontFamily: "'IBM Plex Mono', 'Space Mono', monospace",
      fontWeight: 700,
      letterSpacing: "-0.04em",
      textTransform: "uppercase",
    },
    h2: {
      fontFamily: "'IBM Plex Mono', 'Space Mono', monospace",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      textTransform: "uppercase",
    },
    h3: {
      fontFamily: "'IBM Plex Mono', 'Space Mono', monospace",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h6: {
      fontFamily: "'IBM Plex Mono', monospace",
      fontWeight: 700,
      letterSpacing: "0.02em",
      textTransform: "uppercase",
      fontSize: "0.75rem",
    },
    body2: {
      color: "#A1A1AA",
    },
    button: {
      fontFamily: "'IBM Plex Mono', monospace",
      textTransform: "none",
      fontWeight: 500,
      letterSpacing: "0.02em",
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
          border: "1px solid rgba(255,255,255,0.08)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          boxShadow: "none",
          padding: "8px 16px",
          transition: "all 0.15s ease",
          "&:hover": { boxShadow: "none" },
        },
        containedPrimary: {
          backgroundColor: "#EFEFEF",
          color: "#09090B",
          "&:hover": { backgroundColor: "#FFFFFF" },
        },
        outlined: {
          borderColor: "rgba(255,255,255,0.2)",
          color: "#EDEDED",
          "&:hover": {
            borderColor: "#EFEFEF",
            backgroundColor: "rgba(255,255,255,0.04)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#000",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 2,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "0.7rem",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.12)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.3)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#EFEFEF",
            borderWidth: 1,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 0 },
        bar: { borderRadius: 0 },
      },
    },
  },
});

export default theme;
