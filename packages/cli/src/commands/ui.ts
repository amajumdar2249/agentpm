import React from 'react';
import { render } from 'ink';
import { SearchUI } from '../ui/SearchUI';
import { CommandContext } from '../core/factory';

export async function handleUI(ctx: CommandContext, initialQuery?: string) {
  // Clear the screen for the TUI
  console.clear();
  
  // Render the Ink app
  const { waitUntilExit } = render(
    React.createElement(SearchUI, { 
      initialQuery: initialQuery || '',
      onExit: () => {
        // Optional cleanup
      }
    })
  );

  await waitUntilExit();
}
