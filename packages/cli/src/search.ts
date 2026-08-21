import MiniSearch from 'minisearch';

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  score: number;
  tags?: string[];
}

export class SkillSearcher {
  private miniSearch: MiniSearch;
  private static searchOptions = {
    fields: ['name', 'slug', 'description', 'tags'],
    storeFields: ['id', 'name', 'slug', 'description', 'version', 'tags'],
    searchOptions: {
      boost: { name: 3, tags: 2, slug: 1.5, description: 1 },
      fuzzy: 0.4,
      prefix: true
    }
  };

  constructor() {
    this.miniSearch = new MiniSearch(SkillSearcher.searchOptions);
  }

  /**
   * Loads search index. If cache exists and is fresh, loads it directly.
   * Otherwise, builds index from scratch and serializes to cache.
   */
  public loadOrBuildIndex(skills: any[], cachePath: string, forceRebuild: boolean, fsCtx: any): void {
    if (!forceRebuild && fsCtx.existsSync(cachePath)) {
      try {
        const serialized = fsCtx.readFileSync(cachePath, 'utf8');
        this.miniSearch = MiniSearch.loadJSON(serialized, SkillSearcher.searchOptions);
        return;
      } catch (err) {
        // Fallback to building if cache is corrupted
      }
    }

    // Build from scratch
    this.indexSkills(skills);

    // Write to cache
    try {
      const serialized = JSON.stringify(this.miniSearch.toJSON());
      fsCtx.writeFileSync(cachePath, serialized, 'utf8');
    } catch (err) {
      // Ignore cache write errors
    }
  }

  public indexSkills(skills: any[]): void {
    const seen = new Set<string>();
    const documents: any[] = [];

    skills.forEach((skill, index) => {
      const uniqueId = skill.id || skill.slug || `skill-${index}`;
      if (!seen.has(uniqueId)) {
        seen.add(uniqueId);
        documents.push({
          id: uniqueId,
          name: skill.name || '',
          slug: skill.slug || '',
          description: skill.description || '',
          tags: Array.isArray(skill.tags) ? skill.tags : [],
          version: skill.version || '1.0.0'
        });
      }
    });

    this.miniSearch.removeAll();
    this.miniSearch.addAll(documents);
  }

  public search(query: string): SearchResult[] {
    if (!query || query.trim() === '') {
      return [];
    }

    const results = this.miniSearch.search(query);
    return results.map(result => ({
      id: result.id as string,
      name: result.name as string,
      slug: result.slug as string,
      description: result.description as string,
      version: result.version as string,
      score: result.score,
      tags: result.tags as string[]
    }));
  }
}
