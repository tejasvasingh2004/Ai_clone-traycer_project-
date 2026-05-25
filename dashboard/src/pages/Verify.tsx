import { useState } from 'react';
import { api } from '../api/client';
import { VerificationResult } from '../types';
import StreamingLog from '../components/StreamingLog';

export default function Verify() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [logs, setLogs] = useState<Array<{ type: string; message?: string; error?: string }>>([]);

  const handleVerify = async () => {
    setLoading(true);
    setResult(null);
    setLogs([]);
    const newOperationId = `verify-${Date.now()}`;

    try {
      // Connect to SSE for streaming logs
      const eventSource = api.connectSSE(
        newOperationId,
        (data) => {
          if (data.type === 'progress' || data.type === 'complete' || data.type === 'error' || data.type === 'connected') {
            setLogs((prev) => [...prev, data]);
          } else if (data.message) {
            setLogs((prev) => [...prev, { type: 'progress', message: data.message }]);
          }
        },
        (error) => {
          console.error('SSE error:', error);
          setLogs((prev) => [...prev, { type: 'error', error: 'Connection error' }]);
        }
      );

      // Run verification
      const verificationResult = await api.verifyCode(newOperationId);
      setResult(verificationResult);
      
      // Close SSE connection after a delay
      setTimeout(() => {
        eventSource.close();
      }, 2000);
    } catch (error) {
      console.error('Verification failed:', error);
      setResult({
        success: false,
        errors: [error instanceof Error ? error.message : 'Verification failed'],
        warnings: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-[220px] p-8">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-text mb-6">Verify Code</h1>
        
        <div className="mb-6">
          <button
            onClick={handleVerify}
            disabled={loading}
            className="px-6 py-2.5 bg-primary hover:bg-primaryHover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Run Verification'}
          </button>
        </div>

        {logs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text mb-4">Verification Log</h2>
            <StreamingLog messages={logs} />
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className={`p-6 rounded-lg border ${result.success ? 'bg-[#052e16] border-success' : 'bg-[#450a0a] border-error'}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{result.success ? '✅' : '❌'}</span>
                <h2 className="text-xl font-semibold text-text">
                  {result.success ? 'Verification Passed' : 'Verification Failed'}
                </h2>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-6 bg-surface border border-error rounded-lg">
                <h3 className="text-lg font-semibold text-error mb-4">Errors ({result.errors.length})</h3>
                <ul className="space-y-2">
                  {result.errors.map((error, index) => (
                    <li key={index} className="text-sm text-text flex items-start gap-2">
                      <span className="text-error">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="p-6 bg-surface border border-warning rounded-lg">
                <h3 className="text-lg font-semibold text-warning mb-4">Warnings ({result.warnings.length})</h3>
                <ul className="space-y-2">
                  {result.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-text flex items-start gap-2">
                      <span className="text-warning">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.success && result.errors.length === 0 && result.warnings.length === 0 && (
              <div className="p-6 bg-surface border border-success rounded-lg">
                <p className="text-sm text-success">All checks passed successfully!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
