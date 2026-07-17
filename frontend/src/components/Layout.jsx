import React from "react";
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import { NavLink, Outlet } from "react-router-dom";
import { Toaster } from "sonner";

const navLinkStyle = ({ isActive }) => ({
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.72rem",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  textDecoration: "none",
  padding: "6px 10px",
  color: isActive ? "#EFEFEF" : "#A1A1AA",
  borderBottom: isActive ? "2px solid #FF3B30" : "2px solid transparent",
  transition: "color 0.15s ease, border-color 0.15s ease",
});

export default function Layout({ onOpenHistory, outletContext }) {
  return (
    <>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#000",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#EDEDED",
            fontFamily: "'IBM Plex Mono', monospace",
            borderRadius: 2,
          },
        }}
      />
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: "rgba(9,9,11,0.88)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Toolbar sx={{ minHeight: "64px !important", px: { xs: 2, md: 4 }, gap: 2 }}>
          <NavLink to="/" style={{ textDecoration: "none" }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                data-testid="app-logo"
                sx={{
                  width: 26,
                  height: 26,
                  border: "1px solid #EFEFEF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  color: "#EFEFEF",
                }}
              >
                PL
              </Box>
              <Typography
                data-testid="app-title"
                sx={{
                  fontSize: { xs: "1rem", md: "1.15rem" },
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "-0.02em",
                  color: "#EFEFEF",
                }}
              >
                PromptLens
              </Typography>
            </Stack>
          </NavLink>

          <Stack direction="row" sx={{ ml: { xs: 1, md: 4 }, flexGrow: 1 }} spacing={{ xs: 0.5, md: 2 }}>
            <NavLink to="/" end style={navLinkStyle} data-testid="nav-home">Home</NavLink>
            <NavLink to="/analyze" style={navLinkStyle} data-testid="nav-analyze">Analyze</NavLink>
            <NavLink to="/compare" style={navLinkStyle} data-testid="nav-compare">Compare</NavLink>
            <NavLink to="/metrics" style={navLinkStyle} data-testid="nav-metrics">Metrics</NavLink>
            <NavLink to="/history" style={navLinkStyle} data-testid="nav-history">History</NavLink>
          </Stack>

          <IconButton
            data-testid="open-history-btn"
            onClick={onOpenHistory}
            sx={{ color: "text.primary" }}
            aria-label="Open history drawer"
          >
            <HistoryIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, md: 4 }, maxWidth: 1600 }}>
        <Outlet context={outletContext} />
      </Container>
    </>
  );
}
