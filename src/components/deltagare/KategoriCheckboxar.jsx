import { parseBoolean, toSheetsBoolean } from '../../lib/utils.js';

const KATEGORIER = [
  { field: 'kategori_restaurang', label: 'Restaurang' },
  { field: 'kategori_stad',       label: 'Städ' },
  { field: 'kategori_truckkort',  label: 'Truckkort' },
  { field: 'kategori_nystartsjobb', label: 'Nystartsjobb' },
  { field: 'kategori_bkorkort',   label: 'B-körkort' },
];

export default function KategoriCheckboxar({ deltagare, onChange }) {
  function toggle(field) {
    const current = parseBoolean(deltagare[field]);
    onChange({ [field]: toSheetsBoolean(!current) });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {KATEGORIER.map(({ field, label }) => {
        const active = parseBoolean(deltagare[field]);
        return (
          <button
            key={field}
            onClick={() => toggle(field)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              active
                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                : 'bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent-primary)]'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
