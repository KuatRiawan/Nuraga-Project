const fs = require('fs');
const path = require('path');

const filesToFix = [
    'WorkPermitPage.jsx'
];

filesToFix.forEach(file => {
    const filePath = path.join(__dirname, 'src/pages', file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    // Add import if not exists
    if (!content.includes('createPortal')) {
        content = "import { createPortal } from 'react-dom';\n" + content;
    }

    // Replace z-50 with z-[9999] and z-[99] with z-[9999] in fixed inset-0
    content = content.replace(/className="fixed inset-[^"]*z-50[^"]*"/g, (match) => match.replace('z-50', 'z-[9999]'));
    content = content.replace(/className="fixed inset-[^"]*z-\[99\][^"]*"/g, (match) => match.replace('z-[99]', 'z-[9999]'));

    // Find all fixed inset-0 that are not already wrapped in createPortal
    let searchIndex = 0;
    while (true) {
        let idx = content.indexOf('className="fixed inset-0', searchIndex);
        if (idx === -1) break;

        let divStart = content.lastIndexOf('<div', idx);
        if (divStart === -1) {
            searchIndex = idx + 1;
            continue;
        }

        let checkPortal = content.lastIndexOf('createPortal(', divStart);
        let isWrapped = false;
        if (checkPortal !== -1) {
            let textBetween = content.substring(checkPortal, divStart);
            if (textBetween.trim() === 'createPortal(' || textBetween.trim() === 'return createPortal(' || textBetween.trim() === 'createPortal( ') {
                isWrapped = true;
            }
        }

        if (isWrapped) {
            searchIndex = idx + 1;
            continue;
        }

        let stack = 0;
        let endIdx = -1;
        let i = divStart;
        while (i < content.length) {
            if (content.substr(i, 4) === '<div') {
                stack++;
                i += 4;
            } else if (content.substr(i, 5) === '</div') {
                stack--;
                if (stack === 0) {
                    endIdx = i + 6;
                    break;
                }
                i += 5;
            } else {
                i++;
            }
        }

        if (endIdx !== -1) {
            let beforeDiv = content.substring(Math.max(0, divStart - 20), divStart);
            if (beforeDiv.includes('return (')) {
                let returnIdx = content.lastIndexOf('return (', divStart);
                content = content.substring(0, returnIdx) + 'return createPortal(' + content.substring(returnIdx + 8, endIdx) + ', document.body)' + content.substring(endIdx);
            } else {
                content = content.substring(0, divStart) + 'createPortal(' + content.substring(divStart, endIdx) + ', document.body)' + content.substring(endIdx);
            }
            searchIndex = endIdx; // Safely jump past the modified part
        } else {
            searchIndex = idx + 1; // Safely move forward
        }
    }

    fs.writeFileSync(filePath, content);
    console.log('Fixed', file);
});
