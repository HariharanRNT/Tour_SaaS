const fs = require('fs');

const path = 'd:\\Hariharan\\G-Project\\RNT_Tour\\frontend\\src\\components\\admin\\ItineraryBuilder.tsx';
let content = fs.readFileSync(path, 'utf8');

// The pattern looks like:
// selectedTimeSlot ? `bg-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-50` : "bg-emerald-50"
// We want to replace this whole block with "bg-[var(--primary)]" or a similarly constructed stable class.
// We can use a regex that matches: selectedTimeSlot \? `[^`]*?timeSlotConfig[^`]*?` : "[^"]*?"

// Specifically for different prefixes:
content = content.replace(/selectedTimeSlot \? `text-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-(\d+)(?:\/\d+)?` : "text-emerald-\d+(?:\/\d+)?"/g, (match, strength) => {
    return `"text-[var(--primary)]"`;
});

content = content.replace(/selectedTimeSlot \? `bg-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-(\d+)(?:\/\d+)?` : "bg-emerald-\d+(?:\/\d+)?"/g, (match, strength) => {
    return `"bg-[var(--primary)]"`;
});

content = content.replace(/selectedTimeSlot \? `border-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-(\d+)(?:\/\d+)?` : "border-emerald-\d+(?:\/\d+)?"/g, (match, strength) => {
    return `"border-[var(--primary)]"`;
});

content = content.replace(/selectedTimeSlot \? `focus:border-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-(\d+)(?:\/\d+)?` : "focus:border-emerald-\d+(?:\/\d+)?"/g, (match, strength) => {
    return `"focus:border-[var(--primary)]"`;
});

content = content.replace(/selectedTimeSlot \? `focus-within:border-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-(\d+)(?:\/\d+)?` : "focus-within:border-emerald-\d+(?:\/\d+)?"/g, (match, strength) => {
    return `"focus-within:border-[var(--primary)]"`;
});

content = content.replace(/selectedTimeSlot \? `focus-within:ring-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-(\d+)(?:\/\d+)?` : "focus-within:ring-emerald-\d+(?:\/\d+)?"/g, (match, strength) => {
    return `"focus-within:ring-[var(--primary)]"`;
});

content = content.replace(/selectedTimeSlot \? `shadow-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-(\d+)(?:\/\d+)?` : "shadow-emerald-\d+(?:\/\d+)?"/g, (match, strength) => {
    return `"shadow-sm shadow-[var(--primary)]/20"`; // shadow doesn't map perfectly in arbitrary values
});

content = content.replace(/selectedTimeSlot \? `placeholder:text-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-(\d+)(?:\/\d+)?` : "placeholder:text-emerald-\d+(?:\/\d+)?"/g, (match, strength) => {
    return `"placeholder:text-[var(--primary)]/50"`;
});

content = content.replace(/selectedTimeSlot \? `bg-gradient-to-r from-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-500 to-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-600 text-white shadow-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-500\/30 hover:shadow-\$\{timeSlotConfig\[selectedTimeSlot as keyof typeof timeSlotConfig\]\.theme\}-500\/40` : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-emerald-500\/30 hover:shadow-emerald-500\/40"/g, () => {
    return `"bg-[var(--primary)] text-white shadow-[0_4px_14px_0_var(--primary)]/30 hover:shadow-[0_6px_20px_0_var(--primary)]/40"`;
});

// Any remaining complex ones like:
// selectedTimeSlot ? `bg-${timeSlotConfig...theme}-500/10 group-focus-within/time:bg-${timeSlotConfig...theme}-500 group-focus-within/time:text-white text-${timeSlotConfig...theme}-600` : "bg-emerald-500/10 group-focus-within/time:bg-emerald-500 group-focus-within/time:text-white text-emerald-600"
content = content.replace(/selectedTimeSlot \? `[^`]*` : "[^"]*"/g, (match) => {
    if (match.includes("group-focus-within")) {
        return `"bg-[var(--primary)]/10 group-focus-within/time:bg-[var(--primary)] group-focus-within/time:text-white text-[var(--primary)]"`;
    }
    if (match.includes("bg-gradient-to-br")) {
        return `"bg-[var(--primary)] shadow-[var(--primary)]/30"`;
    }
    if (match.includes("group-hover/adv")) {
        return `"bg-[var(--primary)]/10 text-[var(--primary)] group-hover/adv:text-[var(--primary)]"`;
    }
    if (match.includes("hover:bg-gradient-to-r")) {
         return `"bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white hover:border-transparent"`;
    }
    if (match.includes("selectedTimeSlot ? `bg-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-500 text-white shadow-[0_8px_20px_rgba(0,0,0,0.1)]` : \"bg-emerald-500 text-white shadow-[0_8px_20px_rgba(42,157,143,0.3)]\"")) {
         return `"bg-[var(--primary)] text-white shadow-[0_8px_20px_var(--primary)]"`;
    }
    if (match.includes("bg${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-50 border-${timeSlotConfig[selectedTimeSlot as keyof typeof timeSlotConfig].theme}-100")) {
        return `"bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]"`; 
    }
    // Handle others generically if missed
    return `"text-[var(--primary)]"`;
});


fs.writeFileSync(path, content, 'utf8');
console.log("Replacements complete.");
