import path from 'path';
import chalk from 'chalk';
import { CommandContext } from '../core/factory';
import { SkillSearcher } from '../search';

export function handleSearch(ctx: CommandContext, query: string) {
  const indexPath = path.join(__dirname, '..', '..', 'registry', 'index.json');
  if (!ctx.fs.existsSync(indexPath)) {
    ctx.io.log(chalk.yellow('⚠️ Local registry index not found. Try compiling the seeder script first.'));
    return;
  }

  try {
    ctx.io.log(chalk.cyan(`🔎 Searching registry for: "${query}"...\n`));

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
    const results = searcher.search(query);

    if (results.length === 0) {
      ctx.io.log(chalk.gray('No matching skills found in registry.'));
    } else {
      results.slice(0, 10).forEach((pkg: any) => {
        const matchPercent = Math.min(Math.round(pkg.score * 10), 100);
        ctx.io.log(chalk.green(`📦 ${chalk.bold(pkg.name)} (v${pkg.version}) `) + chalk.gray(`[Relevance: ${matchPercent}%]`));
        ctx.io.log(chalk.gray(`   Slug: ${pkg.slug}`));
        if (pkg.tags && pkg.tags.length > 0) {
          ctx.io.log(chalk.blue(`   Tags: ${pkg.tags.join(', ')}`));
        }
        ctx.io.log(chalk.white(`   ${pkg.description}`));
        ctx.io.log();
      });
      if (results.length > 10) {
        ctx.io.log(chalk.blue(`...and ${results.length - 10} more matches. Narrow down your search!`));
      }
    }
  } catch (err) {
    ctx.io.error(chalk.red(`Failed to search: ${(err as Error).message}`));
  }
}
