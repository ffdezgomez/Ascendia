// src/components/habits/HabitCreateModal.tsx
import React, { useState } from 'react';

type HabitCategory =
  | 'fitness'
  | 'study'
  | 'health'
  | 'personal'
  | 'work'
  | 'creativity'
  | 'spirituality'
  | 'home';
type HabitType =
  | 'hours'
  | 'count'
  | 'checkbox'
  | 'number'
  | 'km'
  | 'calories'
  | 'weight';

export interface HabitCreateFormValues {
  name: string;
  category: HabitCategory;
  type: HabitType;
}

interface HabitCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (values: HabitCreateFormValues) => void;
  submitting?: boolean;
  errorMessage?: string | null;
}

const CATEGORY_LABELS: Record<HabitCategory, string> = {
  fitness: 'Fitness',
  study: 'Estudio',
  health: 'Salud',
  personal: 'Personal',
  work: 'Trabajo',
  creativity: 'Creatividad',
  spirituality: 'Espiritualidad',
  home: 'Hogar',
};

export const HabitCreateModal: React.FC<HabitCreateModalProps> = ({
  open,
  onClose,
  onCreate,
  submitting = false,
  errorMessage = null,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('fitness');
  const [type, setType] = useState<HabitType>('hours');

  if (!open) return null;

  const handleSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    onCreate({
      name: name.trim(),
      category,
      type,
    });
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-32">
      {/* Backdrop con blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Ventana acrílica centrada */}
      <div className="relative z-50 w-full max-w-md max-h-[80vh] overflow-y-auto rounded-[26px] bg-zinc-900/85 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.60)] ring-1 ring-zinc-700/70 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <header className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">
              Crear hábito
            </h2>
            <p className="text-xs text-zinc-400">
              Define lo básico ahora. Después podrás ajustar todos los detalles.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800/80 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Nombre del hábito
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Por ejemplo, Leer 30 minutos"
              className="w-full rounded-2xl border border-zinc-700/70 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none"
              autoFocus
              required
            />
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Categoría
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_LABELS) as HabitCategory[]).map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition ${active
                      ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                      : 'bg-zinc-900 text-zinc-300 ring-1 ring-zinc-700 hover:bg-zinc-800'
                      }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tipo de seguimiento */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Tipo de seguimiento
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
              <button
                type="button"
                onClick={() => setType('hours')}
                className={`rounded-2xl border px-3 py-2 text-left ${type === 'hours'
                  ? 'border-zinc-200 bg-zinc-100 text-zinc-900'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  }`}
              >
                <span className="block font-medium">Horas</span>
                <span className="text-[11px] text-zinc-500">
                  Ideal para estudio, entrenamiento, sueño…
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('count')}
                className={`rounded-2xl border px-3 py-2 text-left ${type === 'count'
                  ? 'border-zinc-200 bg-zinc-100 text-zinc-900'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  }`}
              >
                <span className="block font-medium">Veces</span>
                <span className="text-[11px] text-zinc-500">
                  Número de repeticiones al día.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('checkbox')}
                className={`rounded-2xl border px-3 py-2 text-left ${type === 'checkbox'
                  ? 'border-zinc-200 bg-zinc-100 text-zinc-900'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  }`}
              >
                <span className="block font-medium">Completado</span>
                <span className="text-[11px] text-zinc-500">
                  Solo marcar hecho / no hecho.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('number')}
                className={`rounded-2xl border px-3 py-2 text-left ${type === 'number'
                  ? 'border-zinc-200 bg-zinc-100 text-zinc-900'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  }`}
              >
                <span className="block font-medium">Número libre</span>
                <span className="text-[11px] text-zinc-500">
                  Cualquier valor numérico (pasos, páginas…).
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('km')}
                className={`rounded-2xl border px-3 py-2 text-left ${type === 'km'
                  ? 'border-zinc-200 bg-zinc-100 text-zinc-900'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  }`}
              >
                <span className="block font-medium">Kilómetros</span>
                <span className="text-[11px] text-zinc-500">
                  Ideal para correr, andar, bici…
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('calories')}
                className={`rounded-2xl border px-3 py-2 text-left ${type === 'calories'
                  ? 'border-zinc-200 bg-zinc-100 text-zinc-900'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  }`}
              >
                <span className="block font-medium">Calorías</span>
                <span className="text-[11px] text-zinc-500">
                  Para quemar o ingerir kcal al día.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('weight')}
                className={`rounded-2xl border px-3 py-2 text-left ${type === 'weight'
                  ? 'border-zinc-200 bg-zinc-100 text-zinc-900'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  }`}
              >
                <span className="block font-medium">Peso</span>
                <span className="text-[11px] text-zinc-500">
                  Para registrar kg (peso corporal).
                </span>
              </button>
            </div>
          </div>

          {/* Error backend */}
          {errorMessage && (
            <p className="text-xs text-red-400">{errorMessage}</p>
          )}

          {/* Botones */}
          <div className="mt-4 flex justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-50 px-4 py-2 font-medium text-zinc-900 shadow-sm hover:bg-white disabled:opacity-60"
            >
              {submitting ? 'Creando…' : 'Crear hábito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};