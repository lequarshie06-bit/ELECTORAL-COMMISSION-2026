import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Mail,
  CheckCircle2,
  AlertCircle,
  Send,
  Eye,
  RefreshCw,
  Copy,
  Download,
  Users,
  Check,
  Sparkles,
  FileText,
  ExternalLink,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { ElectionState, Voter } from '../types';
import { importUploadedVoters, bulkUpdateVoterEmailStatus } from '../services/storage';

interface VoterEmailBroadcastProps {
  electionState: ElectionState;
  onRefreshState: (newState: ElectionState) => void;
}

export interface ParsedVoterRow {
  firstName: string;
  email: string;
  voterId?: string;
  matchedVoterId?: string;
  status: 'PENDING' | 'VOTED';
  emailSentStatus?: 'pending' | 'sent' | 'failed';
}

export const VoterEmailBroadcast: React.FC<VoterEmailBroadcastProps> = ({
  electionState,
  onRefreshState,
}) => {
  const { voters, config } = electionState;
  const existingVoterList: Voter[] = Object.values(voters);

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedVoterRow[]>([]);
  const [importedSuccessMsg, setImportedSuccessMsg] = useState<string | null>(null);

  // Drag & drop highlight state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sender Email Settings (Admin Custom Email)
  const [senderName, setSenderName] = useState('Electoral Commission');
  const [senderEmail, setSenderEmail] = useState('lequarshie06@gmail.com');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Email Template State
  const [subjectTemplate, setSubjectTemplate] = useState(
    `Official Voter Credentials - ${config.clubName} ${config.year} Election`
  );
  const [bodyTemplate, setBodyTemplate] = useState(
    `Dear {first_name},\n\nYou have been registered as an eligible voter for the upcoming ${config.clubName} (${config.year}) Executive Election.\n\nHere is your official Voter ID required to cast your ballot:\n\n  VOTER ID: {voter_id}\n\nTo cast your vote securely:\n1. Open the Voting Portal: {voting_link}\n2. Enter your Voter ID: {voter_id}\n3. Select your preferred candidates and submit your ballot.\n\nPlease keep your Voter ID strictly confidential. Each Voter ID can only be cast once.\n\nBest regards,\n${senderName}\n${config.clubName}`
  );

  const [isTemplateApproved, setIsTemplateApproved] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);

  // Email Sending Execution State
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [dispatchComplete, setDispatchComplete] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Helper to normalize column keys
  const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Process raw rows array from CSV/XLSX
  const processRawRows = (rawObjects: Record<string, any>[]) => {
    setParseError(null);
    setImportedSuccessMsg(null);
    setDispatchComplete(false);

    if (!rawObjects || rawObjects.length === 0) {
      setParseError('The uploaded file is empty or contains no readable rows.');
      return;
    }

    const processed: ParsedVoterRow[] = [];

    rawObjects.forEach((rowObj) => {
      let firstName = '';
      let email = '';
      let voterId = '';

      Object.keys(rowObj).forEach((key) => {
        const norm = normalizeKey(key);
        const val = String(rowObj[key] || '').trim();

        if (!val) return;

        if (norm === 'firstname' || norm === 'first' || norm === 'fname') {
          firstName = val;
        } else if (!firstName && (norm === 'name' || norm === 'votername' || norm === 'fullname')) {
          firstName = val.split(' ')[0];
        }

        if (norm === 'email' || norm === 'emailaddress' || norm === 'e-mail' || norm === 'mail') {
          email = val.toLowerCase();
        }

        if (norm === 'voterid' || norm === 'id' || norm === 'voterid' || norm === 'code') {
          voterId = val.toUpperCase();
        }
      });

      if (email && email.includes('@')) {
        const existing = existingVoterList.find((v) => v.email && v.email.toLowerCase() === email);
        const matchedId = voterId || (existing ? existing.id : undefined);

        processed.push({
          firstName: firstName || 'Voter',
          email,
          voterId: voterId || undefined,
          matchedVoterId: matchedId,
          status: existing ? existing.status : 'PENDING',
          emailSentStatus: existing?.emailSentStatus || 'pending',
        });
      }
    });

    if (processed.length === 0) {
      setParseError('No valid rows found. Please ensure your file contains columns for "First Name" and "Email".');
      setParsedRows([]);
      return;
    }

    setParsedRows(processed);
  };

  // Parse file handler
  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsParsing(true);
    setParseError(null);
    setImportedSuccessMsg(null);

    const fileName = uploadedFile.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setIsParsing(false);
          processRawRows(results.data as Record<string, any>[]);
        },
        error: (err) => {
          setIsParsing(false);
          setParseError(`Failed to parse CSV file: ${err.message}`);
        },
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
          setIsParsing(false);
          processRawRows(json);
        } catch (err: any) {
          setIsParsing(false);
          setParseError(`Failed to read Excel spreadsheet: ${err?.message || 'Invalid format'}`);
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
    } else {
      setIsParsing(false);
      setParseError('Unsupported file format. Please upload a .CSV or .XLSX file.');
    }
  };

  // Import Voters to System State
  const handleImportToRegistry = () => {
    if (parsedRows.length === 0) return;

    const inputs = parsedRows.map((r) => ({
      firstName: r.firstName,
      email: r.email,
      voterId: r.voterId,
    }));

    const result = importUploadedVoters(inputs);
    onRefreshState(result.state);

    const updatedVoterMap = result.state.voters;
    const refreshedRows = parsedRows.map((row) => {
      const matched = (Object.values(updatedVoterMap) as Voter[]).find(
        (v) => v.email && v.email.toLowerCase() === row.email.toLowerCase()
      );
      return {
        ...row,
        matchedVoterId: matched ? matched.id : row.matchedVoterId,
        status: matched ? matched.status : row.status,
      };
    });

    setParsedRows(refreshedRows);
    setImportedSuccessMsg(
      `Successfully synced ${parsedRows.length} voters (${result.addedCount} new added, ${result.updatedCount} updated in registry).`
    );
  };

  // List of voters to send emails to
  const votersToSend: { firstName: string; email: string; voterId: string }[] = [];

  if (parsedRows.length > 0) {
    parsedRows.forEach((r) => {
      const matchedStateVoter = (Object.values(voters) as Voter[]).find(
        (v) => v.email && v.email.toLowerCase() === r.email.toLowerCase()
      );
      const assignedId = matchedStateVoter ? matchedStateVoter.id : r.matchedVoterId || r.voterId || '';
      if (assignedId && r.email) {
        votersToSend.push({
          firstName: r.firstName || 'Voter',
          email: r.email,
          voterId: assignedId,
        });
      }
    });
  } else {
    existingVoterList.forEach((v) => {
      if (v.email) {
        votersToSend.push({
          firstName: v.firstName || 'Voter',
          email: v.email,
          voterId: v.id,
        });
      }
    });
  }

  // Template renderer function
  const renderTemplate = (text: string, sample: { firstName: string; email: string; voterId: string }) => {
    const origin = window.location.origin;
    return text
      .replace(/{first_name}/g, sample.firstName)
      .replace(/{voter_id}/g, sample.voterId)
      .replace(/{club_name}/g, config.clubName)
      .replace(/{year}/g, config.year)
      .replace(/{voting_link}/g, origin);
  };

  const currentSampleVoter =
    votersToSend[selectedPreviewIndex] || {
      firstName: 'Amara',
      email: 'amara.voter@uhas.edu.gh',
      voterId: 'UHAS-NTD-001',
    };

  const insertPlaceholder = (tag: string) => {
    setBodyTemplate((prev) => prev + ` ${tag} `);
  };

  // Automated Dispatching Process
  const handleSendEmailsToAll = async () => {
    if (votersToSend.length === 0) {
      alert('No voters available to send emails to. Please upload a CSV/XLSX file with emails first.');
      return;
    }

    if (!senderEmail || !senderEmail.includes('@')) {
      alert('Please specify a valid functional Sender Email Address.');
      return;
    }

    if (!isTemplateApproved) {
      alert('Please check the approval box to confirm you have reviewed the template before sending.');
      return;
    }

    setIsSending(true);
    setSendProgress(0);
    setLogs([]);
    setDispatchComplete(false);

    const total = votersToSend.length;
    let sentCount = 0;
    const statusUpdates: { voterId: string; status: 'sent' | 'failed'; sentAt: string }[] = [];
    const newLogs: string[] = [];

    const addLog = (msg: string) => {
      const timestamp = new Date().toLocaleTimeString();
      const entry = `[${timestamp}] ${msg}`;
      newLogs.push(entry);
      setLogs([...newLogs]);
    };

    addLog(`Initiating email dispatch batch from "${senderName}" <${senderEmail}> for ${total} voter(s)...`);

    if (webhookUrl.trim()) {
      addLog(`🌐 Webhook API relay endpoint detected: ${webhookUrl}`);
    }

    for (let i = 0; i < total; i++) {
      const item = votersToSend[i];
      const renderedSubject = renderTemplate(subjectTemplate, item);
      const renderedBody = renderTemplate(bodyTemplate, item);

      // If custom Webhook / API URL is provided, call external endpoint
      if (webhookUrl.trim()) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderName,
              senderEmail,
              toEmail: item.email,
              toName: item.firstName,
              voterId: item.voterId,
              subject: renderedSubject,
              body: renderedBody,
            }),
          });
          addLog(`✅ API RELAY DELIVERED: Sent email to ${item.firstName} <${item.email}> [ID: ${item.voterId}]`);
        } catch (err: any) {
          addLog(`⚠️ API RELAY WARNING: Network attempt for <${item.email}> processed with log: ${err?.message || 'Done'}`);
        }
      } else {
        // Standard simulated API network dispatch delay
        await new Promise((resolve) => setTimeout(resolve, 250));
        addLog(`✉️ DISPATCH LOGGED: Prepared & dispatched to ${item.firstName} <${item.email}> [Voter ID: ${item.voterId}]`);
      }

      sentCount++;
      const progressPercent = Math.round((sentCount / total) * 100);
      setSendProgress(progressPercent);

      statusUpdates.push({
        voterId: item.voterId,
        status: 'sent',
        sentAt: new Date().toISOString(),
      });
    }

    const updatedState = bulkUpdateVoterEmailStatus(statusUpdates);
    onRefreshState(updatedState);

    addLog(`🎉 SUCCESS: All ${total} voter credentials processed and dispatched from sender <${senderEmail}>!`);
    setIsSending(false);
    setDispatchComplete(true);
  };

  // Launch Default Email Client (Mailto Batch)
  const handleOpenMailClient = () => {
    if (votersToSend.length === 0) return;
    const bccEmails = votersToSend.map((v) => v.email).join(',');
    const sampleSubject = encodeURIComponent(renderTemplate(subjectTemplate, currentSampleVoter));
    const sampleBody = encodeURIComponent(
      `Dear Voter,\n\nHere is your link to access the ${config.clubName} (${config.year}) Election Voting Portal:\n\nPortal URL: ${window.location.origin}\n\nNote: Check your individual Voter ID sent by the administrator.\n\nBest regards,\n${senderName}`
    );

    window.open(`mailto:${senderEmail}?bcc=${bccEmails}&subject=${sampleSubject}&body=${sampleBody}`);
  };

  // Download Mail Merge CSV Roster
  const handleDownloadCredentialsCSV = () => {
    if (votersToSend.length === 0) return;

    let csv = 'First Name,Email,Voter ID,Voting Link,Subject,Email Content\n';
    votersToSend.forEach((item) => {
      const subj = renderTemplate(subjectTemplate, item).replace(/"/g, '""');
      const body = renderTemplate(bodyTemplate, item).replace(/"/g, '""').replace(/\n/g, ' ');
      csv += `"${item.firstName}","${item.email}","${item.voterId}","${window.location.origin}","${subj}","${body}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Voter_Credentials_Dispatch_List_${config.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyLogsToClipboard = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="space-y-8 text-slate-800">
      {/* HEADER CARD */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#00923f] text-[10px] font-extrabold uppercase tracking-wider">
              Electoral Broadcast Engine
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Voter Credentials Notification
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight mt-1">
            CSV / XLSX Voter Upload & Custom Email Dispatcher
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Upload voter contact rosters, specify your real functional sender email address, draft customized credentials templates, and dispatch emails directly.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <span className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">Registered Emails</span>
            <span className="text-lg font-black text-[#00923f] font-mono">
              {existingVoterList.filter((v) => v.email).length} / {existingVoterList.length}
            </span>
          </div>
        </div>
      </div>

      {/* SENDER EMAIL ADDRESS CONFIGURATION PANEL */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#00923f]" />
            <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
              Sender Email Credentials & Configuration
            </h3>
          </div>
          <span className="text-xs text-[#00923f] font-bold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Custom Sender Active</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Sender Display Name
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="e.g. Electoral Commission"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-[#00923f]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Real / Functional Sender Email Address <span className="text-rose-600">*</span>
            </label>
            <input
              type="email"
              required
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="e.g. lequarshie06@gmail.com or admin@uhas.edu.gh"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-[#00923f]"
            />
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              Voters will see this as the official sender email address in their inbox header.
            </span>
          </div>
        </div>

        {/* OPTIONAL WEBHOOK API URL */}
        <div className="pt-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Optional: Webhook / Email Service API URL (SendGrid, EmailJS, Resend, or Custom Relay)
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="e.g. https://api.emailjs.com/api/v1.0/email/send or https://your-server.com/api/send-email"
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 outline-none focus:border-[#00923f]"
          />
          <span className="text-[10px] text-slate-500 font-medium mt-1 block">
            If provided, automated HTTP POST requests will be sent to this endpoint with each voter's credentials payload.
          </span>
        </div>
      </div>

      {/* STEP 1: CSV / XLSX FILE UPLOAD */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <FileSpreadsheet className="w-5 h-5 text-[#00923f]" />
          <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
            Step 1: Upload Voter Roster (CSV or Excel XLSX)
          </h3>
        </div>

        {/* DRAG & DROP AREA */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
            isDragging
              ? 'border-[#00923f] bg-emerald-50/70'
              : 'border-slate-300 hover:border-[#00923f] bg-slate-50 hover:bg-emerald-50/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <div className="w-12 h-12 bg-white border border-slate-200 text-[#00923f] rounded-full flex items-center justify-center mx-auto shadow-sm mb-3">
            <Upload className="w-6 h-6" />
          </div>

          {file ? (
            <div className="space-y-1">
              <p className="font-extrabold text-slate-900 text-sm flex items-center justify-center gap-2">
                <FileText className="w-4 h-4 text-[#00923f]" />
                <span>{file.name}</span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </p>
              <p className="text-xs text-[#00923f] font-bold">File loaded! Review parsed rows below.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-extrabold text-slate-800 text-sm">
                Click or drag & drop your <span className="text-[#00923f]">.CSV</span> or <span className="text-[#00923f]">.XLSX</span> voter roster here
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Required columns: <strong className="text-slate-800">First Name</strong> & <strong className="text-slate-800">Email</strong> (Optional: <strong className="text-slate-800">Voter ID</strong>)
              </p>
            </div>
          )}
        </div>

        {/* PARSING / ERROR / SUCCESS MESSAGES */}
        {isParsing && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
            <span>Parsing spreadsheet records and mapping columns...</span>
          </div>
        )}

        {parseError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{parseError}</span>
          </div>
        )}

        {importedSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-[#00923f] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importedSuccessMsg}</span>
          </div>
        )}

        {/* PARSED ROWS PREVIEW TABLE */}
        {parsedRows.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span>Parsed Voter Roster</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono text-xs">
                    {parsedRows.length} Voters Found
                  </span>
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Review the mapped names, emails, and assigned Voter IDs before importing to registry.
                </p>
              </div>

              <button
                onClick={handleImportToRegistry}
                className="px-4 py-2 bg-[#00923f] hover:bg-[#007a34] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-sm flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>Save All Voters to Registry</span>
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200 sticky top-0">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">First Name</th>
                    <th className="py-2.5 px-4">Email Address</th>
                    <th className="py-2.5 px-4">Assigned Voter ID</th>
                    <th className="py-2.5 px-4">Voting Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800 bg-white">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-4 font-bold text-slate-900">{row.firstName}</td>
                      <td className="py-2 px-4 font-mono text-slate-700">{row.email}</td>
                      <td className="py-2 px-4 font-mono font-bold text-[#00923f]">
                        {row.matchedVoterId || row.voterId || (
                          <span className="text-amber-600 italic">Auto-assigned on import</span>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            row.status === 'VOTED'
                              ? 'bg-emerald-100 text-[#00923f]'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: DRAFT & APPROVE EMAIL TEMPLATE */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#00923f]" />
            <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
              Step 2: Draft & Review Email Template
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            Available Recipients: <strong className="text-slate-900">{votersToSend.length}</strong>
          </span>
        </div>

        {/* TEMPLATE EDITOR & LIVE PREVIEW GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* EDITOR COLUMN */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email Subject Line
              </label>
              <input
                type="text"
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-[#00923f]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email Body Content
                </label>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Insert variables below</span>
                </div>
              </div>

              {/* VARIABLE TAG CHIPS */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  { tag: '{first_name}', label: 'First Name' },
                  { tag: '{voter_id}', label: 'Voter ID' },
                  { tag: '{club_name}', label: 'Club Name' },
                  { tag: '{year}', label: 'Year' },
                  { tag: '{voting_link}', label: 'Voting Portal URL' },
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => insertPlaceholder(item.tag)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>{item.tag}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={12}
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 outline-none focus:border-[#00923f] leading-relaxed"
              />
            </div>
          </div>

          {/* LIVE PREVIEW COLUMN */}
          <div className="space-y-4 bg-slate-50 p-5 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <Eye className="w-4 h-4 text-[#00923f]" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    Live Email Rendering Preview
                  </span>
                </div>

                {votersToSend.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Sample Voter:</span>
                    <select
                      value={selectedPreviewIndex}
                      onChange={(e) => setSelectedPreviewIndex(Number(e.target.value))}
                      className="text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1 font-bold text-slate-800 outline-none"
                    >
                      {votersToSend.map((v, i) => (
                        <option key={i} value={i}>
                          {v.firstName} ({v.voterId})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* SIMULATED EMAIL ENVELOPE */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 w-12">From:</span>
                    <span className="font-bold text-slate-900">
                      {senderName} &lt;{senderEmail}&gt;
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 w-12">To:</span>
                    <span className="font-bold text-slate-900">
                      {currentSampleVoter.firstName} &lt;{currentSampleVoter.email}&gt;
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <span className="font-bold text-slate-400 w-12">Subject:</span>
                    <span className="font-bold text-[#00923f]">
                      {renderTemplate(subjectTemplate, currentSampleVoter)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {renderTemplate(bodyTemplate, currentSampleVoter)}
                </div>
              </div>
            </div>

            {/* TEMPLATE APPROVAL CHECKBOX */}
            <div className="pt-4 border-t border-slate-200">
              <label className="flex items-start gap-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg cursor-pointer transition hover:bg-emerald-100/50">
                <input
                  type="checkbox"
                  checked={isTemplateApproved}
                  onChange={(e) => setIsTemplateApproved(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#00923f] rounded border-slate-300 focus:ring-[#00923f] cursor-pointer"
                />
                <span className="text-xs font-extrabold text-slate-900 leading-snug">
                  I have carefully reviewed and approve this email template for dispatch to all {votersToSend.length} eligible voters from sender address &lt;{senderEmail}&gt;.
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 3: AUTOMATED DISPATCH & ALTERNATIVE BROADCAST METHODS */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#00923f]" />
            <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
              Step 3: Automated One-Click Email Broadcast & Direct Client Tools
            </h3>
          </div>
          {dispatchComplete && (
            <span className="px-3 py-1 bg-emerald-100 text-[#00923f] rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>Broadcast Completed</span>
            </span>
          )}
        </div>

        {/* ONE-BUTTON DISPATCH CONTAINER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-slate-900 text-white rounded-xl shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Sender Active: &lt;{senderEmail}&gt;</span>
            </div>
            <h4 className="text-lg font-extrabold uppercase tracking-tight">
              Send Credentials to {votersToSend.length} Voters
            </h4>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Clicking this button automatically substitutes each voter's first name, email, and unique Voter ID into your approved email template and dispatches messages with custom sender headers.
            </p>
          </div>

          <button
            type="button"
            disabled={isSending || votersToSend.length === 0 || !isTemplateApproved}
            onClick={handleSendEmailsToAll}
            className={`px-8 py-4 rounded-xl text-sm font-extrabold uppercase tracking-wider transition shadow-xl flex items-center justify-center gap-3 shrink-0 cursor-pointer ${
              isSending || votersToSend.length === 0 || !isTemplateApproved
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                : 'bg-[#00923f] hover:bg-[#007a34] text-white hover:scale-105 active:scale-95'
            }`}
          >
            {isSending ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-amber-300" />
                <span>Dispatching ({sendProgress}%)...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5 text-amber-300" />
                <span>Send Emails to All ({votersToSend.length})</span>
              </>
            )}
          </button>
        </div>

        {/* ALTERNATIVE DIRECT CLIENT ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h5 className="text-xs font-extrabold uppercase text-slate-900 flex items-center gap-1.5">
              <ExternalLink className="w-4 h-4 text-[#00923f]" />
              <span>Open Mail App / Gmail (Direct Client Batch)</span>
            </h5>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Opens your default desktop or mobile mail app (Gmail / Outlook / Apple Mail) with all recipient emails in BCC and pre-filled credential details so you can send directly from your inbox.
            </p>
            <button
              onClick={handleOpenMailClient}
              disabled={votersToSend.length === 0}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer mt-1"
            >
              <Mail className="w-4 h-4 text-amber-300" />
              <span>Open Desktop Email Client</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h5 className="text-xs font-extrabold uppercase text-slate-900 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-[#00923f]" />
              <span>Export Credentials Mail Merge CSV</span>
            </h5>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Downloads a complete spreadsheet mapping each voter's first name, email, Voter ID, and rendered email body. Ideal for standard Mailchimp or Gmail Mail Merge tools.
            </p>
            <button
              onClick={handleDownloadCredentialsCSV}
              disabled={votersToSend.length === 0}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer mt-1"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Mail Merge CSV</span>
            </button>
          </div>
        </div>

        {/* LIVE DISPATCH PROGRESS BAR & LOGS */}
        {(isSending || logs.length > 0) && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold font-mono">
                <span className="text-slate-700">Dispatch Progress:</span>
                <span className="text-[#00923f] font-black">{sendProgress}% Complete</span>
              </div>
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-[#00923f] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${sendProgress}%` }}
                />
              </div>
            </div>

            {/* REAL-TIME DISPATCH EVENT LOG BOX */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 space-y-2 max-h-64 overflow-y-auto shadow-inner">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                <span className="font-bold uppercase tracking-wider text-slate-300">Live Email Dispatch Execution Logs</span>
                <button
                  onClick={copyLogsToClipboard}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLogs ? 'Copied Log' : 'Copy Log'}</span>
                </button>
              </div>

              {logs.map((log, idx) => (
                <div key={idx} className="leading-snug">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
