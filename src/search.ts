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

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['name', 'slug', 'description', 'tags'], // fields to index for searching
      storeFields: ['id', 'name', 'slug', 'description', 'version', 'tags'], // fields to return with search results
      searchOptions: {
        boost: { name: 3, tags: 2, slug: 1.5, description: 1 },
        fuzzy: 0.4, // tolerates typo matching based on term length (e.g., edit distance 2 for 5-letter words)
        prefix: true // enables partial matches (e.g., "react" from "rea")
      }
    });
  }

  /**
   * Loads and indexes an array of skills into the search index.
   * @param skills Array of skill definitions
   */
  public indexSkills(skills: any[]): void {
    // MiniSearch requires an 'id' field on each document.
    // If a skill doesn't have an 'id', we use the slug as the id.
    const documents = skills.map((skill, index) => ({
      id: skill.id || skill.slug || `skill-${index}`,
      name: skill.name || '',
      slug: skill.slug || '',
      description: skill.description || '',
      tags: Array.isArray(skill.tags) ? skill.tags : [],
      version: skill.version || '1.0.0'
    }));

    this.miniSearch.removeAll();
    this.miniSearch.addAll(documents);
  }

  /**
   * Performs a search query against the indexed skills and returns ranked results.
   * @param query Search query text
   * @returns Formatted search results ranked by relevance
   */
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
