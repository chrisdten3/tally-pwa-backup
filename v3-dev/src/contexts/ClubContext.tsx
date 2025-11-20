"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Club = {
  id: string;
  name: string;
  description?: string | null;
  balance?: number | null;
  memberCount?: number | null;
  role?: string;
};

type ClubContextType = {
  clubs: Club[];
  activeClubId: string | null;
  activeClub: Club | null;
  setActiveClubId: (id: string) => void;
  setClubs: (clubs: Club[]) => void;
  isLoading: boolean;
};

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/clubs", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) {
          setClubs([]);
          return null;
        }
        return r.json();
      })
      .then((clubsData) => {
        const fetchedClubs: Club[] = Array.isArray(clubsData) ? clubsData : [];
        setClubs(fetchedClubs);
        
        // Set the first club as active by default
        if (fetchedClubs.length > 0 && !activeClubId) {
          setActiveClubId(fetchedClubs[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch clubs:", err);
        setClubs([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const activeClub = clubs.find((c) => c.id === activeClubId) || clubs[0] || null;

  return (
    <ClubContext.Provider
      value={{
        clubs,
        activeClubId,
        activeClub,
        setActiveClubId,
        setClubs,
        isLoading,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error("useClub must be used within a ClubProvider");
  }
  return context;
}
