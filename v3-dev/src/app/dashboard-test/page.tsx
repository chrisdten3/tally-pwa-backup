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
      members={{
        "1": [
          {
            id: "m1",
            firstName: "Alex",
            lastName: "Johnson",
            phoneNumber: "(555) 123-4567",
            dateJoined: "2024-01-15",
            eventsPaid: 12,
            eventsOutstanding: 2,
            totalPaid: 300,
          },
          {
            id: "m2",
            firstName: "Sarah",
            lastName: "Williams",
            phoneNumber: "(555) 234-5678",
            dateJoined: "2024-02-20",
            eventsPaid: 10,
            eventsOutstanding: 0,
            totalPaid: 250,
          },
          {
            id: "m3",
            firstName: "Michael",
            lastName: "Brown",
            phoneNumber: "(555) 345-6789",
            dateJoined: "2024-03-10",
            eventsPaid: 8,
            eventsOutstanding: 1,
            totalPaid: 200,
          },
          {
            id: "m4",
            firstName: "Emily",
            lastName: "Davis",
            phoneNumber: "(555) 456-7890",
            dateJoined: "2024-04-05",
            eventsPaid: 15,
            eventsOutstanding: 0,
            totalPaid: 375,
          },
          {
            id: "m5",
            firstName: "James",
            lastName: "Miller",
            phoneNumber: "(555) 567-8901",
            dateJoined: "2024-05-12",
            eventsPaid: 5,
            eventsOutstanding: 3,
            totalPaid: 125,
          },
        ],
        "2": [
          {
            id: "m6",
            firstName: "Jessica",
            lastName: "Wilson",
            phoneNumber: "(555) 678-9012",
            dateJoined: "2024-06-01",
            eventsPaid: 6,
            eventsOutstanding: 1,
            totalPaid: 150,
          },
        ],
      }}
    />
  );
}
