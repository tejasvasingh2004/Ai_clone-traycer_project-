import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { VerificationResult } from '../../types/backend';

export function Verify() {
  const { verifyCode, connectSSE, waitForSSEConnection, addStreamingLog, streamingLogs } = useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setResult(null);
    const newOperationId = `verify-${Date.now()}`;

    try {
      // Connect to SSE for streaming logs
      const eventSource = connectSSE(newOperationId, (data) => {
        addStreamingLog(JSON.stringify(data));
      });
      await waitForSSEConnection(eventSource);

      // Run verification
      const verificationResult = await verifyCode(newOperationId);
      setResult(verificationResult);
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
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold text-white mb-2">Verify Code</h1>
        <p className="text-gray-400">Run verification checks on your code changes.</p>
        
        <div className="mt-6">
          <button
            onClick={handleVerify}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            {loading ? 'Verifying...' : 'Run Verification'}
          </button>
        </div>

        {streamingLogs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-4">Verification Log</h2>
            <div className="p-4 rounded-xl glass border border-white/5">
              <div className="space-y-2 font-mono text-sm">
                {streamingLogs.map((log, index) => (
                  <div key={index} className="text-gray-400">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-4">
            <div className={`p-6 rounded-xl border ${
              result.success 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{result.success ? '✅' : '❌'}</span>
                <h2 className="text-xl font-semibold text-white">
                  {result.success ? 'Verification Passed' : 'Verification Failed'}
                </h2>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-6 rounded-xl glass border border-red-500/20">
                <h3 className="text-lg font-semibold text-red-400 mb-4">Errors ({result.errors.length})</h3>
                <ul className="space-y-2">
                  {result.errors.map((error, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="p-6 rounded-xl glass border border-yellow-500/20">
                <h3 className="text-lg font-semibold text-yellow-400 mb-4">Warnings ({result.warnings.length})</h3>
                <ul className="space-y-2">
                  {result.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.success && result.errors.length === 0 && result.warnings.length === 0 && (
              <div className="p-6 rounded-xl glass border border-green-500/20">
                <p className="text-sm text-green-400">All checks passed successfully!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
