import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../open-world/src/content.json',import.meta.url),'utf8'));
test('open-world content has editable identity, journey and contact data',()=>{
 assert.ok(config.identity.name);
 assert.ok(config.intro.title);
 assert.equal(config.zones.length,6);
 assert.equal(config.services.length,3);
 assert.ok(config.skills.every(group=>group.items.length>=4));
 assert.ok(config.contact.links.some(link=>link.label==='GITHUB'));
 assert.ok(config.ui.skipLabel);
});
test('contact placeholders are explicit and not fabricated personal details',()=>{
 assert.match(config.contact.email,/^YOUR_EMAIL/);
 assert.match(config.contact.whatsapp,/YOUR_PHONE_NUMBER/);
 assert.match(config.contact.linkedin,/YOUR_HANDLE/);
});
