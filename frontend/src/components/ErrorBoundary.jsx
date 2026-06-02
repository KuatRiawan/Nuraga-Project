import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI when an error occurs
            return (
                <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-xl">
                        <div className="text-center">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                                Something went wrong
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                An unexpected error occurred. Please refresh the page or contact support if the problem persists.
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                            >
                                Refresh Page
                            </button>
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="mt-6 text-left">
                                    <summary className="cursor-pointer text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">
                                        Error Details (Development Only)
                                    </summary>
                                    <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-48 text-red-600 dark:text-red-400">
                                        {this.state.error.toString()}
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
