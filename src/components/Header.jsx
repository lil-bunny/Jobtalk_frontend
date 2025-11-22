export default function Header({ unlocked, fileName, onEditRequested, disabled = false }) {
  return (
    <header className="mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-600 text-white grid place-items-center text-xl shadow-soft">💼</div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Resume Chat</h1>
            <p className="text-slate-500 text-sm">Upload your resume to start chatting</p>
          </div>
        </div>
        <div className="text-sm text-slate-600">
          {unlocked ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 px-3 py-1 border border-green-200">
                Unlocked{fileName ? ` • ${fileName}` : ''}
              </span>
              <button
                className="button-ghost px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onEditRequested}
                disabled={disabled}
                title="Reupload resume"
              >
                Edit
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-700 px-3 py-1 border border-amber-200">Locked</span>
          )}
        </div>
      </div>
    </header>
  );
}
