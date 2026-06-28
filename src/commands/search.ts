import path from 'path';
import chalk from 'chalk';
import { CommandContext } from '../core/factory';
import { SkillSearcher } from '../search';

export function handleSearch(ctx: CommandContext, query: string, options: any = {}) {
  const indexPath = path.join(__dirname, '..', '..', 'registry', 'index.json');
  if (!ctx.fs.existsSync(indexPath)) {
    ctx.io.log(chalk.yellow('⚠️ Local registry index not found. Try compiling the seeder script first.'));
    return;
  }

  try {
    ctx.io.log(chalk.cyan(`🔎 Searching registry for: "${query}"${options.tag ? ` [tag: ${options.tag}]` : ''}...\n`));

    const cachePath = path.join(path.dirname(indexPath), 'index.search.json');
    let forceRebuild = false;

    if (ctx.fs.existsSync(cachePath)) {
      const indexStat = ctx.fs.statSync(indexPath);
      const cacheStat = ctx.fs.statSync(cachePath);
      // Rebuild if index.json is newer than compiled index
      if (indexStat.mtime > cacheStat.mtime) {
        forceRebuild = true;
      }
    } else {
      forceRebuild = true;
    }
    
    // Defer reading/parsing of the raw 23MB index.json to only when rebuilding the cache
    let index: any[] = [];
    if (forceRebuild) {
      const raw = ctx.fs.readFileSync(indexPath, 'utf8');
      index = JSON.parse(raw);
    }
    
    const searcher = new SkillSearcher();
    searcher.loadOrBuildIndex(index, cachePath, forceRebuild, ctx.fs);
    let results = searcher.search(query);

    // Apply tag filter
    if (options.tag) {
      results = results.filter((r: any) => 
        r.tags?.some((t: string) => t.toLowerCase().includes(options.tag.toLowerCase()))
      );
    }

    const limit = parseInt(options.limit) || 10;
    const display = results.slice(0, limit);

    if (display.length === 0) {
      ctx.io.log(chalk.gray('No matching skills found in registry.'));
    } else {
      display.forEach((pkg: any) => {
        const trustColor = pkg.trust_score > 80 ? chalk.green : (pkg.trust_score > 60 ? chalk.yellow : chalk.red);
        const trustStr = pkg.trust_score ? trustColor(`[Trust: ${pkg.trust_score}]`) : '';
        const matchPercent = Math.min(Math.round(pkg.score * 10), 100);
        
        ctx.io.log(chalk.green(`📦 ${chalk.bold(pkg.name)} (v${pkg.version || '1.0.0'}) `) + chalk.gray(`[Relevance: ${matchPercent}%] `) + trustStr);
        ctx.io.log(chalk.gray(`   Slug: ${pkg.slug}`));
        if (pkg.tags && pkg.tags.length > 0) {
          ctx.io.log(chalk.blue(`   Tags: ${pkg.tags.join(', ')}`));
        }
        ctx.io.log(chalk.white(`   ${pkg.description}`));
        ctx.io.log();
      });
      if (results.length > limit) {
        ctx.io.log(chalk.blue(`...and ${results.length - limit} more matches. Narrow down your search or increase --limit!`));
      }
    }
  } catch (err) {
    ctx.io.error(chalk.red(`Failed to search: ${(err as Error).message}`));
  }
}
