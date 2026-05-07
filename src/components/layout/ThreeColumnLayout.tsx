import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { MainPanel } from "./MainPanel";
import { DetailPanel } from "./DetailPanel";
import { CredentialForm } from "@/features/credentials/components/CredentialForm";
import { SettingsPage } from "@/features/settings/components/SettingsPage";
import { SpotlightOverlay } from "@/features/search/components/SpotlightOverlay";
import { CategoryManager } from "@/features/categories/components/CategoryManager";
import { useCredentialStore } from "@/features/credentials/stores/credentialStore";

export function ThreeColumnLayout() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const selectedCredential = useCredentialStore((s) => s.selectedCredential);

  // Ctrl+K opens spotlight, Ctrl+N creates new
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setShowSpotlight(true);
      }
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        setShowCreateForm(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNewCredential = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  const handleOpenSearch = useCallback(() => {
    setShowSpotlight(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedCredential) {
      setShowEditForm(true);
    }
  }, [selectedCredential]);

  return (
    <>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-52 min-w-[180px] max-w-[280px] border-r border-border dark:border-border-dark flex-shrink-0">
          <Sidebar
            onNewCredential={handleNewCredential}
            onOpenSearch={handleOpenSearch}
            onOpenSettings={() => setShowSettings(true)}
            onManageCategories={() => setShowCategoryManager(true)}
          />
        </div>

        {/* Main Panel */}
        <div className="w-72 min-w-[240px] max-w-[400px] border-r border-border dark:border-border-dark flex-shrink-0">
          <MainPanel searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        </div>

        {/* Detail Panel */}
        <div className="flex-1 min-w-[300px]">
          <DetailPanel onEdit={handleEdit} />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSpotlight && (
          <SpotlightOverlay
            key="spotlight"
            onClose={() => setShowSpotlight(false)}
          />
        )}
        {showCreateForm && (
          <CredentialForm
            key="create"
            onClose={() => setShowCreateForm(false)}
          />
        )}
        {showEditForm && selectedCredential && (
          <CredentialForm
            key="edit"
            credential={selectedCredential}
            onClose={() => setShowEditForm(false)}
          />
        )}
        {showSettings && (
          <SettingsPage
            key="settings"
            onClose={() => setShowSettings(false)}
          />
        )}
        {showCategoryManager && (
          <CategoryManager
            key="category-manager"
            onClose={() => setShowCategoryManager(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
