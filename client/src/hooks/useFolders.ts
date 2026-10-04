import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { BACKEND_URL } from "../config";
import { authHeaders, errorMessage } from "../api";

export interface Folder {
  id: string;
  name: string;
  count: number;
}

// Folders for the signed-in user, plus the actions that change them.
// The actions throw an Error with a message that is safe to show.
export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await axios.get<{ folders: Folder[] }>(`${BACKEND_URL}/api/v1/folders`, { headers: authHeaders() });
      setFolders((res.data as { folders: Folder[] }).folders);
    } catch (e) {
      console.error("Error fetching folders:", e);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createFolder(name: string): Promise<Folder> {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/v1/folders`, { name }, { headers: authHeaders() });
      await refresh();
      return (res.data as { folder: Folder }).folder;
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  }

  async function renameFolder(id: string, name: string) {
    try {
      await axios.patch(`${BACKEND_URL}/api/v1/folders/${id}`, { name }, { headers: authHeaders() });
      await refresh();
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  }

  async function deleteFolder(id: string) {
    try {
      await axios.delete(`${BACKEND_URL}/api/v1/folders/${id}`, { headers: authHeaders() });
      await refresh();
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  }

  // folderId null takes the items out of any folder
  async function moveItems(contentIds: string[], folderId: string | null) {
    try {
      await axios.post(`${BACKEND_URL}/api/v1/content/move`, { contentIds, folderId }, { headers: authHeaders() });
      await refresh();
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  }

  return { folders, refresh, createFolder, renameFolder, deleteFolder, moveItems };
}
