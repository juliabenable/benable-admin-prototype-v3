import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import Modal from '../../components/Modal.jsx';

export default function BulkInviteDialog({ brand, creators, onClose, onSent }) {
  const [previewIdx, setPreviewIdx] = useState(0);
  const [subject, setSubject] = useState(`Join the ${brand.name} creator program`);
  const [bodyTemplate, setBodyTemplate] = useState(
    `Hi {{firstName}},\n\n` +
    `We're inviting you to join Benable's creator program for ${brand.name}. ` +
    `${brand.description}\n\n` +
    `Click the link below to set up your profile and tell us a bit about your collab preferences. ` +
    `It only takes a few minutes.\n\n` +
    `— Katie at Benable`,
  );

  const rendered = useMemo(() => {
    const c = creators[previewIdx];
    if (!c) return '';
    return bodyTemplate
      .replace(/\{\{firstName\}\}/g, c.firstName ?? c.name?.split(' ')[0] ?? 'there')
      .replace(/\{\{name\}\}/g, c.name ?? '')
      .replace(/\{\{handle\}\}/g, c.handle ?? '');
  }, [creators, previewIdx, bodyTemplate]);

  const previewCreator = creators[previewIdx];

  return (
    <Modal
      title={`Invite ${creators.length} creator${creators.length === 1 ? '' : 's'} to the ${brand.name} program`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" onClick={() => onSent(creators)}>
            <Send size={14} /> Send {creators.length} invite{creators.length === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="muted micro" style={{ display: 'block', marginBottom: 4 }}>Subject</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="muted micro" style={{ display: 'block', marginBottom: 4 }}>Email body (template)</label>
          <textarea
            className="textarea"
            value={bodyTemplate}
            onChange={(e) => setBodyTemplate(e.target.value)}
            rows={8}
          />
          <div className="muted small" style={{ marginTop: 4 }}>
            Use <code>{'{{firstName}}'}</code>, <code>{'{{name}}'}</code>, <code>{'{{handle}}'}</code> for personalization.
          </div>
        </div>

        <div className="bulk-preview">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="muted micro">Preview · recipient {previewIdx + 1} of {creators.length}</div>
            <div className="row gap-2">
              <button
                type="button"
                className="btn ghost small"
                disabled={previewIdx === 0}
                onClick={() => setPreviewIdx((i) => Math.max(0, i - 1))}
              >
                ← Prev
              </button>
              <button
                type="button"
                className="btn ghost small"
                disabled={previewIdx >= creators.length - 1}
                onClick={() => setPreviewIdx((i) => Math.min(creators.length - 1, i + 1))}
              >
                Next →
              </button>
            </div>
          </div>
          <div className="bulk-preview-card">
            <div className="bulk-preview-meta">
              <span><strong>To:</strong> {previewCreator?.email}</span>
              <span><strong>Subject:</strong> {subject}</span>
            </div>
            <pre className="bulk-preview-body">{rendered}</pre>
          </div>
        </div>
      </div>
    </Modal>
  );
}
