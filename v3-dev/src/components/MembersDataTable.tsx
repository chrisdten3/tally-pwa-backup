"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Maximize2,
  X,
  UserPlus,
  Upload,
  Trash2,
  Bell,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberImportDialog } from "@/components/MemberImportDialog";

export type Member = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  joinedAt?: string;
  dateJoined?: string;
  role?: string;
  eventsPaid?: number;
  eventsOutstanding?: number;
  totalPaid?: number;
  totalReceived?: number;
};

type Props = {
  members: Member[];
  clubId: string;
  onAddMember?: (member: Omit<Member, "id">) => void;
  onDeleteMember?: (memberId: string) => void;
  onSendReminder?: (memberId: string) => void;
  onRefreshMembers?: () => void;
};

export function MembersDataTable({
  members,
  clubId,
  onAddMember,
  onDeleteMember,
  onSendReminder,
  onRefreshMembers,
}: Props) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [newMember, setNewMember] = React.useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    dateJoined: new Date().toISOString().split("T")[0],
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Helper functions to extract member data
  const getFirstName = (member: Member) => {
    if (member.firstName) return member.firstName;
    if (member.name) {
      const parts = member.name.split(" ");
      return parts[0] || "";
    }
    return "";
  };

  const getLastName = (member: Member) => {
    if (member.lastName) return member.lastName;
    if (member.name) {
      const parts = member.name.split(" ");
      return parts.slice(1).join(" ") || "";
    }
    return "";
  };

  const getPhoneNumber = (member: Member) => {
    return member.phoneNumber || member.phone || "";
  };

  const getDateJoined = (member: Member) => {
    const dateStr = member.dateJoined || member.joinedAt;
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return "—";
    }
  };

  const handleAddMember = () => {
    if (newMember.firstName && newMember.lastName) {
      onAddMember?.({
        ...newMember,
        eventsPaid: 0,
        eventsOutstanding: 0,
        totalPaid: 0,
      });
      setNewMember({
        firstName: "",
        lastName: "",
        phoneNumber: "",
        dateJoined: new Date().toISOString().split("T")[0],
      });
      setIsAddMemberOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Open the import dialog instead
      setIsImportOpen(true);
    }
  };

  return (
    <>
      {/* Compact Card View */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Members</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {members.length} total members
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(true)}
            className="h-8 w-8"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Date Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        No members yet. Add members to get started.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  members.slice(0, 5).map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {getFirstName(member)}
                      </TableCell>
                      <TableCell>{getLastName(member)}</TableCell>
                      <TableCell>
                        {getDateJoined(member)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {members.length > 5 && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Showing 5 of {members.length} members. Click expand to see all.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Expanded Modal View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[98vw]! w-[98vw]! max-h-[90vh] h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/70">
            <div className="flex items-center justify-between pr-8">
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold">
                  Members
                </DialogTitle>
                <DialogDescription>
                  Manage all members in this club
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportOpen(true)}
                  className="gap-2"
                >
                  <Upload className="h-3 w-3" />
                  Import CSV
                </Button>
                <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <UserPlus className="h-3 w-3" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Member</DialogTitle>
                      <DialogDescription>
                        Add a new member to this club by filling out their
                        information below.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">First Name</label>
                        <Input
                          value={newMember.firstName}
                          onChange={(e) =>
                            setNewMember({ ...newMember, firstName: e.target.value })
                          }
                          placeholder="John"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Last Name</label>
                        <Input
                          value={newMember.lastName}
                          onChange={(e) =>
                            setNewMember({ ...newMember, lastName: e.target.value })
                          }
                          placeholder="Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Phone Number (optional)
                        </label>
                        <Input
                          type="tel"
                          value={newMember.phoneNumber}
                          onChange={(e) =>
                            setNewMember({ ...newMember, phoneNumber: e.target.value })
                          }
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date Joined</label>
                        <Input
                          type="date"
                          value={newMember.dateJoined}
                          onChange={(e) =>
                            setNewMember({ ...newMember, dateJoined: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddMemberOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddMember}>Add Member</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-x-auto overflow-y-auto px-6 py-4">
            <div className="rounded-md border border-border/70 min-w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[12%] min-w-[100px]">First Name</TableHead>
                    <TableHead className="w-[12%] min-w-[100px]">Last Name</TableHead>
                    <TableHead className="w-[20%] min-w-[150px]">Phone Number</TableHead>
                    <TableHead className="w-[12%] min-w-[110px]">Date Joined</TableHead>
                    <TableHead className="text-right w-[10%] min-w-[100px]">Events Paid</TableHead>
                    <TableHead className="text-right w-[10%] min-w-[100px]">Outstanding</TableHead>
                    <TableHead className="text-right w-[12%] min-w-[100px]">Total Paid</TableHead>
                    <TableHead className="text-right w-[12%] min-w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          No members yet. Add members to get started.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {getFirstName(member)}
                        </TableCell>
                        <TableCell>{getLastName(member)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {getPhoneNumber(member) || "—"}
                        </TableCell>
                        <TableCell>
                          {getDateJoined(member)}
                        </TableCell>
                        <TableCell className="text-right">
                          {member.eventsPaid ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {member.eventsOutstanding ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          ${((member.totalPaid ?? 0) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                // Handle view payment history
                                console.log("View history for", member.id);
                              }}
                              title="View payment history"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onSendReminder?.(member.id)}
                              title="Send payment reminder"
                              disabled={!member.eventsOutstanding || member.eventsOutstanding === 0}
                              style={{ 
                                visibility: (!member.eventsOutstanding || member.eventsOutstanding === 0) ? 'hidden' : 'visible' 
                              }}
                            >
                              <Bell className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                const firstName = getFirstName(member);
                                const lastName = getLastName(member);
                                if (
                                  confirm(
                                    `Are you sure you want to delete ${firstName} ${lastName}?`
                                  )
                                ) {
                                  onDeleteMember?.(member.id);
                                }
                              }}
                              title="Delete member"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <MemberImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        clubId={clubId}
        onImportComplete={() => {
          setIsImportOpen(false);
          onRefreshMembers?.();
        }}
      />
    </>
  );
}
