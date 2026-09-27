import fs from 'node:fs';
fs.mkdirSync('public/identity',{recursive:true});
const shapes={
 cutline:`<g fill="none" stroke="COLOR" stroke-width="8" stroke-linejoin="miter"><path d="M51 12H20L9 23V43L20 54H51V34H32"/><path d="M67 54L87 12H96L116 54M77 38H106"/><path d="M177 12H140L130 22V29L141 34H164L175 40V45L165 54H128"/></g><path d="M53 8L44 18H34L43 8Z" fill="ACCENT"/>`,
 aperture:`<g fill="none" stroke="COLOR" stroke-width="3"><path d="M57 15A25 25 0 1 0 57 51V34H35"/><path d="M49 23A14 14 0 1 0 49 44V41H35"/><path d="M65 8L5 59" stroke="ACCENT" stroke-width="2"/></g><g fill="none" stroke="COLOR" stroke-width="4"><path d="M100 24H86C74 24 74 46 86 46H100V35H89"/><path d="M111 46L120 24H126L135 46M115 38H131"/><path d="M170 24H152C142 24 142 34 152 35L163 36C174 37 173 46 162 46H143"/></g>`,
 editorial:`<text x="5" y="51" fill="COLOR" font-family="Georgia, 'Times New Roman', serif" font-size="62" letter-spacing="-6">GAS</text><path d="M133 54H178M156 10V36M143 23H169M147 14L165 32M165 14L147 32" stroke="ACCENT" stroke-width="2"/>`,
};
const icons={cutline:'<path d="M47 17H25L15 27V43L25 53H47V35H32" fill="none" stroke="#f0f0e9" stroke-width="7"/><path d="M49 12L39 23H30L40 12Z" fill="#d9b783"/>',aperture:'<g fill="none" stroke="#f0f0e9" stroke-width="3"><path d="M48 15A23 23 0 1 0 48 49V32H30"/><path d="M42 23A12 12 0 1 0 42 41V38H30"/></g><path d="M55 8L7 55" stroke="#d9b783" stroke-width="2"/>',editorial:'<text x="7" y="49" fill="#f0f0e9" font-family="Georgia,serif" font-size="48">G</text><path d="M48 9V27M39 18H57" stroke="#d9b783" stroke-width="2"/>'};
for(const [id,shape] of Object.entries(shapes)){
 for(const [theme,color,accent] of [['light','#202322','#8b632d'],['dark','#f0f0e9','#d9b783']]){
 fs.writeFileSync(`public/identity/${id}-${theme}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 188 66"><title>GAS / ${id}</title>${shape.replaceAll('COLOR',color).replaceAll('ACCENT',accent)}</svg>`);
 }
 fs.writeFileSync(`public/identity/${id}-icon.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="13" fill="#141716"/>${icons[id]}</svg>`);
}
fs.copyFileSync('public/identity/editorial-light.svg','public/gas-wordmark.svg');
fs.copyFileSync('public/identity/editorial-dark.svg','public/gas-wordmark-dark.svg');
fs.copyFileSync('public/identity/editorial-icon.svg','public/favicon.svg');
