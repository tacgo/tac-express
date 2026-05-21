const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(file)) {
        results = results.concat(walk(filePath));
      }
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = walk(process.cwd());

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replace = (search, repl) => {
    // using split and join to ensure all occurrences are replaced
    const parts = content.split(search);
    if (parts.length > 1) {
      content = parts.join(repl);
      changed = true;
    }
  };

  replace('@clerk/nextjs', '@supabase/ssr');
  replace('ClerkProvider', 'SupabaseProvider');
  replace('UserButton', 'UserMenu');
  replace('useUser', 'useAuth');
  replace('clerk_user_id', 'supabase_uid');
  replace('Clerk JWT', 'Supabase JWT');
  replace('auth() from clerk', 'auth() from supabase');
  replace('ZNG', 'TAC Orbital');
  replace('Zen/Neo-Glass', 'TAC Orbital');
  replace('Nordic Sharp', 'TAC Orbital');
  replace('VELOX Aurora', 'TAC Orbital');
  replace('Twelve Laws', 'Fourteen Laws');
  replace('Ten Laws', 'Fourteen Laws');
  replace('12 laws', '14 laws');
  replace('10 laws', '14 laws');

  if (file.includes('tac-debug') && content.includes('npx ')) {
    replace('npx ', 'pnpm dlx ');
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  }
}

for (const file of files) {
  fixFile(file);
}
