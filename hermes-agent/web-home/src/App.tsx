import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ChatPage } from "@/pages/ChatPage";
import { SessionsPage } from "@/pages/SessionsPage";
import { ModelsPage } from "@/pages/ModelsPage";
import { ConfigPage } from "@/pages/ConfigPage";
import { SkillsPage } from "@/pages/SkillsPage";
import { PluginsPage } from "@/pages/PluginsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
