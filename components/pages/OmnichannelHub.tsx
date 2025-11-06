
import React, { useEffect, useState } from 'react';
import { sendEmail } from '../../services/emailService';
import { logActivity, listActivities } from '../../services/activityService';
import { supabase } from '../../services/supabaseClient';
import type { ActivityLog } from '../../types';
import { useAuth } from '../../contexts/AuthContext.tsx';

function Inbox({ items }: { items: ActivityLog[] }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">Unified Inbox</h2>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        {items.length === 0 && <li className="py-4 text-slate-500">No activity yet.</li>}
        {items.map(a => (
          <li key={a.id} className="py-3 flex items-start gap-3">
            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">{a.channel}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.subject || a.message?.slice(0, 60) || '(no subject)'}</div>
              <div className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()} {a.to && a.to.length ? `• to ${a.to.join(', ')}` : ''}</div>
              {a.message && <p className="text-sm mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{a.message}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmailComposer({ onSent }: { onSent: () => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) return;
    setSending(true);
    try {
      const toList = to.split(',').map(e => e.trim()).filter(Boolean);
      const res = await sendEmail({ to: toList, subject, text: body });
      if (!res.ok) throw new Error(res.error || `Status ${res.status}`);
      // Attempt to link this activity to a customer or lead by matching recipient email
      let customerId: number | undefined;
      let leadId: number | undefined;
      try {
        if (toList.length > 0) {
          const { data: custMatch } = await supabase
            .from('customers')
            .select('id, email')
            .in('email', toList)
            .limit(1);
          if (custMatch && custMatch.length > 0) {
            customerId = (custMatch[0] as any).id as number;
          } else {
            const { data: leadMatch } = await supabase
              .from('leads')
              .select('id, email')
              .in('email', toList)
              .limit(1);
            if (leadMatch && leadMatch.length > 0) {
              leadId = (leadMatch[0] as any).id as number;
            }
          }
        }
      } catch {
        // Best-effort linking; ignore matching errors
      }

      await logActivity({
        user_id: user?.id || null,
        channel: 'email',
        direction: 'out',
        subject,
        message: body,
        to: toList,
        ...(customerId ? { customer_id: customerId } : {}),
        ...(leadId ? { lead_id: leadId } : {}),
      });
      setSubject(''); setBody('');
      onSent();
    } catch (e) {
      console.error('Send failed', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">Send Email</h2>
      <div className="space-y-3">
        <input value={to} onChange={e => setTo(e.target.value)} placeholder="to1@example.com, to2@example.com" className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Message" className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
        <div className="text-right">
          <button disabled={sending} onClick={handleSend} className="px-4 py-2 rounded-md bg-primary text-white disabled:bg-slate-400">{sending ? 'Sending...' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}

function OmnichannelHub() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'email' | 'calls' | 'notes'>('inbox');
  const [items, setItems] = useState<ActivityLog[]>([]);

  const refresh = async () => {
    try { setItems(await listActivities(50)); } catch (e) { console.warn('Activities table missing?', e); }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => setActiveTab('inbox')} className={`px-3 py-2 rounded-md ${activeTab==='inbox'?'bg-primary text-white':'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600'}`}>Inbox</button>
        <button onClick={() => setActiveTab('email')} className={`px-3 py-2 rounded-md ${activeTab==='email'?'bg-primary text-white':'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600'}`}>Email</button>
        <button onClick={() => setActiveTab('calls')} className={`px-3 py-2 rounded-md ${activeTab==='calls'?'bg-primary text-white':'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600'}`}>Calls</button>
        <button onClick={() => setActiveTab('notes')} className={`px-3 py-2 rounded-md ${activeTab==='notes'?'bg-primary text-white':'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600'}`}>Notes</button>
      </div>
      {activeTab === 'inbox' && <Inbox items={items} />}
      {activeTab === 'email' && <EmailComposer onSent={refresh} />}
      {activeTab === 'calls' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Log a Call</h2>
          <CallLogger onLogged={refresh} />
        </div>
      )}
      {activeTab === 'notes' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Quick Note</h2>
          <NoteComposer onSaved={refresh} />
        </div>
      )}
    </div>
  );
}

function CallLogger({ onLogged }: { onLogged: () => void }) {
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const clickToCall = () => {
    if (phone.trim()) window.location.href = `tel:${phone.trim()}`;
  };
  const save = async () => {
    setSaving(true);
    try {
      // Attempt to link call activity to a customer or lead by matching phone number
      const phoneTrimmed = phone.trim();
      let customerId: number | undefined;
      let leadId: number | undefined;
      try {
        if (phoneTrimmed) {
          const { data: custMatch } = await supabase
            .from('customers')
            .select('id, phone')
            .eq('phone', phoneTrimmed)
            .limit(1);
          if (custMatch && custMatch.length > 0) {
            customerId = (custMatch[0] as any).id as number;
          } else {
            const { data: leadMatch } = await supabase
              .from('leads')
              .select('id, phone')
              .eq('phone', phoneTrimmed)
              .limit(1);
            if (leadMatch && leadMatch.length > 0) {
              leadId = (leadMatch[0] as any).id as number;
            }
          }
        }
      } catch {
        // Best-effort linking; ignore matching errors
      }

      await logActivity({
        user_id: user?.id || null,
        channel: 'call',
        direction: 'out',
        subject: `Call to ${phone}`,
        message: note,
        ...(customerId ? { customer_id: customerId } : {}),
        ...(leadId ? { lead_id: leadId } : {}),
      });
      setPhone(''); setNote(''); onLogged();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="flex-1 px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
        <button onClick={clickToCall} className="px-3 py-2 rounded-md bg-primary text-white">Call</button>
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} placeholder="Notes..." className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
      <div className="text-right">
        <button disabled={saving} onClick={save} className="px-4 py-2 rounded-md bg-primary text-white disabled:bg-slate-400">{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}

function NoteComposer({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try { await logActivity({ user_id: user?.id || null, channel: 'note', message: text }); setText(''); onSaved(); } catch(e) { console.error(e); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-3">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder="Write a note..." className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
      <div className="text-right">
        <button disabled={saving} onClick={save} className="px-4 py-2 rounded-md bg-primary text-white disabled:bg-slate-400">{saving ? 'Saving...' : 'Save Note'}</button>
      </div>
    </div>
  );
}

export default OmnichannelHub;
