import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import crypto from 'crypto';
import { CommandContext } from '../core/factory';
import { SkillLinter } from '../linter';

interface YAMLMeta {
  id?: string;
  name?: string;
  description?: string;
  author?: string;
  version?: string;
  license?: string;
  category?: string;
  tags?: string;
  difficulty_level?: string;
  maturity_level?: string;
}

export async function handlePublish(ctx: CommandContext, skillDirArg?: string) {
  const targetDir = skillDirArg ? path.resolve(ctx.process.cwd(), skillDirArg) : ctx.process.cwd();
  const skillMdPath = path.join(targetDir, 'SKILL.md');

  ctx.io.log(chalk.blue(`🚀 Publishing AI Skill Playbook from: ${chalk.bold(skillMdPath)}\n`));

  if (!ctx.fs.existsSync(skillMdPath)) {
    ctx.io.error(chalk.red(`❌ SKILL.md file not found in: ${targetDir}`));
    ctx.process.exit(1);
  }

  const parseSpinner = ora('Parsing SKILL.md frontmatter and content...').start();
  let rawContent: string;
  try {
    rawContent = ctx.fs.readFileSync(skillMdPath, 'utf8');
  } catch (err) {
    parseSpinner.fail(chalk.red(`Failed to read file: ${(err as Error).message}`));
    ctx.process.exit(1);
  }

  // Parse frontmatter
  const lines = rawContent.split('\n');
  const meta: YAMLMeta = {};
  let content = rawContent;

  if (lines.length > 0 && lines[0].trim() === '---') {
    const fmLines: string[] = [];
    let idx = 1;
    while (idx < lines.length && lines[idx].trim() !== '---') {
      fmLines.push(lines[idx]);
      idx += 1;
    }
    
    // Extract metadata
    for (const fmLine of fmLines) {
      if (fmLine.includes(':')) {
        const parts = fmLine.split(':', 2);
        if (parts.length === 2) {
          const key = parts[0].trim();
          const val = parts[1].trim().replace(/^['"]|['"]$/g, '');
          (meta as any)[key] = val;
        }
      }
    }
    content = lines.slice(idx + 1).join('\n');
  }

  const name = meta.name || path.basename(targetDir);
  const baseSlug = name.toLowerCase().replace(/[@\/]/g, '').replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const slug = meta.id ? baseSlug : baseSlug; // default slug mapping

  const nowStr = new Date().toISOString();
  
  // Construct standard Skill Schema object
  const packageData = {
    id: meta.id || crypto.randomUUID(),
    name: name,
    slug: slug,
    description: meta.description || 'AI agent skill playbook',
    content: content.trim(),
    author: meta.author || 'agentpm-user',
    version: meta.version || '1.0.0',
    created_at: nowStr,
    updated_at: nowStr,
    license: meta.license || 'MIT',
    category: meta.category || 'automation',
    tags: meta.tags ? meta.tags.split(',').map(t => t.trim()).filter(Boolean) : ['agent'],
    difficulty_level: meta.difficulty_level || 'intermediate',
    maturity_level: meta.maturity_level || 'stable',
    compatibility: {
      engines: ['generic']
    },
    dependencies: {},
    examples: {
      success_cases: [],
      failure_cases: [],
      edge_cases: [],
      best_practices: []
    },
    ratings: {
      average_rating: 0,
      total_ratings: 0,
      review_count: 0,
      quality_score: 80,
      trust_score: 100
    },
    analytics: {
      downloads: 0,
      installs: 0,
      executions: 0,
      active_users: 0
    },
    signature: null as any
  };

  parseSpinner.succeed('SKILL.md parsed and compiled successfully.');

  const signSpinner = ora('Cryptographically signing skill content...').start();
  let signatureBundle: any = null;
  try {
    const { sign } = require('sigstore');
    const buffer = Buffer.from(content.trim(), 'utf8');
    signatureBundle = await sign(buffer);
    signSpinner.succeed(chalk.green('Skill signed successfully via Sigstore!'));
  } catch (err: any) {
    signSpinner.fail(chalk.red(`Failed to sign skill: ${err.message}`));
    ctx.io.log(chalk.yellow('Note: Sigstore requires authentication to issue a short-lived certificate.'));
    // We proceed without signature if it fails, or we could exit. Let's proceed for now.
  }

  packageData.signature = signatureBundle;

  // Validate skill structure against schema
  const validateSpinner = ora('Validating compiled skill package against schema...').start();
  const lintResult = SkillLinter.validate(packageData);
  
  if (!lintResult.isValid) {
    validateSpinner.fail(chalk.red('Validation FAILED! The generated metadata does not match schema requirements.'));
    lintResult.errors.forEach(err => ctx.io.log(chalk.red(`   - ${err}`)));
    ctx.process.exit(1);
  }
  validateSpinner.succeed(chalk.green('Validation PASSED: Skill conforms to Neural Registry standards.'));

  // Save to local registry repository
  const registryDir = path.resolve(__dirname, '..', '..', 'registry');
  const packagesDir = path.join(registryDir, 'packages');
  const indexPath = path.join(registryDir, 'index.json');

  if (!ctx.fs.existsSync(registryDir) || !ctx.fs.existsSync(packagesDir) || !ctx.fs.existsSync(indexPath)) {
    ctx.io.error(chalk.red(`❌ Local registry checkout not found at: ${registryDir}`));
    ctx.io.error(chalk.red('Please ensure you are running publish inside a clone of the agentpm workspace.'));
    ctx.process.exit(1);
  }

  const saveSpinner = ora('Writing package definition and updating index...').start();
  try {
    // Write package json
    const packageFilePath = path.join(packagesDir, `${slug}.json`);
    ctx.fs.writeFileSync(packageFilePath, JSON.stringify(packageData, null, 2), 'utf8');

    // Read and update index
    const indexContent = ctx.fs.readFileSync(indexPath, 'utf8');
    const indexData = JSON.parse(indexContent);
    
    // Remove old index entry if exists (slug match)
    const filteredIndex = indexData.filter((item: any) => item.slug !== slug);
    
    // Append new index entry
    filteredIndex.push({
      name: packageData.name,
      slug: packageData.slug,
      description: packageData.description,
      version: packageData.version,
      tags: packageData.tags,
      ratings: packageData.ratings
    });

    ctx.fs.writeFileSync(indexPath, JSON.stringify(filteredIndex, null, 2), 'utf8');
    saveSpinner.succeed(`Skill metadata saved locally to registry packages!`);
    ctx.io.log(chalk.gray(`  Written: registry/packages/${slug}.json`));
    ctx.io.log(chalk.gray(`  Updated: registry/index.json`));
  } catch (err) {
    saveSpinner.fail(chalk.red(`Failed to save package metadata: ${(err as Error).message}`));
    ctx.process.exit(1);
  }

  ctx.io.log(chalk.green(`\n🌌 Skill '${name}' is ready to be published!`));
  ctx.io.log(chalk.cyan(`\nTo deploy to the global network, run: `));
  ctx.io.log(chalk.white(`  cd registry`));
  ctx.io.log(chalk.white(`  git add .`));
  ctx.io.log(chalk.white(`  git commit -m "feat: publish ${slug} skill version ${packageData.version}"`));
  ctx.io.log(chalk.white(`  git push`));
}
