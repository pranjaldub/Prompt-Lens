import React, { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import HistoryDrawer from "./components/HistoryDrawer";
import LandingPage from "./pages/LandingPage";
import AnalyzePage from "./pages/AnalyzePage";
import ComparePage from "./pages/ComparePage";
import MetricsPage from "./pages/MetricsPage";
import HistoryPage from "./pages/HistoryPage";
import { deleteHistoryItem, clearHistory, loadHistory } from "./lib/storage";
import { toast } from "sonner";

export default function App() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState(loadHistory());
  const [preset, setPreset] = useState(null);

  const refreshHistory = () => setHistory(loadHistory());

  const outletContext = {
    onHistoryAdded: () => refreshHistory(),
    onHistoryChanged: refreshHistory,
    setPreset,
    clearPreset: () => setPreset(null),
    presetPrompt: preset?.prompt,
    presetResult: preset?.result,
  };

  const drawerSelect = (item) => {
    setPreset({ prompt: item.prompt, result: item.result });
    setHistoryOpen(false);
    toast.info("Loaded from history");
  };
  const drawerDelete = (id) => setHistory(deleteHistoryItem(id));
  const drawerClear = () => {
    clearHistory();
    setHistory([]);
    toast.info("History cleared");
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout onOpenHistory={() => setHistoryOpen(true)} outletContext={outletContext} />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={history}
        onSelect={drawerSelect}
        onDelete={drawerDelete}
        onClear={drawerClear}
      />
    </BrowserRouter>
  );
}
