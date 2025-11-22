"use client";
import { useEffect, useRef, useState } from 'react';
import Header from "../components/Header";
import UploadGate from "../components/UploadGate";
import ChatWindow from "../components/ChatWindow";
import ConfirmDialog from "../components/ConfirmDialog";
import JobUpload from "../components/JobUpload";
import JobMatchCard from "../components/JobMatchCard";

export default function HomePage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [sessionId, setSessionId] = useState(() => String(Date.now()));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [resumeChunks, setResumeChunks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  // Job description + analysis state
  const [jdText, setJdText] = useState('');
  const [jdFileName, setJdFileName] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState(null);

  const triggerReuploadPicker = () => {
    fileInputRef.current?.click();
  };

  const onReuploadPicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setConfirmOpen(true);
    // reset input so picking the same file again still triggers change
    e.target.value = '';
  };

  const doUpload = async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  };

  const confirmReupload = async () => {
    if (!pendingFile) return;
    try {
      setIsProcessing(true);
      const data = await doUpload(pendingFile);
      setUploadedFileName(pendingFile.name || 'resume');
      setIsUnlocked(true);
      setResumeText(data?.text || '');
      setResumeChunks(Array.isArray(data?.chunks) ? data.chunks : []);
      setSessionId(String(Date.now())); // resets chat by key
      // clear JD and analysis when new resume starts
      setJdText('');
      setJdFileName(null);
      setMatchResult(null);
      setMatchError(null);
    } catch (e) {
      // optional: show toast; keeping minimal per scope
      console.error(e);
    } finally {
      setPendingFile(null);
      setConfirmOpen(false);
      setIsProcessing(false);
    }
  };

  const cancelReupload = () => {
    setPendingFile(null);
    setConfirmOpen(false);
  };

  // Auto analyze when both resume and JD texts are available
  useEffect(() => {
    const canAnalyze = (resumeText || '').trim().length > 0 && (jdText || '').trim().length > 0;
    if (!canAnalyze) {
      setMatchResult(null);
      setMatchError(null);
      setMatchLoading(false);
      return;
    }

    let cancelled = false;
    setMatchLoading(true);
    setMatchError(null);
    (async () => {
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText, jdText }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error || 'Analysis failed');
        setMatchResult({
          match: data?.match ?? 0,
          strengths: Array.isArray(data?.strengths) ? data.strengths : [],
          gaps: Array.isArray(data?.gaps) ? data.gaps : [],
          insights: data?.insights || '',
        });
      } catch (e) {
        if (!cancelled) {
          setMatchError(e.message || 'Analysis error');
          setMatchResult(null);
        }
      } finally {
        if (!cancelled) setMatchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resumeText, jdText]);

  return (
    <main>
      <Header unlocked={isUnlocked} fileName={uploadedFileName} onEditRequested={triggerReuploadPicker} disabled={isProcessing} />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={onReuploadPicked}
      />

      {!isUnlocked ? (
        <UploadGate
          onUploaded={(name, text, chunks) => {
            setUploadedFileName(name);
            setIsUnlocked(true);
            setResumeText(text || '');
            setResumeChunks(Array.isArray(chunks) ? chunks : []);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <ChatWindow key={sessionId} resumeText={resumeText} resumeChunks={resumeChunks} sessionId={sessionId} />
          <div className="space-y-4 lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <JobUpload
              onUploaded={(name, text) => {
                setJdFileName(name);
                setJdText(text || '');
              }}
            />
            <JobMatchCard jdFileName={jdFileName} matchResult={matchResult} loading={matchLoading} error={matchError} />
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-40 grid place-items-center">
          <div className="absolute inset-0 bg-slate-900/30" />
          <div className="relative rounded-2xl bg-white px-6 py-4 shadow-soft border border-slate-200 text-slate-700">
            Chunking the resume…
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Start a new session?"
        message="Uploading a new resume will start a new chat session. Continue?"
        confirmText="Start New Session"
        cancelText="Cancel"
        onConfirm={confirmReupload}
        onCancel={cancelReupload}
      />
    </main>
  );
}
