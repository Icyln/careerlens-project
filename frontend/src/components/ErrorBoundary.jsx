import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('CareerLens UI crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h2 className="text-xl font-black">The page hit a display error.</h2>
          <p className="mt-2 text-sm leading-6">
            The report was generated, but the frontend received a value in an unexpected format. Refresh the page and try again.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white"
          >
            Try showing page again
          </button>
          {this.state.error?.message && (
            <pre className="mt-4 overflow-auto rounded-2xl bg-white p-4 text-xs text-rose-800">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
