import React from "react";
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  Stack,
  Typography,
  Button,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";

const formatTime = (t) => {
  const d = new Date(t);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function HistoryDrawer({ open, onClose, items, onSelect, onDelete, onClear }) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 380 },
          backgroundColor: "#0B0B0D",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          backgroundImage: "none",
        },
      }}
    >
      <Box sx={{ p: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" data-testid="history-title">
          Prompt History
        </Typography>
        <IconButton onClick={onClose} data-testid="close-history-btn" size="small" sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {items.length === 0 ? (
        <Box sx={{ p: 4, textAlign: "left" }}>
          <Typography variant="body2" data-testid="history-empty">
            No analyses yet. Run your first prompt to build history.
          </Typography>
        </Box>
      ) : (
        <>
          <List sx={{ py: 0, flex: 1, overflowY: "auto" }} data-testid="history-list">
            {items.map((it) => (
              <ListItemButton
                key={it.id}
                data-testid={`history-item-${it.id}`}
                onClick={() => onSelect(it)}
                sx={{
                  py: 1.75,
                  px: 2.5,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  alignItems: "flex-start",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.03)" },
                }}
              >
                <Stack sx={{ width: "100%" }} spacing={0.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "0.68rem",
                      }}
                    >
                      {formatTime(it.createdAt)} · {it.result?.category || "—"}
                    </Typography>
                    <IconButton
                      size="small"
                      data-testid={`delete-history-${it.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(it.id);
                      }}
                      sx={{ color: "text.secondary", "&:hover": { color: "#FF3B30" } }}
                    >
                      <DeleteOutlineIcon fontSize="inherit" />
                    </IconButton>
                  </Stack>
                  <Typography
                    sx={{
                      color: "#EDEDED",
                      fontSize: "0.82rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {it.prompt}
                  </Typography>
                </Stack>
              </ListItemButton>
            ))}
          </List>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
          <Box sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              data-testid="clear-history-btn"
              onClick={onClear}
              startIcon={<DeleteOutlineIcon />}
            >
              Clear All History
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  );
}
