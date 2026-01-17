import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getScheduledReports, createScheduledReport, updateScheduledReport, deleteScheduledReport, runReportNow } from '../../services/scheduledReports';
import type { ScheduledReport } from '../../types';
import { ReportFrequency, ReportFormat, ReportType } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import Modal from '../common/Modal';
import { getReportData } from '../../services/reportDataService';
import { exportToExcel, exportToCSV, exportToPDF } from '../../services/exportService';
import DateRangePicker from '../common/DateRangePicker';
import { getDeliverySettings, saveDeliverySettings, sendReportViaWebhook } from '../../services/reportDeliveryService';
import { getRunsForReport } from '../../services/reportRunsService';
import type { ReportRun } from '../../types';

// ICONS
const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
);
const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
  </svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 10.5l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
  </svg>
);

const PaperAirplaneIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125a.563.563 0 01.72-.71l17.987 6.46c.44.158.44.792 0 .95l-17.988 6.46a.563.563 0 01-.719-.71L6 12zm0 0l7.5 7.5M6 12l7.5-7.5" />
  </svg>
);

// FORM COMPONENT
const ReportForm = ({
  report, onSave, onCancel
}: {
  report?: ScheduledReport | null,
  onSave: (reportData: Omit<ScheduledReport, 'id' | 'last_run' | 'next_run'>) => void,
  onCancel: () => void,
}) => {
  const [formData, setFormData] = useState({
    name: report?.name || '',
    report_type: report?.report_type || ReportType.LEADS,
    frequency: report?.frequency || ReportFrequency.WEEKLY,
    recipients: report?.recipients.join(', ') || '',
    format: report?.format || ReportFormat.CSV,
    include_charts: report?.include_charts !== false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Report name is required.';
    if (!formData.recipients.trim()) newErrors.recipients = 'At least one recipient is required.';
    else {
      const emails = formData.recipients.split(',').map(e => e.trim()).filter(Boolean);
      if (emails.some(email => !validateEmail(email))) {
        newErrors.recipients = 'One or more email addresses are invalid.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const parsed = name === 'include_charts' ? (e as any).target.checked : value;
    setFormData(prev => ({ ...prev, [name]: parsed }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const reportData = {
        ...formData,
        recipients: formData.recipients.split(',').map(e => e.trim()).filter(Boolean),
      };
      onSave(reportData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Report Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Report Type</label>
          <select name="report_type" value={formData.report_type} onChange={handleChange} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            {Object.values(ReportType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Frequency</label>
          <select name="frequency" value={formData.frequency} onChange={handleChange} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            {Object.values(ReportFrequency).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Recipients</label>
          <input type="text" name="recipients" value={formData.recipients} onChange={handleChange} placeholder="john@example.com, jane@example.com" className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
          <p className="text-xs text-slate-500 mt-1">Comma-separated email addresses.</p>
          {errors.recipients && <p className="text-red-500 text-xs mt-1">{errors.recipients}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Format</label>
          <select name="format" value={formData.format} onChange={handleChange} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            {Object.values(ReportFormat).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="include_charts" name="include_charts" checked={!!formData.include_charts} onChange={handleChange} />
          <label htmlFor="include_charts" className="text-sm text-slate-700 dark:text-slate-300">Include charts in PDF (when available)</label>
        </div>
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover sm:ml-3 sm:w-auto sm:text-sm">Save Report</button>
        <button type="button" onClick={onCancel} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 text-slate-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
      </div>
    </form>
  );
};


function ReportsScheduler() {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<ScheduledReport | null>(null);
  const [downloadReport, setDownloadReport] = useState<ScheduledReport | null>(null);
  const [downloadRange, setDownloadRange] = useState<{ from: string; to: string } | null>(null);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const deliveryInitial = getDeliverySettings();
  const [deliveryUrl, setDeliveryUrl] = useState<string>(deliveryInitial.webhookUrl);
  const [deliverySendOnRun, setDeliverySendOnRun] = useState<boolean>(deliveryInitial.sendOnRun);
  const [deliveryRetries, setDeliveryRetries] = useState<number>(deliveryInitial.retryCount);
  const [deliveryBackoff, setDeliveryBackoff] = useState<number>(deliveryInitial.backoffMs);
  const [historyReport, setHistoryReport] = useState<ScheduledReport | null>(null);
  const [historyRuns, setHistoryRuns] = useState<ReportRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const toastContext = useContext(ToastContext);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getScheduledReports();
      setReports(data);
    } catch (e: any) {
      const errorMessage = "Could not load scheduled reports. The database table might be missing or there's a network issue.";
      setError(errorMessage);
      console.error("Failed to fetch reports:", e?.message ?? e);
      toastContext?.showToast('Failed to load scheduled reports.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [toastContext]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSaveReport = async (reportData: Omit<ScheduledReport, 'id' | 'last_run' | 'next_run'>) => {
    try {
      if (editingReport) {
        await updateScheduledReport({ ...editingReport, ...reportData });
        toastContext?.showToast('Report updated successfully!', 'success');
      } else {
        await createScheduledReport(reportData);
        toastContext?.showToast('New report scheduled!', 'success');
      }
      setIsModalOpen(false);
      setEditingReport(null);
      fetchReports();
    } catch (e) {
      toastContext?.showToast('Failed to save report.', 'danger');
    }
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;
    try {
      await deleteScheduledReport(reportToDelete.id);
      toastContext?.showToast('Report schedule deleted.', 'success');
      setReportToDelete(null);
      fetchReports();
    } catch (e) {
      toastContext?.showToast('Failed to delete report.', 'danger');
    }
  };

  const formatRelativeTime = (iso: string) => {
    try {
      const target = new Date(iso).getTime();
      const now = Date.now();
      const diff = target - now;
      const abs = Math.abs(diff);
      const mins = Math.round(abs / 60000);
      if (mins < 1) return diff >= 0 ? 'in <1 min' : '<1 min ago';
      if (mins < 60) return diff >= 0 ? `in ${mins} min` : `${mins} min ago`;
      const hours = Math.round(mins / 60);
      return diff >= 0 ? `in ${hours} h` : `${hours} h ago`;
    } catch {
      return '';
    }
  };

  const handleRunNow = async (reportId: number) => {
    toastContext?.showToast('Generating and sending report...', 'info');
    const result = await runReportNow(reportId);
    if (result.success) {
      toastContext?.showToast(result.message, 'success');
      fetchReports();
    } else {
      toastContext?.showToast(result.message, 'danger');
    }
  };

  const handleDownload = async (report: ScheduledReport) => {
    setDownloadReport(report);
  };

  const confirmDownload = async () => {
    if (!downloadReport) return;
    try {
      const data = await getReportData(downloadReport.report_type, downloadRange || undefined);
      const filename = `${downloadReport.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
      if (downloadReport.format === ReportFormat.EXCEL) {
        exportToExcel(data, filename);
        toastContext?.showToast('Report exported as Excel.', 'success');
      } else if (downloadReport.format === ReportFormat.CSV) {
        exportToCSV(data, filename);
        toastContext?.showToast('Report exported as CSV.', 'success');
      } else {
        await exportToPDF(data, filename, { includeCharts: downloadReport.include_charts !== false });
        toastContext?.showToast('Report exported as PDF.', 'success');
      }
      setDownloadReport(null);
      setDownloadRange(null);
    } catch (e) {
      toastContext?.showToast('Failed to export report.', 'danger');
      console.error('Export error', e);
    }
  };

  const handleSendNow = async (report: ScheduledReport) => {
    const settings = getDeliverySettings();
    if (!settings.webhookUrl) {
      toastContext?.showToast('Configure a webhook URL in Delivery Settings.', 'warning');
      setIsDeliveryOpen(true);
      return;
    }
    toastContext?.showToast('Sending report via webhook...', 'info');
    const res = await sendReportViaWebhook(report, null);
    if (res.ok) {
      toastContext?.showToast('Report sent successfully.', 'success');
    } else {
      toastContext?.showToast(`Send failed${res.status ? ` (${res.status})` : ''}. ${res.error || ''}`, 'danger');
    }
  };

  const openCreateModal = () => {
    setEditingReport(null);
    setIsModalOpen(true);
  };

  const openEditModal = (report: ScheduledReport) => {
    setEditingReport(report);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Scheduled Reports</h2>
        <div className="flex gap-2">
          <button onClick={() => setIsDeliveryOpen(true)} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-md hover:bg-slate-300 transition-colors">Delivery Settings</button>
          <button onClick={openCreateModal} className="px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors">
            New Report
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Reports</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Report Name</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Frequency</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">Next Run</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">No scheduled reports found. Click "New Report" to begin.</td></tr>
              ) : reports.map(report => (
                <tr key={report.id}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-medium">{report.name}</div>
                    <div className="text-xs text-slate-500">{report.report_type} ({report.format})</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">{report.frequency}</td>
                  <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                    <div className="flex flex-col items-end lg:items-start">
                      <span>{new Date(report.next_run).toLocaleDateString()}</span>
                      <span className="text-xs text-slate-500">{formatRelativeTime(report.next_run)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium space-x-2">
                    <button onClick={() => handleRunNow(report.id)} className="text-slate-500 hover:text-success p-1" title="Run Now"><PlayIcon className="h-5 w-5" /></button>
                    <button onClick={() => handleSendNow(report)} className="text-slate-500 hover:text-indigo-600 p-1" title="Send Now"><PaperAirplaneIcon className="h-5 w-5" /></button>
                    <button onClick={async () => { setHistoryReport(report); setHistoryLoading(true); try { const runs = await getRunsForReport(report.id, 30); setHistoryRuns(runs); } finally { setHistoryLoading(false); } }} className="text-slate-500 hover:text-slate-700 p-1" title="History">H</button>
                    <button onClick={() => handleDownload(report)} className="text-slate-500 hover:text-slate-800 p-1" title="Download"><DownloadIcon className="h-5 w-5" /></button>
                    <button onClick={() => openEditModal(report)} className="text-slate-500 hover:text-primary p-1" title="Edit"><EditIcon className="h-5 w-5" /></button>
                    <button onClick={() => setReportToDelete(report)} className="text-slate-500 hover:text-danger p-1" title="Delete"><TrashIcon className="h-5 w-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <Modal title={editingReport ? 'Edit Report Schedule' : 'Create New Report'} onClose={() => setIsModalOpen(false)}>
          <ReportForm report={editingReport} onSave={handleSaveReport} onCancel={() => setIsModalOpen(false)} />
        </Modal>
      )}

      {downloadReport && (
        <Modal title={`Download: ${downloadReport.name}`} onClose={() => { setDownloadReport(null); setDownloadRange(null); }}>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-2">Select optional date range to filter the data.</p>
              <DateRangePicker value={downloadRange} onChange={setDownloadRange} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setDownloadReport(null); setDownloadRange(null); }} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">Cancel</button>
              <button onClick={confirmDownload} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">Download</button>
            </div>
          </div>
        </Modal>
      )}

      {isDeliveryOpen && (
        <Modal title="Delivery Settings" onClose={() => setIsDeliveryOpen(false)}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Webhook URL</label>
              <input
                type="url"
                value={deliveryUrl}
                onChange={e => setDeliveryUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/..."
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Usa Zapier/Make u otro endpoint que acepte POST JSON. Atención a CORS en entorno navegador.</p>
            </div>
            <div className="flex items-center gap-2">
              <input id="sendOnRun" type="checkbox" checked={deliverySendOnRun} onChange={e => setDeliverySendOnRun(e.target.checked)} />
              <label htmlFor="sendOnRun" className="text-sm text-slate-700 dark:text-slate-300">Send automatically when run</label>
            </div>
            <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
              <h4 className="text-sm font-semibold mb-2">Email</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Provider</label>
                  <select defaultValue={deliveryInitial.emailProvider || 'sendgrid'} onChange={e => { (deliveryInitial as any).emailProvider = e.target.value as any; }} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <option value="sendgrid">SendGrid</option>
                    <option value="emailjs">EmailJS (client-side)</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input id="emailEnabled" type="checkbox" checked={deliveryInitial.emailEnabled} onChange={e => { (deliveryInitial as any).emailEnabled = e.target.checked; }} />
                  <label htmlFor="emailEnabled" className="text-sm text-slate-700 dark:text-slate-300">Enable email delivery</label>
                </div>
              </div>
              {/* SendGrid fields */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-500">SendGrid</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">SendGrid API Key</label>
                  <input type="password" defaultValue={deliveryInitial.sendgridApiKey || ''} onChange={e => { (deliveryInitial as any).sendgridApiKey = e.target.value; }} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">From Email</label>
                  <input type="email" defaultValue={deliveryInitial.fromEmail || ''} onChange={e => { (deliveryInitial as any).fromEmail = e.target.value; }} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
              </div>
              {/* EmailJS fields */}
              <div className="flex items-center gap-2 mt-3 mb-2">
                <span className="text-xs text-slate-500">EmailJS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Public Key</label>
                  <input type="text" defaultValue={deliveryInitial.emailjsPublicKey || ''} onChange={e => { (deliveryInitial as any).emailjsPublicKey = e.target.value; }} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Service ID</label>
                  <input type="text" defaultValue={deliveryInitial.emailjsServiceId || ''} onChange={e => { (deliveryInitial as any).emailjsServiceId = e.target.value; }} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Template ID</label>
                  <input type="text" defaultValue={deliveryInitial.emailjsTemplateId || ''} onChange={e => { (deliveryInitial as any).emailjsTemplateId = e.target.value; }} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Max retries</label>
                <input type="number" min={0} max={5} value={deliveryRetries} onChange={e => setDeliveryRetries(Math.max(0, Math.min(5, parseInt(e.target.value || '0', 10))))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Backoff (ms)</label>
                <input type="number" min={500} step={100} value={deliveryBackoff} onChange={e => setDeliveryBackoff(Math.max(500, parseInt(e.target.value || '0', 10)))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeliveryOpen(false)} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">Cancel</button>
              <button onClick={() => { saveDeliverySettings({ webhookUrl: deliveryUrl.trim(), sendOnRun: deliverySendOnRun, retryCount: deliveryRetries, backoffMs: deliveryBackoff, emailEnabled: (deliveryInitial as any).emailEnabled, sendgridApiKey: (deliveryInitial as any).sendgridApiKey, fromEmail: (deliveryInitial as any).fromEmail }); toastContext?.showToast('Delivery settings saved.', 'success'); setIsDeliveryOpen(false); }} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {historyReport && (
        <Modal title={`History: ${historyReport.name}`} onClose={() => { setHistoryReport(null); setHistoryRuns([]); }}>
          <div className="p-6">
            {historyLoading ? (
              <div className="py-8 text-center">Loading...</div>
            ) : historyRuns.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No runs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Started</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Finished</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Message</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Size</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {historyRuns.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{new Date(r.started_at).toLocaleString()}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{r.finished_at ? new Date(r.finished_at).toLocaleString() : '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm capitalize">{r.status}</td>
                        <td className="px-4 py-2 text-sm">{r.message || ''}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{r.file_size_bytes ? `${r.file_size_bytes.toLocaleString()} B` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {reportToDelete && (
        <Modal title="Confirm Deletion" onClose={() => setReportToDelete(null)}>
          <div className="p-6">
            <p>Are you sure you want to delete the "<strong>{reportToDelete.name}</strong>" report schedule?</p>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setReportToDelete(null)} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ReportsScheduler;