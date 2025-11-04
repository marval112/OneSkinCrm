import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getScheduledReports, createScheduledReport, updateScheduledReport, deleteScheduledReport, runReportNow } from '../../services/scheduledReports';
import type { ScheduledReport } from '../../types';
import { ReportFrequency, ReportFormat, ReportType } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import Modal from '../common/Modal';

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
    setFormData(prev => ({ ...prev, [name]: value }));
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
    } catch(e) {
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

  const handleRunNow = async (reportId: number) => {
    toastContext?.showToast('Generating and sending report...', 'info');
    const result = await runReportNow(reportId);
    if(result.success){
        toastContext?.showToast(result.message, 'success');
        fetchReports();
    } else {
        toastContext?.showToast(result.message, 'danger');
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
        <button onClick={openCreateModal} className="px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors">
          New Report
        </button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Report Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">Next Run</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">No scheduled reports found. Click "New Report" to begin.</td></tr>
              ) : reports.map(report => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{report.name}</div>
                    <div className="text-sm text-slate-500">{report.report_type} ({report.format})</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">{report.frequency}</td>
                  <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">{new Date(report.next_run).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => handleRunNow(report.id)} className="text-slate-500 hover:text-success p-1" title="Run Now"><PlayIcon className="h-5 w-5"/></button>
                      <button onClick={() => openEditModal(report)} className="text-slate-500 hover:text-primary p-1" title="Edit"><EditIcon className="h-5 w-5"/></button>
                      <button onClick={() => setReportToDelete(report)} className="text-slate-500 hover:text-danger p-1" title="Delete"><TrashIcon className="h-5 w-5"/></button>
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