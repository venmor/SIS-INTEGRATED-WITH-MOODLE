export function SupportQueueFilters({
  status,
  reference,
}: {
  status: string;
  reference: string;
}) {
  return (
    <form
      action="/admin/support"
      method="get"
      aria-label="Filter assigned requests"
      className="grid gap-4 rounded-sis border border-sis-border bg-sis-surface p-4 shadow-sis sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] sm:items-end"
    >
      <label
        className="grid gap-2 text-sm font-semibold"
        htmlFor="support-queue-status"
      >
        Show requests
        <select
          id="support-queue-status"
          name="status"
          defaultValue={status}
          className="min-h-11 rounded-sis border border-sis-border bg-sis-surface px-3 text-base font-normal text-sis-text"
        >
          <option value="ALL">All assigned</option>
          <option value="OPEN">Open cases</option>
          <option value="NEEDS_REPLY">Needs reply</option>
          <option value="RECEIVED">New requests</option>
          <option value="STUDENT_REPLIED">Student replied</option>
          <option value="ADVISER_REPLIED">I replied</option>
          <option value="CLOSED">Completed</option>
        </select>
      </label>
      <label
        className="grid gap-2 text-sm font-semibold"
        htmlFor="support-queue-reference"
      >
        Case reference
        <input
          id="support-queue-reference"
          name="reference"
          type="search"
          defaultValue={reference}
          maxLength={12}
          pattern="[Ss][Uu][Pp]-[a-fA-F0-9]{8}"
          placeholder="SUP-1234ABCD"
          autoComplete="off"
          className="min-h-11 w-full rounded-sis border border-sis-border bg-sis-surface px-3 text-base font-normal text-sis-text"
        />
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-sis bg-sis-brand px-5 font-semibold text-white transition-colors duration-150 hover:bg-sis-brand-strong motion-reduce:transition-none"
      >
        Apply filters
      </button>
    </form>
  );
}
