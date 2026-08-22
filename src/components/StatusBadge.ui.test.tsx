import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the uppercased status label', () => {
    const { getByText } = render(<StatusBadge status="BOARDED" />);
    expect(getByText('BOARDED')).toBeTruthy();
  });

  it('renders a custom label when provided', () => {
    const { getByText } = render(<StatusBadge status="NO_SHOW" label="No show" />);
    expect(getByText('NO SHOW')).toBeTruthy();
  });
});
