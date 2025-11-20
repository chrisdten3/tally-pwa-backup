# Member CSV Import Feature

## Overview

The Member CSV Import feature allows club administrators to bulk import members from CSV files or paste CSV data directly. This feature is integrated into the `MembersDataTable` component.

## Features

- ✅ Upload CSV files
- ✅ Paste CSV data directly (including from Excel)
- ✅ Flexible column mapping with header detection
- ✅ Tab-separated and comma-separated values support
- ✅ Automatic duplicate detection (by phone or email)
- ✅ User creation or update
- ✅ Detailed import results with error reporting

## CSV Format

### Supported Columns

The CSV parser supports the following column headers (case-insensitive):

| Column Header Options | Description | Required |
|----------------------|-------------|----------|
| `firstName`, `First Name`, `fname` | Member's first name | ✅ Yes |
| `lastName`, `Last Name`, `lname` | Member's last name | ✅ Yes |
| `phone`, `Phone Number`, `mobile`, `cell` | Phone number | Optional |
| `email`, `Email`, `mail` | Email address | Optional |

### Example CSV

```csv
firstName,lastName,phone,email
John,Doe,5551234567,john@example.com
Jane,Smith,5559876543,jane@example.com
Bob,Johnson,5555555555,bob@example.com
```

### Without Headers (Assumes Order)

If no headers are provided, the CSV parser assumes the following column order:
1. First Name
2. Last Name
3. Phone (optional)
4. Email (optional)

```csv
John,Doe,5551234567,john@example.com
Jane,Smith,5559876543,jane@example.com
```

## How to Use

### In Your Component

```tsx
import { MembersDataTable } from "@/components/MembersDataTable";

function YourComponent() {
  const [members, setMembers] = useState([]);
  const clubId = "your-club-id";

  const fetchMembers = async () => {
    // Fetch members from API
    const response = await fetch(`/api/clubs/${clubId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setMembers(data.members);
  };

  return (
    <MembersDataTable
      members={members}
      clubId={clubId}
      onRefreshMembers={fetchMembers}
      onAddMember={handleAddMember}
      onDeleteMember={handleDeleteMember}
    />
  );
}
```

### User Flow

1. **Click "Import CSV"** button in the Members table
2. **Upload a file** or **paste CSV data**:
   - Click "Upload CSV File" to select a .csv file
   - OR paste CSV data in the text area (supports copying from Excel)
3. **Click "Import Members"** to process the data
4. **View results**: See how many members were imported successfully and any errors

## API Endpoint

### POST `/api/clubs/[clubId]/members/import`

Bulk import members from parsed CSV data.

**Request Body:**

```json
{
  "members": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "phone": "5551234567",
      "email": "john@example.com"
    },
    {
      "firstName": "Jane",
      "lastName": "Smith",
      "phone": "5559876543",
      "email": "jane@example.com"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "imported": 2,
  "failed": 0,
  "errors": [],
  "members": [
    {
      "id": "user_123",
      "name": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "5551234567",
      "email": "john@example.com"
    }
  ]
}
```

## Import Logic

### Duplicate Detection

The system checks for existing users in this order:

1. **By Phone Number**: If a phone number is provided, check if a user with that phone already exists
2. **By Email**: If no match by phone, check if a user with that email already exists
3. **Create New User**: If no match found, create a new user

### Update Behavior

If an existing user is found:
- Their name, first name, and last name are updated
- Missing contact info (phone or email) is added if provided in the CSV

### Membership Creation

- If the user is not already a member of the club, a new membership is created with role "member"
- If the user is already a member, no changes are made to their membership

## Error Handling

The import process handles errors gracefully:

- **Missing Required Fields**: Rows without first name or last name are skipped with an error message
- **Database Errors**: Individual import failures don't stop the entire process
- **Detailed Error Report**: All errors are collected and displayed to the user

Example error messages:
```
Row skipped: Missing first or last name (? Smith)
Failed to create user John Doe: Unique constraint violation
Failed to add membership for Jane Smith: Foreign key constraint
```

## Testing

### Sample Test Data

Create a file named `test-members.csv`:

```csv
firstName,lastName,phone,email
Alice,Anderson,5551111111,alice@test.com
Bob,Brown,5552222222,bob@test.com
Charlie,Chen,5553333333,charlie@test.com
Diana,Davis,5554444444,diana@test.com
```

### Test Cases

1. **Valid Import**: Import the sample data above
2. **Duplicate Detection**: Import the same file again (should update existing users)
3. **Missing Fields**: Try importing with missing first/last names
4. **Tab-Separated**: Copy data from Excel (tab-separated) and paste
5. **No Headers**: Import CSV without header row

## Components

### `MemberImportDialog`

The dialog component that handles the CSV import UI.

**Props:**

- `open: boolean` - Controls dialog visibility
- `onOpenChange: (open: boolean) => void` - Callback when dialog state changes
- `clubId: string` - The club ID to import members into
- `onImportComplete: () => void` - Callback after successful import

### `MembersDataTable`

The main members table component with integrated CSV import.

**New Props:**

- `onRefreshMembers?: () => void` - Callback to refresh the members list after import

## Future Enhancements

- [ ] Drag-and-drop file upload
- [ ] Excel (.xlsx) file support
- [ ] Import preview before committing
- [ ] Custom column mapping UI
- [ ] Download template CSV
- [ ] Import history/audit log
- [ ] Dry-run mode
