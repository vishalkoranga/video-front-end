import { Route, Routes } from "react-router-dom";
import ChannelPage from "../pages/ChannelPage";
import DashboardPage from "../pages/DashboardPage";
import FeedPage from "../pages/FeedPage";
import LibraryPage from "../pages/LibraryPage";
import NotFoundPage from "../pages/NotFoundPage";
import SettingsPage from "../pages/SettingsPage";
import UploadPage from "../pages/UploadPage";
import VideoDetailPage from "../pages/VideoDetailPage";

export default function AppRoutes({ user, onUserUpdate }) {
  return <Routes>
    <Route path="/" element={<FeedPage />} />
    <Route path="/search" element={<FeedPage />} />
    <Route path="/watch-later" element={<LibraryPage />} />
    <Route path="/liked" element={<LibraryPage liked />} />
    <Route path="/watch/:videoId" element={<VideoDetailPage />} />
    <Route path="/channel/:username" element={<ChannelPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/upload" element={<UploadPage />} />
    <Route path="/settings" element={<SettingsPage user={user} onUserUpdate={onUserUpdate} />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
