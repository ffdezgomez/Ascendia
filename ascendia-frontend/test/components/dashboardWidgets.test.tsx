import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { MetricsWidget } from '../../src/components/dashboard/MetricsWidget';
import { FriendsWidget } from '../../src/components/dashboard/FriendsWidget';
import { HabitsWidget } from '../../src/components/dashboard/HabitsWidget';
import { ChallengesWidget } from '../../src/components/dashboard/ChallengesWidget';

describe('MetricsWidget', () => {
  it('shows stats values', () => {
    render(<MetricsWidget stats={{ activeHabits: 3, totalDaysCompleted: 2, totalHours: 5, bestStreak: 7 }} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});

describe('FriendsWidget', () => {
  it('shows empty state and link', () => {
    render(
      <MemoryRouter>
        <FriendsWidget friends={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Aún no tienes amigos/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Buscar amigos/i })).toHaveAttribute('href', '/friends');
  });

  it('lists friends when provided', () => {
    render(
      <MemoryRouter>
        <FriendsWidget friends={[{ id: '1', username: 'ana', avatar: '' }]} />
      </MemoryRouter>
    );

    expect(screen.getByText('ana')).toBeInTheDocument();
  });
});

describe('HabitsWidget', () => {
  const baseHabit = {
    id: 'h1',
    name: 'Leer',
    category: 'study',
    emoji: '📚',
    type: 'count',
    unit: 'veces',
    color: 'emerald',
    streak: 1,
    totalThisMonth: 4,
    completedToday: false,
  } as any;

  it('shows empty state when no habits', () => {
    render(<HabitsWidget habits={[]} onLog={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText(/No hay hábitos activos/i)).toBeInTheDocument();
  });

  it('triggers log and menu actions', () => {
    const onLog = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    render(<HabitsWidget habits={[baseHabit]} onLog={onLog} onEdit={onEdit} onDelete={onDelete} />);

    const [menuButton] = screen.getAllByRole('button');
    fireEvent.click(screen.getByRole('button', { name: /Registrar progreso/i }));
    expect(onLog).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1' }));

    fireEvent.click(menuButton);
    fireEvent.click(screen.getByText(/Editar/i));
    expect(onEdit).toHaveBeenCalled();

    fireEvent.click(menuButton);
    fireEvent.click(screen.getByText(/Eliminar/i));
    expect(onDelete).toHaveBeenCalledWith('h1');
  });
});

describe('ChallengesWidget', () => {
  it('shows empty state when no challenges', () => {
    render(<ChallengesWidget challenges={[]} />);

    expect(screen.getByText(/No hay retos activos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear reto/i })).toBeDisabled();
  });

  it('renders challenge info', () => {
    render(
      <ChallengesWidget
        challenges={[
          { id: 'c1', title: 'Reto 1', daysLeft: 5, participants: 3, opponentName: 'Eli', opponentAvatar: '' },
        ]}
      />
    );

    expect(screen.getByText('Reto 1')).toBeInTheDocument();
    expect(screen.getByText(/5 días/)).toBeInTheDocument();
    expect(screen.getByText(/Eli/)).toBeInTheDocument();
  });
});
