"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  onImportComplete: () => void;
};

type ParsedMember = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
};

export function MemberImportDialog({ open, onOpenChange, clubId, onImportComplete }: Props) {
  const [csvText, setCsvText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    imported: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target?.result as string);
      };
      reader.readAsText(selectedFile);
    }
  };

  const parseCSV = (text: string): ParsedMember[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0]
      .split(/,|\t/)
      .map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));

    const members: ParsedMember[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/,|\t/).map((v) => v.trim());
      
      if (values.length === 0 || values.every((v) => !v)) continue;

      const member: ParsedMember = {
        firstName: "",
        lastName: "",
      };

      headers.forEach((header, index) => {
        const value = values[index] || "";
        
        if (header.includes("first") || header === "firstname" || header === "fname") {
          member.firstName = value;
        } else if (header.includes("last") || header === "lastname" || header === "lname") {
          member.lastName = value;
        } else if (header.includes("phone") || header.includes("mobile") || header.includes("cell")) {
          member.phone = value;
        } else if (header.includes("email") || header.includes("mail")) {
          member.email = value;
        }
      });

      // If no headers match, assume order: firstName, lastName, phone, email
      if (!member.firstName && values.length >= 2) {
        member.firstName = values[0];
        member.lastName = values[1];
        if (values[2]) member.phone = values[2];
        if (values[3]) member.email = values[3];
      }

      if (member.firstName && member.lastName) {
        members.push(member);
      }
    }

    return members;
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      alert("Please paste CSV data or upload a file");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const members = parseCSV(csvText);

      if (members.length === 0) {
        alert("No valid members found in CSV. Please check the format.");
        setImporting(false);
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/clubs/${clubId}/members/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ members }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import members");
      }

      setResult({
        success: true,
        imported: data.imported,
        failed: data.failed,
        errors: data.errors || [],
      });

      // Refresh the members list
      if (data.imported > 0) {
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      }
    } catch (error: any) {
      console.error("Import error:", error);
      setResult({
        success: false,
        imported: 0,
        failed: 0,
        errors: [error.message],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setCsvText("");
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Members from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV data to bulk import members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!result ? (
            <>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload CSV File
                  </Button>
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {file.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Or paste CSV data below:
                </label>
                <Textarea
                  value={csvText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCsvText(e.target.value)}
                  placeholder="firstName,lastName,phone,email
John,Doe,555-1234,john@example.com
Jane,Smith,555-5678,jane@example.com"
                  className="font-mono text-xs h-48"
                />
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>CSV Format:</strong> The CSV should have headers in the first row.
                  Supported columns: firstName/First Name, lastName/Last Name, phone/Phone Number, email/Email.
                  You can also use tab-separated values or paste directly from Excel.
                  <br /><br />
                  <strong>Example:</strong>
                  <br />
                  <code className="text-xs">
                    firstName,lastName,phone,email
                    <br />
                    John,Doe,5551234567,john@example.com
                    <br />
                    Jane,Smith,5559876543,jane@example.com
                  </code>
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing || !csvText.trim()}>
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import Members"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border/70 bg-muted/40">
                {result.success ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
                <div>
                  <div className="font-semibold">
                    {result.success ? "Import Complete!" : "Import Failed"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {result.imported > 0 && (
                      <span className="text-green-600">
                        ✓ {result.imported} member{result.imported !== 1 ? "s" : ""} imported
                      </span>
                    )}
                    {result.failed > 0 && (
                      <span className="text-red-600 ml-3">
                        ✗ {result.failed} failed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <Alert variant="error">
                  <AlertDescription>
                    <div className="font-semibold mb-2">Errors:</div>
                    <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
                      {result.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button onClick={handleClose}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
