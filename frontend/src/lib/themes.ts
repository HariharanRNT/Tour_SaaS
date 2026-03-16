export interface Theme {
    name: string;
    primary: string;
    primaryLight: string;
    primarySoft: string;
    gradientStart: string;
    gradientMid: string;
    gradientEnd: string;
    glow: string;
    preview: [string, string, string];
}

export const themes: Record<string, Theme> = {
    default: {
        name: "Default",
        primary: "#F97316",
        primaryLight: "#FDBA74",
        primarySoft: "#FED7AA",
        gradientStart: "#F97316",
        gradientMid: "#FDBA74",
        gradientEnd: "#FED7AA",
        glow: "rgba(249, 115, 22, 0.25)",
        preview: ["#F97316", "#FDBA74", "#FED7AA"]
    },
    orange: {
        name: "Orange",
        primary: "#F97316",
        primaryLight: "#FDBA74",
        primarySoft: "#FED7AA",
        gradientStart: "#F97316",
        gradientMid: "#FDBA74",
        gradientEnd: "#FED7AA",
        glow: "rgba(249, 115, 22, 0.25)",
        preview: ["#F97316", "#FDBA74", "#FED7AA"]
    },
    purple: {
        name: "Purple",
        primary: "#9333EA",
        primaryLight: "#C084FC",
        primarySoft: "#F3E8FF",
        gradientStart: "#9333EA",
        gradientMid: "#C084FC",
        gradientEnd: "#F3E8FF",
        glow: "rgba(147, 51, 234, 0.25)",
        preview: ["#9333EA", "#C084FC", "#F3E8FF"]
    },
    teal: {
        name: "Teal",
        primary: "#0D9488",
        primaryLight: "#5EEAD4",
        primarySoft: "#CCFBF1",
        gradientStart: "#0D9488",
        gradientMid: "#5EEAD4",
        gradientEnd: "#CCFBF1",
        glow: "rgba(13, 148, 136, 0.25)",
        preview: ["#0D9488", "#5EEAD4", "#CCFBF1"]
    },
    blue: {
        name: "Blue",
        primary: "#2563EB",
        primaryLight: "#93C5FD",
        primarySoft: "#DBEAFE",
        gradientStart: "#2563EB",
        gradientMid: "#93C5FD",
        gradientEnd: "#DBEAFE",
        glow: "rgba(37, 99, 235, 0.25)",
        preview: ["#2563EB", "#93C5FD", "#DBEAFE"]
    },
    rose: {
        name: "Rose",
        primary: "#E11D48",
        primaryLight: "#FB7185",
        primarySoft: "#FFE4E6",
        gradientStart: "#E11D48",
        gradientMid: "#FB7185",
        gradientEnd: "#FFE4E6",
        glow: "rgba(225, 29, 72, 0.25)",
        preview: ["#E11D48", "#FB7185", "#FFE4E6"]
    },
    amber: {
        name: "Amber",
        primary: "#D97706",
        primaryLight: "#FCD34D",
        primarySoft: "#FEF3C7",
        gradientStart: "#D97706",
        gradientMid: "#FCD34D",
        gradientEnd: "#FEF3C7",
        glow: "rgba(217, 119, 6, 0.25)",
        preview: ["#D97706", "#FCD34D", "#FEF3C7"]
    }
};
