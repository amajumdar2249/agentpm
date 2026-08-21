import path from 'path';
import chalk from 'chalk';
import { CommandContext } from '../core/factory';
import { BrowserUtils } from '../utils/browser';

export async function handleRate(ctx: CommandContext, skillName: string) {
  const indexPath = path.join(__dirname, '..', '..', 'registry', 'index.json');
  if (!ctx.fs.existsSync(indexPath)) {
    ctx.io.log(chalk.yellow('⚠️ Local registry index not found. Run search or seed first to cache it.'));
    return;
  }

  try {
    const raw = ctx.fs.readFileSync(indexPath, 'utf8');
    const index = JSON.parse(raw);
    const pkg = index.find((item: any) => 
      item.slug.toLowerCase() === skillName.toLowerCase() || 
      item.name.toLowerCase() === skillName.toLowerCase()
    );

    if (!pkg) {
      ctx.io.log(chalk.red(`❌ Skill '${skillName}' not found in the registry.`));
      ctx.io.log(chalk.gray(`Please check the spelling or search using: ${chalk.bold('agentpm search <query>')}`));
      return;
    }

    ctx.io.log(chalk.cyan(`🚀 Opening GitHub Review portal for: ${chalk.bold(pkg.name)}...`));
    
    const title = `[Review] ${pkg.slug}`;
    const body = `## 🌌 Review for ${pkg.name} (${pkg.slug})

- **Rating:** 5/5 <!-- Please edit this: 1/5, 2/5, 3/5, 4/5, 5/5 -->
- **Reviewer:** @your-username

### ✍️ Review & Comments
(Write your detailed comments and feedback here...)
`;
    const url = `https://github.com/amajumdar2249/agentpm-registry/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

    await BrowserUtils.open(url);
    ctx.io.log(chalk.green('🌌 Browser window opened successfully!'));
    ctx.io.log(chalk.gray(`If the browser did not open, visit: \n  ${url}`));
  } catch (err) {
    ctx.io.error(chalk.red(`Failed to trigger review: ${(err as Error).message}`));
  }
}
