"use client";

/** Bespoke, not SimpleRepeaterEditor — Table's `rows` is a 2D grid (string[][]), a different shape than the flat item-array the shared repeater editor assumes. */
export function TableEditor({
  headers,
  rows,
  onChange,
}: {
  headers: string[];
  rows: string[][];
  onChange: (value: { headers: string[]; rows: string[][] }) => void;
}) {
  function setHeader(i: number, value: string) {
    const next = [...headers];
    next[i] = value;
    onChange({ headers: next, rows });
  }
  function addColumn() {
    onChange({ headers: [...headers, `Column ${headers.length + 1}`], rows: rows.map((r) => [...r, ""]) });
  }
  function removeColumn(i: number) {
    onChange({ headers: headers.filter((_, idx) => idx !== i), rows: rows.map((r) => r.filter((_, idx) => idx !== i)) });
  }
  function setCell(ri: number, ci: number, value: string) {
    const next = rows.map((r) => [...r]);
    next[ri][ci] = value;
    onChange({ headers, rows: next });
  }
  function addRow() {
    onChange({ headers, rows: [...rows, headers.map(() => "")] });
  }
  function removeRow(ri: number) {
    onChange({ headers, rows: rows.filter((_, idx) => idx !== ri) });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs text-zinc-400">Columns</label>
        <button type="button" onClick={addColumn} className="text-xs text-amber-400 hover:underline">
          + Add column
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {headers.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={h}
              onChange={(e) => setHeader(i, e.target.value)}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
            />
            <button type="button" onClick={() => removeColumn(i)} className="text-xs text-red-400 hover:underline">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mb-2 mt-4 flex items-center justify-between">
        <label className="text-xs text-zinc-400">Rows</label>
        <button type="button" onClick={addRow} className="text-xs text-amber-400 hover:underline">
          + Add row
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((row, ri) => (
          <div key={ri} className="rounded-lg border border-zinc-800 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-zinc-600">Row {ri + 1}</span>
              <button type="button" onClick={() => removeRow(ri)} className="text-xs text-red-400 hover:underline">
                Remove
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {headers.map((h, ci) => (
                <input
                  key={ci}
                  value={row[ci] ?? ""}
                  onChange={(e) => setCell(ri, ci, e.target.value)}
                  placeholder={h}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
