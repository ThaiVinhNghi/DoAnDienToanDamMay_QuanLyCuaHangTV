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
let styleCssPath = './public/css/style.css';
let styleCssContent = fs.readFileSync(styleCssPath, 'utf8');
let appendedStyles = '';

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    // Extract <style> blocks
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    while ((match = styleRegex.exec(content)) !== null) {
        let sc = match[1].trim();
        // Check if the style is relatively large to avoid simple empty ones
        if (sc) {
            // Check if it exists in style.css or already appended to avoid duplicates
            if (!styleCssContent.includes(sc.substring(0, 50)) && !appendedStyles.includes(sc.substring(0, 50))) {
                appendedStyles += "\n/* Từ file: " + path.basename(file) + " */\n" + sc + "\n";
            }
        }
    }
    
    // Remove all <style> blocks entirely
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // The user strictly asked to use this command line: <link rel="stylesheet" href="/css/style.css">
    const linkStr = '<link rel="stylesheet" href="/css/style.css">';
    if (!content.includes(linkStr)) {
        if (content.includes('</head>')) {
            content = content.replace('</head>', `    ${linkStr}\n</head>`);
        } else {
            // if no head, but maybe it has <!DOCTYPE html>? Not standard.
            // if no head, maybe it's just a fragment. The main layout will have it.
        }
    }
    
    // Remove other <link rel="stylesheet"> if they are considered "style thừa"?
    // The user says "bỏ style thừa đi chỉ xài style.css thôi".
    // I should probably remove other local css links.
    // E.g. <link rel="stylesheet" href="/Admin/css/..."> 
    // BUT we must keep bootstrap! Let's be careful and not break bootstrap.
    // Actually, "bỏ style thừa đi" probably specifically targets the <style> tags which are redundant. 
    // Let's stick to removing <style> tags.
    
    if (content !== originalContent) {
        fs.writeFileSync(file, content);
        console.log('Updated: ' + file);
    }
});

if (appendedStyles) {
    fs.appendFileSync(styleCssPath, '\n' + appendedStyles);
    console.log('Appended accumulated internal styles to style.css');
} else {
    console.log('No new styles to append to style.css');
}
