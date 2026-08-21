import { SkillSearcher } from '../src/search';

describe('SkillSearcher Fuzzy & Relevance Search', () => {
  const mockSkills = [
    {
      name: "React Performance Tuner",
      slug: "react-perf-tuner",
      description: "An expert AI skill to profile and optimize heavy React rendering trees.",
      tags: ["react", "frontend", "optimization"],
      version: "1.0.0"
    },
    {
      name: "Terraform AWS Builder",
      slug: "terraform-aws-builder",
      description: "Automate and scaffold AWS infrastructure definitions using clean Terraform modules.",
      tags: ["terraform", "aws", "devops"],
      version: "1.2.1"
    },
    {
      name: "NodeJS Logger Engine",
      slug: "nodejs-logger-engine",
      description: "A fast structured logger for backend Express API services.",
      tags: ["nodejs", "backend", "logging"],
      version: "2.0.0"
    }
  ];

  let searcher: SkillSearcher;

  beforeEach(() => {
    searcher = new SkillSearcher();
    searcher.indexSkills(mockSkills);
  });

  it('should find items matching prefix query exactly', () => {
    const results = searcher.search('React');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toBe('react-perf-tuner');
  });

  it('should perform partial prefix search matches (e.g. "terra" matches "terraform")', () => {
    const results = searcher.search('terra');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toBe('terraform-aws-builder');
  });

  it('should tolerate typos using Levenshtein distance (fuzzy matching)', () => {
    // Typo: "raect" instead of "react"
    const results = searcher.search('raect');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toBe('react-perf-tuner');
  });

  it('should boost search ranks based on field weight configuration (name > tags > description)', () => {
    // Search keyword is in name of "Terraform AWS Builder", but in description of "React Performance Tuner" ("optimize").
    // If we search for "optimize", we expect the performance tuner to be first.
    const tunerResults = searcher.search('optimize');
    expect(tunerResults[0].slug).toBe('react-perf-tuner');

    // If we search for "aws", it matches tags/description. It should rank the Terraform builder first.
    const awsResults = searcher.search('aws');
    expect(awsResults[0].slug).toBe('terraform-aws-builder');
  });

  it('should return empty array for blank or whitespace query', () => {
    expect(searcher.search('')).toEqual([]);
    expect(searcher.search('   ')).toEqual([]);
  });
});
