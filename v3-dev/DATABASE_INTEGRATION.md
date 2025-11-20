# Database Integration Guide

## Overview
Your application is now connected to the Supabase database with comprehensive API endpoints for all dashboard features.

## Created API Endpoints

### 1. **Club Stats** - `/api/clubs/[clubId]/stats`
- **Purpose**: Dashboard overview statistics
- **Returns**:
  - Total members count
  - Club balance
  - Upcoming dues
  - Recent activity (last 10 ledger entries)
  - Action items (unpaid events for current user)

### 2. **Members** - `/api/clubs/[clubId]/members`
- **GET**: Fetch all members with payment statistics
- **DELETE**: Remove a member (admin only)
- **Returns**: Member details, roles, payment history

### 3. **Events** - `/api/clubs/[clubId]/events`
- **GET**: Fetch all events with assignee statistics
- **Returns**: Event details, payment status, collection stats

### 4. **Payments** - `/api/clubs/[clubId]/payments`
- **GET**: Fetch payment history and statistics
- **Returns**: All payments, ledger entries, summary stats

### 5. **Payouts** - `/api/clubs/[clubId]/payouts`
- **GET**: Fetch payout history and balance
- **Returns**: All payouts, available balance, pending payouts

## Database Schema Integration

### Tables Used:
- `clubs` - Club information and balance
- `users` - User profiles
- `memberships` - User-club relationships with roles
- `club_events` - Events/dues
- `club_event_assignees` - Event assignments to users
- `payments` - Payment records
- `payouts` - Payout records
- `ledgers` - Transaction history (payments & payouts)

## How to Use in Your Pages

### Example: Fetching Data
\`\`\`typescript
const { activeClub } = useClub();
const [data, setData] = useState([]);

useEffect(() => {
  if (!activeClub?.id) return;
  
  const token = localStorage.getItem("token");
  fetch(\`/api/clubs/\${activeClub.id}/members\`, {
    headers: { Authorization: \`Bearer \${token}\` },
  })
    .then((r) => r.json())
    .then((data) => setData(data.members))
    .catch(console.error);
}, [activeClub?.id]);
\`\`\`

## Next Steps

### Update Remaining Pages:
1. **Events Page** - Use `/api/clubs/[clubId]/events`
2. **Payments Page** - Use `/api/clubs/[clubId]/payments`
3. **Payouts Page** - Use `/api/clubs/[clubId]/payouts`
4. **Home Dashboard** - Use `/api/clubs/[clubId]/stats`

### Update ClubDashboardShell:
Replace mock data with calls to `/api/clubs/[clubId]/stats`

## Example Implementations

### Events Page Pattern:
\`\`\`typescript
const [events, setEvents] = useState([]);
const [stats, setStats] = useState({});

useEffect(() => {
  if (!activeClub?.id) return;
  const token = localStorage.getItem("token");
  
  fetch(\`/api/clubs/\${activeClub.id}/events\`, {
    headers: { Authorization: \`Bearer \${token}\` },
  })
    .then((r) => r.json())
    .then((data) => {
      setEvents(data.events);
      // Calculate stats from events
    });
}, [activeClub?.id]);
\`\`\`

### Payments Page Pattern:
\`\`\`typescript
const [payments, setPayments] = useState([]);
const [stats, setStats] = useState({});

useEffect(() => {
  if (!activeClub?.id) return;
  const token = localStorage.getItem("token");
  
  fetch(\`/api/clubs/\${activeClub.id}/payments\`, {
    headers: { Authorization: \`Bearer \${token}\` },
  })
    .then((r) => r.json())
    .then((data) => {
      setPayments(data.ledgers);
      setStats(data.stats);
    });
}, [activeClub?.id]);
\`\`\`

## Security Features

- All endpoints require authentication via Bearer token
- Users must be members of the club to access data
- Admin-only operations check role permissions
- Supabase Row Level Security policies should be configured

## Data Flow

1. User logs in → Token stored in localStorage
2. ClubProvider fetches user's clubs
3. User selects club in sidebar
4. Each page fetches data for active club
5. Data updates when club selection changes

## Performance Tips

- Use React Query or SWR for caching and revalidation
- Implement pagination for large lists
- Add loading states for better UX
- Consider real-time subscriptions for live updates
