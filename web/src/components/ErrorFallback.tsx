export function ErrorFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white p-4">
      <div className="text-center max-w-sm">
        <h1 className="text-base font-semibold text-gray-900 mb-1">Something went wrong</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          An unexpected error occurred. Please reload the page to continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Reload page
        </button>
      </div>
    </div>
  )
}
