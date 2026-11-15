import { useState } from 'react';
import StatusBadge from './StatusBadge';
import { API_BASE_URL } from '../config';

const STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
];

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function humanize(action) {
  if (!action) return 'Update';
  const text = String(action).replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function mediaSrc(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

function getDepartment(grievance) {
  if (grievance.department) return grievance.department;
  if (grievance.departmentName) return grievance.departmentName;
  const match = String(grievance.routingReason || '').match(/Routed to (.+?) based on/i);
  return match ? match[1] : '-';
}

function InfoCard({ label, children }) {
  return (
    <div className="bg-[#F8FAF9] rounded-xl px-3.5 py-2.5">
      <p className="text-[11px] text-[#94A3B8] mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-[#0B1F3A] capitalize">{children}</div>
    </div>
  );
}

export default function TrackingCard({ grievance, evidence = [], labels = {}, onUpvote, upvoting }) {
  const [copied, setCopied] = useState(false);

  const l = {
    supporters: 'Supporters',
    supportBtn: 'Support this issue',
    supporting: 'Supporting...',
    resolutionEvidence: 'Resolution evidence',
    evidenceTrail: 'Status timeline',
    ...labels,
  };

  const currentStep = Math.max(
    0,
    STEPS.findIndex((s) => s.key === grievance.status)
  );

  const timeline = [...(grievance.auditTrail || [])].reverse();

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(String(grievance.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="bg-white border border-[#E5EEEC] rounded-3xl p-6 md:p-8 shadow-sm mt-4">
      {/* Grievance ID */}
      <div className="flex items-center justify-between gap-3 bg-[#F8FAF9] rounded-xl px-4 py-3 mb-5">
        <div className="min-w-0">
          <p className="text-[11px] text-[#94A3B8] mb-0.5">Grievance ID</p>
          <p className="text-sm font-semibold text-[#0B1F3A] truncate select-all">{grievance.id}</p>
        </div>
        <button
          type="button"
          onClick={copyId}
          className="shrink-0 text-xs font-semibold text-[#0EA5A0] bg-white border border-[#CFEFEC] px-3 py-1.5 rounded-full hover:bg-[#E0FBF7] transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Title + status */}
      <div className="flex justify-between items-start mb-2 gap-4">
        <h1 className="text-xl font-bold text-[#0B1F3A] capitalize">{grievance.title}</h1>
        <StatusBadge status={grievance.status} />
      </div>
      <p className="text-[#64748B] mb-6">{grievance.description}</p>

      {/* Stepper */}
      <div className="flex items-start mb-6">
        {STEPS.map((step, i) => {
          const done = i <= currentStep;
          return (
            <div key={step.key} className="flex items-start flex-1 last:flex-none">
              <div className="flex flex-col items-center w-20">
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs ${
                    done
                      ? 'bg-[#0EA5A0] border-[#0EA5A0] text-white'
                      : 'bg-white border-[#CBD5D1] text-transparent'
                  }`}
                >
                  ✓
                </div>
                <p
                  className={`text-xs mt-1.5 text-center ${
                    i === currentStep ? 'font-semibold text-[#0B1F3A]' : done ? 'text-[#0B1F3A]' : 'text-[#94A3B8]'
                  }`}
                >
                  {step.label}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mt-3.5 -ml-2 -mr-2 ${
                    i < currentStep ? 'bg-[#0EA5A0]' : 'bg-[#E5EEEC]'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <InfoCard label="Category">{grievance.category}</InfoCard>
        <InfoCard label={l.supporters}>👍 {grievance.upvotes ?? 0}</InfoCard>
        <InfoCard label="Department">🏢 {getDepartment(grievance)}</InfoCard>
      </div>

      {onUpvote && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onUpvote}
            className="text-xs font-semibold text-[#0EA5A0] bg-[#F0FDFA] border border-[#CFEFEC] px-4 py-2 rounded-full hover:bg-[#E0FBF7] transition-colors"
          >
            {upvoting ? l.supporting : l.supportBtn}
          </button>
        </div>
      )}

      {/* Address */}
      {grievance.address && (
        <div className="flex items-start gap-2 bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl px-3.5 py-2.5 mb-4 text-sm text-[#1D4ED8]">
          <span>📍</span>
          <span>{grievance.address}</span>
        </div>
      )}

      {/* Photos */}
      {grievance.media && grievance.media.length > 0 && (
        <div className="mb-4">
          {grievance.media.map((m, i) => (
            <img
              key={i}
              src={m.url}
              alt="Grievance photo"
              className="w-full max-h-80 object-cover rounded-xl mb-2"
            />
          ))}
        </div>
      )}

      {/* Resolution evidence */}
      {evidence.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">
            {l.resolutionEvidence}
          </h2>
          {evidence.map((item) => (
            <div key={item.id} className="mb-3 p-4 bg-[#F0FDFA] border border-[#CFEFEC] rounded-xl">
              <img
                src={mediaSrc(item.mediaUrl)}
                alt="Resolution evidence"
                className="w-full max-h-64 object-cover rounded-lg mb-2"
              />
              <p className="text-sm text-[#0B1F3A]">{item.note}</p>
              <p className="text-xs text-[#94A3B8] mt-1">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">
        {l.evidenceTrail}
      </h2>
      {timeline.length === 0 ? (
        <p className="text-sm text-[#94A3B8]">No updates yet.</p>
      ) : (
        <div>
          {timeline.map((e, i) => (
            <div key={i} className="flex gap-3 pb-3">
              <div className="flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5A0] mt-1.5" />
                {i < timeline.length - 1 && <span className="w-0.5 flex-1 bg-[#E5EEEC] mt-1" />}
              </div>
              <div>
                <p className="text-sm font-semibold !text-[#0B1F3A]">{e.note || humanize(e.action)}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {e.actor || 'system'} · {formatDate(e.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}