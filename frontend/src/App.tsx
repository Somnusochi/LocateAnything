import { ConfigProvider, theme } from "antd";
import { Navigate, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { AnnotatePage } from "./pages/AnnotatePage";
import { RecordsPage } from "./pages/RecordsPage";
import { TrainingPage } from "./pages/TrainingPage";
import { ValidatePage } from "./pages/ValidatePage";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const { isDark } = useTheme();
  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : undefined,
        token: {
          colorPrimary: "#76b900",
        },
      }}
    >
      <Toaster position="top-center" />
      <ErrorBoundary>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/annotate" replace />} />
            <Route path="annotate" element={<AnnotatePage />} />
            <Route path="validate" element={<ValidatePage />} />
            <Route path="records" element={<RecordsPage />} />
            <Route path="training" element={<TrainingPage />} />
            <Route path="*" element={<Navigate to="/annotate" replace />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </ConfigProvider>
  );
}
