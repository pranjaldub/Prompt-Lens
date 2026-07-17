import React from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "sonner";

import { clearHistory, deleteHistoryItem, loadHistory } from "../lib/storage";

const formatTime = (t) => new Date(t).toLocaleString(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function HistoryPage() {
  const navigate = useNavigate();
  const ctx = useOutletContext() || {};
  const [items, setItems] = React.useState(loadHistory());

  const handleDelete = (id) => {
    setItems(deleteHistoryItem(id));
    ctx.onHistoryChanged?.();
  };

  const handleClear = () => {
    clearHistory();
    setItems([]);
    ctx.onHistoryChanged?.();
    toast.info("History cleared");
  };

  const handleOpen = (item) => {
    ctx.setPreset?.({ prompt: item.prompt, result: item.result });
    navigate("/analyze");
  };

  return (
    <Stack spacing={3} data-testid="history-page">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ sm: "flex-end" }}>
        <Box>
          <Typography variant="h1" sx={{ fontSize: { xs: "1.8rem", md: "2.3rem" }, mb: 1, lineHeight: 1.05 }}>
            Your prompt history.
          </Typography>
          <Typography variant="body2" sx={{ maxWidth: 620, fontSize: "0.85rem" }}>
            Every analysis you run is stored in your browser only (localStorage). Nothing is
            uploaded — clear anytime.
          </Typography>
        </Box>
        {items.length > 0 && (
          <Button
            data-testid="clear-history-page-btn"
            variant="outlined"
            startIcon={<DeleteOutlineIcon />}
            onClick={handleClear}
          >
            Clear All
          </Button>
        )}
      </Stack>

      {items.length === 0 ? (
        <Box
          data-testid="history-empty"
          sx={{
            border: "1px dashed rgba(255,255,255,0.12)",
            p: 5,
            minHeight: 260,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Typography variant="h6" sx={{ color: "text.secondary" }}>// EMPTY</Typography>
          <Typography variant="h2" sx={{ fontSize: "1.4rem", mt: 1 }}>
            No prompts analyzed yet.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Run your first analysis and it will appear here.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {items.map((it) => (
            <Box
              key={it.id}
              data-testid={`history-row-${it.id}`}
              onClick={() => handleOpen(it)}
              sx={{
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "#121214",
                p: 2,
                transition: "border-color 0.15s ease",
                "&:hover": { borderColor: "rgba(255,255,255,0.3)" },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: "0.65rem", color: "text.secondary" }}>
                      {formatTime(it.createdAt)}
                    </Typography>
                    <Typography variant="h6" sx={{ fontSize: "0.65rem", color: "#7CB5FF" }}>
                      · {it.result?.category || "—"}
                    </Typography>
                    <Typography variant="h6" sx={{ fontSize: "0.65rem", color: "text.secondary" }}>
                      · clarity {it.result?.clarity} / spec {it.result?.specificity}
                    </Typography>
                  </Stack>
                  <Typography
                    sx={{
                      color: "#EDEDED",
                      fontSize: "0.9rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {it.prompt}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  data-testid={`history-delete-${it.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(it.id);
                  }}
                  sx={{ color: "text.secondary", "&:hover": { color: "#FF3B30" } }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
