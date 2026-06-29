import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { SkillSearcher } from '../search';
import { SkillInstaller } from '../installer';

interface SearchUIProps {
  initialQuery?: string;
  onExit: () => void;
}

export function SearchUI({ initialQuery = '', onExit }: SearchUIProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<string | null>(null);
  const [searcher, setSearcher] = useState<SkillSearcher | null>(null);
  const { exit } = useApp();

  useEffect(() => {
    // Initialize searcher
    try {
      const fs = require('fs');
      const path = require('path');
      const indexPath = path.join(process.cwd(), 'registry', 'index.json');
      const cachePath = path.join(process.cwd(), 'registry', 'index.search.json');
      
      const instance = new SkillSearcher();
      if (fs.existsSync(indexPath)) {
        instance.loadOrBuildIndex([], cachePath, false, fs);
      }
      setSearcher(instance);
    } catch (e) {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (query.length > 2 && searcher) {
      const res = searcher.search(query).slice(0, 10);
      setResults(res);
      setSelectedIndex(0);
    } else {
      setResults([]);
    }
  }, [query, searcher]);

  useInput((input: string, key: any) => {
    if (installing || installResult) {
      if (key.return || key.escape || input === 'q') {
        onExit();
        exit();
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(Math.min(results.length - 1, selectedIndex + 1));
    }
    if (key.return && results.length > 0) {
      handleInstall(results[selectedIndex].id);
    }
    if (key.escape || (key.ctrl && input === 'c')) {
      onExit();
      exit();
    }
  });

  const handleInstall = async (skillName: string) => {
    setInstalling(true);
    try {
      // Very basic integration for now, relying on the static installer
      const { content, version } = await SkillInstaller.fetchRemoteSkill(skillName);
      SkillInstaller.saveSkillLocal(skillName, content, version);
      setInstallResult(`✅ Successfully installed ${skillName}@${version}`);
    } catch (e: any) {
      setInstallResult(`❌ Failed to install ${skillName}: ${e.message}`);
    } finally {
      setInstalling(false);
    }
  };

  if (installResult) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>{installResult}</Text>
        <Box marginTop={1}>
          <Text color="gray">Press Enter to exit</Text>
        </Box>
      </Box>
    );
  }

  if (installing) {
    return (
      <Box padding={1}>
        <Text color="cyan">⏳ Installing {results[selectedIndex]?.id}...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text color="cyan">🔍 Search Skills: </Text>
        <TextInput value={query} onChange={setQuery} placeholder="e.g., react-expert" />
      </Box>
      
      {results.length > 0 ? (
        <Box flexDirection="column">
          {results.map((r, i) => (
            <Box key={r.id} paddingLeft={2}>
              <Text color={i === selectedIndex ? 'green' : 'white'}>
                {i === selectedIndex ? '❯ ' : '  '}
                {r.id} {r.trust_score >= 80 ? '🏅' : ''}
              </Text>
              <Box marginLeft={2}>
                <Text color="gray">{r.description.slice(0, 50)}...</Text>
              </Box>
            </Box>
          ))}
          <Box marginTop={1} paddingLeft={2}>
            <Text color="gray">↑/↓: Navigate | Enter: Install | Esc: Quit</Text>
          </Box>
        </Box>
      ) : (
        <Box paddingLeft={2}>
          <Text color="gray">{query.length > 2 ? 'No results found' : 'Type at least 3 characters...'}</Text>
        </Box>
      )}
    </Box>
  );
}
