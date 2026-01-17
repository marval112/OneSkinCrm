import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getIntegrations, connectIntegration, disconnectIntegration } from '../../services/integrationsHub';
import type { Integration } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';

// Fix: Extracted props to a dedicated interface to improve type safety and resolve assignment errors.
interface IntegrationCardProps {
    integration: Integration;
    onConnect: (id: string) => void;
    onDisconnect: (id: string) => void;
    loadingId: string | null;
}

// Fix: Explicitly type as a React.FC to ensure special props like 'key' are handled correctly by TypeScript.
const IntegrationCard: React.FC<IntegrationCardProps> = ({ integration, onConnect, onDisconnect, loadingId }) => {
    const isLoading = loadingId === integration.id;
    return (
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
            <div className="flex items-center mb-4">
                <img src={integration.logo} alt={`${integration.name} logo`} className="h-12 w-12 object-contain mr-4"/>
                <div>
                    <h3 className="text-lg font-semibold">{integration.name}</h3>
                    {integration.status === 'connected' ? (
                        <span className="text-xs font-medium text-success bg-green-100 px-2 py-1 rounded-full">Connected</span>
                    ) : (
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Disconnected</span>
                    )}
                </div>
            </div>
            <p className="text-sm text-slate-600 flex-grow">{integration.description}</p>
            <div className="mt-6">
                {integration.status === 'connected' ? (
                    <button
                        onClick={() => onDisconnect(integration.id)}
                        disabled={isLoading}
                        className="w-full px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-md hover:bg-slate-300 disabled:opacity-50 transition-colors"
                    >
                         {isLoading ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                ) : (
                    <button
                        onClick={() => onConnect(integration.id)}
                        disabled={isLoading}
                        className="w-full px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? 'Connecting...' : 'Connect'}
                    </button>
                )}
            </div>
        </div>
    );
};


function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const toastContext = useContext(ToastContext);
  
  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
        const data = await getIntegrations();
        setIntegrations(data);
    } catch(e) {
        toastContext?.showToast('Failed to load integrations.', 'danger');
    } finally {
        setLoading(false);
    }
  }, [toastContext]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleConnect = async (id: string) => {
    setActionLoadingId(id);
    try {
        await connectIntegration(id);
        toastContext?.showToast('Integration connected successfully!', 'success');
        fetchIntegrations();
    } catch {
        toastContext?.showToast('Failed to connect integration.', 'danger');
    } finally {
        setActionLoadingId(null);
    }
  };
  
  const handleDisconnect = async (id: string) => {
    setActionLoadingId(id);
    try {
        await disconnectIntegration(id);
        toastContext?.showToast('Integration disconnected.', 'info');
        fetchIntegrations();
    } catch {
        toastContext?.showToast('Failed to disconnect integration.', 'danger');
    } finally {
        setActionLoadingId(null);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading integrations...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {integrations.map(integration => (
        <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            loadingId={actionLoadingId}
        />
      ))}
    </div>
  );
}

export default Integrations;