

export default class Calc {

    static randInt(a, b) {
        return Math.floor((b - a) * Math.random() + a);
    }

    static randRange(a, b) {
        return (b - a) * Math.random() + a;
    }

    static generateId() {
        return Math.random().toString(16).slice(2);
    }

    static stringToHue(str) {
        let vectors = [0, 0, 0];
        for (let i = 0; i < str.length - 1; i++) {
            const [charA, charB] = str.slice(i, i+2).split('');
            const [numA, numB] = [charA.charCodeAt(), charB.charCodeAt()];
            const vector = (numA + numB) % 3;
            vectors[vector] += 1;
        }
        const max = Math.max(...vectors);
        const [r, g, b] = vectors.map(v => v / max);

        let cmin = Math.min(r,g,b),
            cmax = Math.max(r,g,b),
            delta = cmax - cmin,
            h = 0;
        if (delta == 0) {
            h = 0;
        } else if (cmax === r) {
            h = ((g - b) / delta) % 6;
        } else if (cmax == g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }

        h = Math.round(h * 60);
            
        if (h < 0)
            h += 360;

        return h;
    }
}