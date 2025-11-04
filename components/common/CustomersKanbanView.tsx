import React, { useState } from 'react';
import type { Customer } from '../../types';
import { CustomerStatus } from '../../types';

interface CustomersKanbanViewProps {
    customers: Customer[];
    onUpdateCustomer: (customer: Customer) => void;
    onEmailCustomer: (customer: Customer) => void;
}

const statusColors: Record<CustomerStatus, { bg: string, text: string, border: string }> = {
  [CustomerStatus.Active]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
  [CustomerStatus.Prospect]: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-500' },
  [CustomerStatus.Churned]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
};

const EnvelopeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const CustomerCard: React.FC<{ customer: Customer; onEmail: () => void; }> = ({ customer, onEmail }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('customerId', customer.id.toString());
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className={`p-3 bg-white dark:bg-slate-800 rounded-lg shadow border-l-4 ${statusColors[customer.status].border} mb-3 cursor-grab active:cursor-grabbing`}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{customer.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{customer.company}</p>
                    {customer.segment && <span className="mt-1 text-xs font-semibold inline-block bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-full">{customer.segment}</span>}
                </div>
                 <button onClick={(e) => { e.stopPropagation(); onEmail(); }} className="text-slate-400 hover:text-primary p-1 rounded-full">
                    <EnvelopeIcon className="h-5 w-5"/>
                </button>
            </div>
            <div className="flex items-center justify-between mt-2">
                 <span className={`text-xs font-bold ${statusColors[customer.status].text}`}>Health: {customer.health_score}</span>
                 <div className="w-16 bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                    <div className="bg-success h-1.5 rounded-full" style={{ width: `${customer.health_score}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const KanbanColumn: React.FC<{
    status: CustomerStatus;
    customers: Customer[];
    onDrop: (status: CustomerStatus) => void;
    onEmailCustomer: (customer: Customer) => void;
}> = ({
    status,
    customers,
    onDrop,
    onEmailCustomer
}) => {
    const [isOver, setIsOver] = useState(false);
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(true);
    };

    const handleDragLeave = () => {
        setIsOver(false);
    }
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        onDrop(status);
        setIsOver(false);
    }

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-1 min-w-[280px] bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg transition-colors ${isOver ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
        >
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3 px-1">{status} ({customers.length})</h3>
            <div className="space-y-3">
                {customers.map(customer => <CustomerCard key={customer.id} customer={customer} onEmail={() => onEmailCustomer(customer)} />)}
            </div>
        </div>
    );
};

function CustomersKanbanView({ customers, onUpdateCustomer, onEmailCustomer }: CustomersKanbanViewProps) {
    const handleDrop = (customerIdStr: string, newStatus: CustomerStatus) => {
        const customerId = parseInt(customerIdStr, 10);
        const customerToMove = customers.find(c => c.id === customerId);
        if (customerToMove && customerToMove.status !== newStatus) {
            onUpdateCustomer({ ...customerToMove, status: newStatus });
        }
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {Object.values(CustomerStatus).map(status => (
                <KanbanColumn
                    key={status}
                    status={status}
                    customers={customers.filter(c => c.status === status)}
                    onEmailCustomer={onEmailCustomer}
                    onDrop={(newStatus) => handleDrop(
                        (window.event as DragEvent).dataTransfer!.getData('customerId'),
                        newStatus
                    )}
                />
            ))}
        </div>
    );
}

export default CustomersKanbanView;