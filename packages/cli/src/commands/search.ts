import path from 'path';
import chalk from 'chalk';
import https from 'https';
import { CommandContext } from '../core/factory';
import { SkillSearcher } from '../search';

async function fetchRemoteSkills(url: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            resolve(parsed.data || parsed || []);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

export async function handleSearch(ctx: CommandContext, query: string, options: any = {}) {
  const indexPath = path.join(__dirname, '..', '..', 'registry', 'index.json');
  const remoteUrl = process.env.AGENTPM_REGISTRY_URL || 'https://agentpm-api.workers.dev/api/skills';
  const limit = parseInt(options.limit) || 10;

  try {
    ctx.io.log(chalk.cyan(`🔎 Searching registry for: "${query}"${options.tag ? ` [tag: ${options.tag}]` : ''}...\n`));

    let results: any[] = [];
    let usedRemote = false;

    if (options.remote || !ctx.fs.existsSync(indexPath)) {
      try {
        ctx.io.log(chalk.gray(`🌐 Querying remote API (${remoteUrl})...`));
        const remoteData = await fetchRemoteSkills(`${remoteUrl}?q=${encodeURIComponent(query)}&limit=${limit}`);
        results = remoteData.map((item: any) => ({
          ...item,
          score: 1.0,
          slug: item.slug || item.name
        }));
        usedRemote = true;
      } catch (err) {
        if (options.remote) {
          throw new Error(`Remote query failed: ${(err as Error).message}`);
        }
        ctx.io.log(chalk.yellow(`⚠️ Remote query failed (${(err as Error).message}). Falling back to local index...`));
      }
    }

    if (!usedRemote) {
      if (!ctx.fs.existsSync(indexPath)) {
        ctx.io.log(chalk.yellow('⚠️ Local registry index not found. Try running with --remote or compile seeder script first.'));
        return;
      }

      const cachePath = path.join(path.dirname(indexPath), 'index.search.json');
      let forceRebuild = false;

      if (ctx.fs.existsSync(cachePath)) {
        const indexStat = ctx.fs.statSync(indexPath);
        const cacheStat = ctx.fs.statSync(cachePath);
        if (indexStat.mtime > cacheStat.mtime) {
          forceRebuild = true;
        }
      } else {
        forceRebuild = true;
      }
      
      let index: any[] = [];
      if (forceRebuild) {
        const raw = ctx.fs.readFileSync(indexPath, 'utf8');
        index = JSON.parse(raw);
      }
      
      const searcher = new SkillSearcher();
      searcher.loadOrBuildIndex(index, cachePath, forceRebuild, ctx.fs);
      results = searcher.search(query);
    }

    if (options.tag) {
      results = results.filter((r: any) => 
        r.tags?.some((t: string) => t.toLowerCase().includes(options.tag.toLowerCase()))
      );
    }

    const display = results.slice(0, limit);

    if (display.length === 0) {
      ctx.io.log(chalk.gray('No matching skills found in registry.'));
    } else {
      display.forEach((pkg: any) => {
        const trustColor = pkg.trust_score > 80 ? chalk.green : (pkg.trust_score > 60 ? chalk.yellow : chalk.red);
        const trustStr = pkg.trust_score ? trustColor(`[Trust: ${pkg.trust_score}]`) : '';
        const matchPercent = Math.min(Math.round((pkg.score || 1) * 10), 100);
        
        ctx.io.log(chalk.green(`📦 ${chalk.bold(pkg.name)} (v${pkg.version || '1.0.0'}) `) + chalk.gray(`[Relevance: ${matchPercent}%] `) + trustStr);
        ctx.io.log(chalk.gray(`   Slug: ${pkg.slug}`));
        if (pkg.tags && pkg.tags.length > 0) {
          ctx.io.log(chalk.blue(`   Tags: ${pkg.tags.join(', ')}`));
        }
        ctx.io.log(chalk.white(`   ${pkg.description || ''}`));
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
