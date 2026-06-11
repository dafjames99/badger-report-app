'use client';

import { useState, useEffect } from 'react';

export function FeedbackWidget() {
    // const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<'bug' | 'feedback'>('bug');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Auto-hide the success banner after 3 seconds
    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess]);

    // useEffect(() => {
    //     setMounted(true);
    // }, []);
    const handleFormAction = async (formData: FormData) => {
        const details = formData.get('details') as string;
        if (!details || !details.trim()) return;

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, details }),
            });

            if (res.ok) {
                setIsOpen(false);
                setShowSuccess(true);
            } else {
                alert('Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to submit report.');
        } finally {
            setIsSubmitting(false);
        }
    };
    // if (!mounted) return null;
    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 rounded-full bg-brand-end px-4 py-3 text-sm font-semibold text-text-anti shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-end-dark focus:ring-offset-2"
            >
                Feedback / Bug?
            </button>

            {/* Success Banner */}
            {showSuccess && (
                <div className="fixed bottom-24 right-6 z-50 flex items-center space-x-2 rounded-md bg-success-primary px-4 py-3 text-text-anti shadow-lg animate-in slide-in-from-bottom-5">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Report sent successfully!</span>
                </div>
            )}

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="relative w-full max-w-md rounded-xl bg-background p-6 shadow-2xl">

                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-4 text-text-disabled hover:text-text-muted focus:outline-none"
                            aria-label="Close"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <h2 className="mb-4 text-xl font-semibold text-text-muted">Send Feedback</h2>

                        <form action={handleFormAction} className="space-y-4">
                            {/* Type Toggle (Bug / Feedback) */}
                            <div className="flex rounded-lg bg-button-disabled p-1">
                                <button
                                    type="button"
                                    onClick={() => setType('bug')}
                                    className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${type === 'bug' ? 'bg-background text-action-primary shadow' : 'text-text-anti hover:text-text-muted'
                                        }`}
                                >
                                    Report a Bug
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('feedback')}
                                    className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${type === 'feedback' ? 'bg-background text-action-primary shadow' : 'text-text-anti hover:text-text-muted'
                                        }`}
                                >
                                    Give Feedback
                                </button>
                            </div>

                            {/* Text Area */}
                            <div>
                                <label className="sr-only" htmlFor="details">Details</label>
                                <textarea
                                    id="details"
                                    suppressHydrationWarning
                                    rows={5}
                                    required
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder={
                                        type === 'bug'
                                            ? "What happened? Steps to recreate?\nDevice / Browser?"
                                            : "What's on your mind? How can we improve?"
                                    }
                                    className="w-full resize-none rounded-md border-2 border-border-muted p-3 text-sm text-text-base placeholder-text-placeholder focus:border-border-base focus:outline-none focus:ring-1 focus:ring-border-base"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting || !details.trim()}
                                className="w-full rounded-md bg-success-primary py-2.5 text-sm font-semibold text-text-anti transition-colors hover:bg-success-hover disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Report'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}