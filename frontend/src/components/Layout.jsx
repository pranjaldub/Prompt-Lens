import React, { useState } from "react";
import {
  AppBar,
  Box,
  Container,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import MenuIcon from "@mui/icons-material/MenuOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
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

const mobileNavLinkStyle = ({ isActive }) => ({
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.95rem",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  textDecoration: "none",
  padding: "14px 4px",
  color: isActive ? "#EFEFEF" : "#A1A1AA",
  borderLeft: isActive ? "2px solid #FF3B30" : "2px solid transparent",
  paddingLeft: "14px",
});

const NAV_ITEMS = [
  { to: "/", label: "Home", end: true, testid: "nav-home" },
  { to: "/analyze", label: "Analyze", testid: "nav-analyze" },
  { to: "/compare", label: "Compare", testid: "nav-compare" },
  { to: "/metrics", label: "Metrics", testid: "nav-metrics" },
  { to: "/history", label: "History", testid: "nav-history" },
];

export default function Layout({ onOpenHistory, outletContext }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
        <Toolbar sx={{ minHeight: { xs: "56px !important", md: "64px !important" }, px: { xs: 1.5, sm: 2, md: 4 }, gap: { xs: 1, md: 2 } }}>
          <IconButton
            data-testid="open-mobile-nav-btn"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
            sx={{ color: "text.primary", display: { xs: "inline-flex", md: "none" }, ml: -1 }}
          >
            <MenuIcon />
          </IconButton>

          <NavLink to="/" style={{ textDecoration: "none", minWidth: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                data-testid="app-logo"
                sx={{
                  width: 26,
                  height: 26,
                  flexShrink: 0,
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
                  fontSize: { xs: "0.9rem", sm: "1rem", md: "1.15rem" },
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "-0.02em",
                  color: "#EFEFEF",
                  whiteSpace: "nowrap",
                }}
              >
                PromptLens
              </Typography>
            </Stack>
          </NavLink>

          <Stack
            direction="row"
            sx={{ ml: 4, flexGrow: 1, display: { xs: "none", md: "flex" } }}
            spacing={2}
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={navLinkStyle}
                data-testid={item.testid}
              >
                {item.label}
              </NavLink>
            ))}
          </Stack>

          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />

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

      <Drawer
        anchor="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        data-testid="mobile-nav-drawer"
        PaperProps={{
          sx: {
            width: "78%",
            maxWidth: 300,
            backgroundColor: "#0B0B0D",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            backgroundImage: "none",
          },
        }}
      >
        <Box sx={{ p: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography
            sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1rem", color: "#EFEFEF", letterSpacing: "-0.02em" }}
          >
            PromptLens
          </Typography>
          <IconButton
            onClick={() => setMobileNavOpen(false)}
            data-testid="close-mobile-nav-btn"
            size="small"
            sx={{ color: "text.secondary" }}
            aria-label="Close navigation menu"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
        <Stack sx={{ p: 2.5 }} spacing={0.5}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={mobileNavLinkStyle}
              data-testid={`mobile-${item.testid}`}
              onClick={() => setMobileNavOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </Stack>
      </Drawer>

      <Container maxWidth={false} sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, md: 4 }, maxWidth: 1600 }}>
        <Outlet context={outletContext} />
      </Container>
    </>
  );
}
