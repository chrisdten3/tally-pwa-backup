import ClubDashboardShell from "@/components/ClubDashboardShell"; // wherever you place it

export default function TestPage() {
  return (
    <ClubDashboardShell
      userName="Christopher"
      clubs={[
        { id: "1", name: "Chess Club", balance: 5120, memberCount: 240 },
        { id: "2", name: "Running Club", balance: 980, memberCount: 52 },
      ]}
      stats={{
        "1": { totalMembers: 240, balance: 5120, upcomingDue: 320 },
        "2": { totalMembers: 52, balance: 980, upcomingDue: 120 },
      }}
      actionItems={[
        {
          id: "a1",
          title: "2 overdue payments",
          amount: 40,
          clubId: "1",
        },
      ]}
      recentActivity={[
        {
          id: "r1",
          type: "payment",
          amount: 25,
          user: "alex@club.com",
          clubId: "1",
        },
        {
          id: "r2",
          type: "payout",
          amount: -100,
          user: "admin@club.com",
          clubId: "1",
        },
      ]}
    />
  );
}
