import { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface PanelErrorBoundaryProps {
  panelName: string;
  children: ReactNode;
}

interface PanelErrorBoundaryState {
  error: Error | null;
}

export class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  state: PanelErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.panelName}] render error:`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[120px] p-6 bg-red-950/20 border border-red-500/30 text-red-300">
          <AlertCircle className="w-8 h-8 mb-3 text-red-400" />
          <p className="text-sm font-semibold text-red-200 mb-1">
            Something went wrong in {this.props.panelName}
          </p>
          <p className="text-xs text-red-400/80 text-center max-w-sm mb-3">
            Something went wrong displaying the execution result — see console for details.
          </p>
          <p className="text-[10px] font-mono text-red-500/70 text-center max-w-md break-all mb-4">
            {this.state.error.message}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
