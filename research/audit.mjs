import fs from 'node:fs/promises';
const headers={'User-Agent':'GAS-portfolio-audit'};
const repos=await fetch('https://api.github.com/users/Atomstars/repos?per_page=100',{headers}).then(r=>r.json());
const results=await Promise.all(repos.map(async r=>{
 const base=`https://api.github.com/repos/Atomstars/${r.name}`;
 const tree=await fetch(`${base}/git/trees/${r.default_branch}?recursive=1`,{headers}).then(r=>r.json());
 const paths=(tree.tree||[]).filter(x=>x.type==='blob').map(x=>x.path);
 const selected=paths.filter(p=>/(^|\/)(readme\.md|package\.json|requirements\.txt|pyproject\.toml|pom\.xml)$/i.test(p)&&!/(node_modules|\.venv|vendor)/.test(p)).slice(0,14);
 const files=await Promise.all(selected.map(async p=>({path:p,text:await fetch(`https://raw.githubusercontent.com/Atomstars/${r.name}/${r.default_branch}/${p}`).then(r=>r.text())})));
 return {name:r.name,url:r.html_url,homepage:r.homepage,branch:r.default_branch,sha:tree.sha,paths,files};
}));
await fs.writeFile('research/github-audit.json',JSON.stringify({reviewed:'2026-09-26',repos:results},null,2));
for(const r of results){console.log('\nREPO '+r.name+' FILES '+r.paths.length);for(const f of r.files)console.log(f.path+'\n'+f.text.slice(0,10000));}
