const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.ejs') || file.endsWith('.html')) results.push(file);
        }
    });
    return results;
}

const files = walk('./views');
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Exact style tags
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    while ((match = styleRegex.exec(content)) !== null) {
        console.log(`Found <style> in ${file}`);
        count++;
    }
});
console.log(`Total <style> blocks: ${count}`);
