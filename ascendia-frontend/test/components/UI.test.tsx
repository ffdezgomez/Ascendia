import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InputField, IconSpinner, IconCheck, Toast, ErrorPanel } from '../../src/components/UI';

describe('UI Components', () => {
  describe('InputField', () => {
    it('should render with label', () => {
      render(<InputField label="Username" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should display error message', () => {
      render(<InputField label="Email" error="Invalid email" />);
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
    });

    it('should display hint message', () => {
      render(<InputField label="Password" hint="Must be at least 8 characters" />);
      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<InputField label="Test" className="custom-class" />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('custom-class');
    });
  });

  describe('IconSpinner', () => {
    it('should render spinner icon', () => {
      const { container } = render(<IconSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('animate-spin');
    });

    it('should apply custom className', () => {
      const { container } = render(<IconSpinner className="custom-spinner" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('custom-spinner');
    });
  });

  describe('IconCheck', () => {
    it('should render check icon', () => {
      const { container } = render(<IconCheck />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<IconCheck className="custom-check" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('custom-check');
    });
  });

  describe('Toast', () => {
    it('should render when show is true', () => {
      render(<Toast show={true}>Success message</Toast>);
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('should not render when show is false', () => {
      render(<Toast show={false}>Success message</Toast>);
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  describe('ErrorPanel', () => {
    it('should render error message', () => {
      render(<ErrorPanel message="Something went wrong" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render retry button when onRetry is provided', () => {
      const handleRetry = jest.fn();
      render(<ErrorPanel message="Network error" onRetry={handleRetry} />);
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });

    it('should not render retry button when onRetry is not provided', () => {
      render(<ErrorPanel message="Network error" />);
      expect(screen.queryByText('Reintentar')).not.toBeInTheDocument();
    });
  });
});
