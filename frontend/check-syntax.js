import fs from 'fs';
import { parse } from 'acorn';

const code = fs.readFileSync('C:/Users/ragha/Desktop/Shinel_Studios_repo/website/frontend/src/components/AdminThumbnailsPage.jsx', 'utf8');

try {
    parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    console.log("Success: AdminThumbnailsPage.jsx parsed correctly with acorn.");
} catch (e) {
    console.error("Parse Error:", e.message);
    console.error("At line:", code.substring(0, e.pos).split('\n').length);
}
