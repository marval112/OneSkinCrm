import type { ToastContextType } from '../types';

/**
 * Simulates sending an email.
 * In a real application, this would use a service like SendGrid, Mailgun, or an SMTP server.
 */
export const sendEmail = async (
    to: string,
    subject: string,
    body: string,
    toastContext: ToastContextType | undefined
): Promise<void> => {
    console.log("--- SIMULATING EMAIL SEND ---");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log("-----------------------------");

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate a random failure for demonstration purposes
    if (Math.random() < 0.1) { // 10% chance of failure
        toastContext?.showToast('Failed to send email. Please try again.', 'danger');
        throw new Error('Simulated network failure.');
    }

    // Success is handled in the component to use translation
};
