import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Keyboard,
  RefreshCw,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const CheckInPage: React.FC = () => {
  const { token, user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Manual code input
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Recent feed
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Video scanner
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch('/api/check-in/events', {
        headers: {
          Authorization: `Bearer ${token || 'demo-staff-token'}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data || []);
        if (data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load check-in events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadHistory = async (evId: number) => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/check-in/event/${evId}/history`, {
        headers: {
          Authorization: `Bearer ${token || 'demo-staff-token'}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error('Failed to load check-in history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [token]);

  useEffect(() => {
    if (selectedEventId) {
      loadHistory(selectedEventId);
    }
  }, [selectedEventId]);

  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } catch (err) {
        console.warn('Camera access not available or granted:', err);
        alert('Camera preview is unavailable or access was denied. You can use the manual code check-in below.');
      }
    }
  };

  const processCheckIn = async (codeToVerify: string, method: string = 'manual_entry') => {
    if (!selectedEventId || !codeToVerify.trim()) return;

    setScanning(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/check-in/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || 'demo-staff-token'}`,
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          ticketCodeOrQr: codeToVerify.trim(),
          method,
        }),
      });

      const data = await res.json();
      setScanResult(data);
      if (data.success) {
        setManualCode('');
        loadHistory(selectedEventId);
        loadEvents();
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        code: 'NETWORK_ERROR',
        message: err.message || 'Verification network request failed',
      });
    } finally {
      setScanning(false);
    }
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-300">
              Staff Portal
            </span>
            <span className="text-xs text-stone-600 font-mono">
              Signed in as: {user?.displayName || 'Gate Staff'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
            Gate Check-In & Ticket Scanner
          </h1>
        </div>

        {/* Event Selector Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedEventId || ''}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            className="px-4 py-2 bg-white border border-[#DFD3C3] rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#965A28] shadow-xs"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.checkedInCount}/{ev.totalTickets} admitted)
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              loadEvents();
              if (selectedEventId) loadHistory(selectedEventId);
            }}
            className="p-2 rounded-xl bg-white border border-[#DFD3C3] text-stone-600 hover:text-stone-900 shadow-xs"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected Event Live Stats Banner */}
      {selectedEvent && (
        <div className="p-5 rounded-2xl bg-white border border-[#EADBCA] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">{selectedEvent.title}</h2>
              <span className="text-xs text-stone-600">
                Doors: {selectedEvent.doorsOpen || '18:00'} • Venue: {selectedEvent.venueName}
              </span>
            </div>

            <div className="flex items-center gap-6 font-mono text-xs">
              <div>
                <span className="text-stone-500 uppercase block text-[10px]">Total Sold</span>
                <span className="text-stone-900 font-bold text-sm">{selectedEvent.totalTickets}</span>
              </div>
              <div>
                <span className="text-stone-500 uppercase block text-[10px]">Admitted</span>
                <span className="text-emerald-700 font-bold text-sm">
                  {selectedEvent.checkedInCount}
                </span>
              </div>
              <div>
                <span className="text-stone-500 uppercase block text-[10px]">Remaining</span>
                <span className="text-amber-800 font-bold text-sm">
                  {selectedEvent.remainingCount}
                </span>
              </div>
              <div>
                <span className="text-stone-500 uppercase block text-[10px]">Progress</span>
                <span className="text-[#965A28] font-bold text-sm">
                  {selectedEvent.percentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#FAF7F0] rounded-full h-2.5 overflow-hidden border border-[#EADBCA]">
            <div
              className="bg-gradient-to-r from-[#C2824A] to-emerald-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${selectedEvent.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Verification Feedback Banner */}
      {scanResult && (
        <div
          className={`p-6 rounded-2xl border shadow-lg animate-in zoom-in-95 flex items-start gap-4 ${
            scanResult.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : scanResult.code === 'ALREADY_USED'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          {scanResult.success ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
          ) : scanResult.code === 'ALREADY_USED' ? (
            <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-8 h-8 text-rose-600 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/10">
                {scanResult.code}
              </span>
              <h3 className="text-base font-extrabold">{scanResult.message}</h3>
            </div>

            {scanResult.success && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div>
                  <span className="opacity-70 text-[10px] block">Attendee Name</span>
                  <strong className="text-sm font-sans">{scanResult.attendeeName}</strong>
                </div>
                <div>
                  <span className="opacity-70 text-[10px] block">Ticket Tier</span>
                  <strong className="text-sm">{scanResult.tierName}</strong>
                </div>
                <div>
                  <span className="opacity-70 text-[10px] block">Ticket Code</span>
                  <strong className="text-emerald-800">{scanResult.ticket?.ticketCode}</strong>
                </div>
              </div>
            )}

            {scanResult.code === 'ALREADY_USED' && scanResult.ticket && (
              <p className="text-xs opacity-90 pt-1 font-mono">
                Checked in at {new Date(scanResult.ticket.checkedInAt).toLocaleTimeString()} by Staff ID #{scanResult.ticket.checkedInBy}.
              </p>
            )}
          </div>

          <button
            onClick={() => setScanResult(null)}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Scanner & Manual Entry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Camera Scanner Interface */}
        <div className="p-6 rounded-2xl bg-white border border-[#EADBCA] space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#965A28]" />
              <h3 className="font-bold text-sm text-stone-900">Live Camera QR Scanner</h3>
            </div>
            <button
              onClick={toggleCamera}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                cameraActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-[#965A28] hover:bg-[#824B1E] text-white'
              }`}
            >
              {cameraActive ? 'Stop Camera' : 'Launch Camera'}
            </button>
          </div>

          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#FAF7F0] border border-[#DFD3C3] flex items-center justify-center text-center p-4">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="space-y-2 text-stone-500">
                <QrCode className="w-12 h-12 text-[#B87A3E] mx-auto" />
                <p className="text-xs">
                  Camera is idle. Click "Launch Camera" or paste the ticket QR code into manual entry.
                </p>
              </div>
            )}

            {cameraActive && (
              <div className="absolute inset-8 border-2 border-[#965A28] rounded-2xl pointer-events-none animate-pulse" />
            )}
          </div>
        </div>

        {/* Right: Manual Ticket Code Entry */}
        <div className="p-6 rounded-2xl bg-white border border-[#EADBCA] space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-[#965A28]" />
              <h3 className="font-bold text-sm text-stone-900">Manual Ticket Lookup / Barcode</h3>
            </div>
            <p className="text-xs text-stone-600">
              Type or paste the ticket code (e.g. <code>TCK-NEON-71402</code>) or the full scanned QR data string.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                processCheckIn(manualCode, 'manual_entry');
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] text-stone-600 font-semibold block mb-1">
                  Ticket Code or QR Payload
                </label>
                <input
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="TCK-..."
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F0] border border-[#DFD3C3] rounded-xl text-sm font-mono text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#965A28] uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={scanning || !manualCode.trim()}
                className="w-full py-3 rounded-xl bg-[#965A28] hover:bg-[#824B1E] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#965A28]/20 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{scanning ? 'Verifying...' : 'Validate & Admit Attendee'}</span>
              </button>
            </form>

            {/* Quick Demo Test Codes */}
            <div className="pt-2 border-t border-[#F0E6D8] space-y-1.5">
              <span className="text-[10px] font-mono text-stone-500 uppercase block">
                Quick Test Codes (Click to auto-fill):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualCode('TCK-NEON-71402');
                    processCheckIn('TCK-NEON-71402');
                  }}
                  className="text-[11px] font-mono bg-[#FAF7F0] hover:bg-[#F2E8DC] text-[#7A4515] px-2.5 py-1 rounded-lg border border-[#DFD3C3] font-semibold"
                >
                  TCK-NEON-71402 (Valid)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualCode('TCK-NEON-30411');
                    processCheckIn('TCK-NEON-30411');
                  }}
                  className="text-[11px] font-mono bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-300 font-semibold"
                >
                  TCK-NEON-30411 (Duplicate)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Recent Check-In Feed */}
      <div className="p-6 rounded-2xl bg-white border border-[#EADBCA] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#965A28]" />
            <h3 className="font-bold text-sm text-stone-900">Live Gate Activity Feed</h3>
          </div>
          <span className="text-xs text-stone-600 font-mono">
            Last {history.length} scans
          </span>
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EADBCA] text-stone-500 font-mono text-[10px] uppercase bg-[#FAF7F0]">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Attendee</th>
                  <th className="py-2.5 px-3">Ticket Code</th>
                  <th className="py-2.5 px-3">Tier</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Gate Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6D8] font-mono">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF7F0]">
                    <td className="py-2.5 px-3 text-stone-600">
                      {new Date(item.scannedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-bold text-stone-900">
                      {item.attendeeName}
                    </td>
                    <td className="py-2.5 px-3 text-[#965A28] font-bold">{item.ticketCode}</td>
                    <td className="py-2.5 px-3 text-stone-700 font-sans">{item.tierName}</td>
                    <td className="py-2.5 px-3 text-stone-600 capitalize">
                      {item.method.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-800 font-sans font-semibold">
                      {item.scannedByName || 'Staff'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-stone-500">
            No attendees checked in yet for this session.
          </div>
        )}
      </div>
    </div>
  );
};
