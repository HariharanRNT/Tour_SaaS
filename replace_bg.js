const fs = require('fs');
const path = require('path');

const walkSync = function (dir, filelist) {
    const files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist);
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                filelist.push(path.join(dir, file));
            }
        }
    });
    return filelist;
};

const appDir = path.join(__dirname, 'frontend/src/app');
const targetDirs = [
    path.join(appDir, 'admin'),
    path.join(appDir, 'agent'),
    path.join(appDir, 'plan-trip'),
    path.join(appDir, 'saved-trips'),
    path.join(appDir, 'checkout'),
    path.join(appDir, 'bookings'),
    path.join(appDir, 'packages')
];

let files = [];
targetDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        files = files.concat(walkSync(dir));
    }
});

let modifiedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/bg-gray-50\/80/g, 'bg-white/10');
    content = content.replace(/bg-gray-50\/50/g, 'bg-white/5');
    content = content.replace(/bg-gray-50\/30/g, 'bg-white/5');
    content = content.replace(/bg-gray-50\/20/g, 'bg-white/5');
    content = content.replace(/bg-gray-50/g, 'bg-transparent');

    content = content.replace(/bg-slate-50\/50/g, 'bg-white/5');
    content = content.replace(/bg-slate-50/g, 'bg-transparent');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedFiles++;
        console.log(`Updated ${file}`);
    }
});

console.log(`Complete. Modified ${modifiedFiles} files.`);
