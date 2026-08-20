import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LeadScoreCard } from '@/components/chat/LeadScoreCard';

describe('Generative UI Tool Result Test', () => {
  // Test 6: Tool Call Render Test
  it('6. Tool Call Render: correctly maps and displays mock structured JSON data in the UI', () => {
    const mockToolResult = {
      score: 85,
      verdict: 'Hot Lead',
      analysis: [
        'High employee count with rapid growth',
        'Strong funding history',
      ],
      companyName: 'Gojek',
    };

    render(
      <LeadScoreCard
        score={mockToolResult.score}
        verdict={mockToolResult.verdict}
        analysis={mockToolResult.analysis}
        companyName={mockToolResult.companyName}
      />
    );

    // Verify Score is displayed
    expect(screen.getByText('85')).toBeInTheDocument();

    // Verify Verdict badge is displayed
    expect(screen.getByText('Hot Lead')).toBeInTheDocument();

    // Verify Company Name is displayed
    expect(screen.getByText('Gojek')).toBeInTheDocument();

    // Verify Analysis points are rendered
    expect(screen.getByText('High employee count with rapid growth')).toBeInTheDocument();
    expect(screen.getByText('Strong funding history')).toBeInTheDocument();
  });
});
