import { Composite, Bodies, Body, Vector } from 'matter-js';

export default class Drawer {

    static init(system) {
        this.system = system;
    }

    static delete(body) {
        Composite.remove(this.system.engine.world, body);
    }

    static drawRectangle(p1, p2, width, oldRect) {
        if (oldRect) {
            Drawer.delete(oldRect);
        }
        const rect = Bodies.rectangle(
            p1.x + (p2.x - p1.x) / 2,
            p1.y + (p2.y - p1.y) / 2,
            Vector.magnitude(Vector.sub(p2, p1)),
            width,
            {
                isStatic: true,
                collisionFilter: {
                    category: 0x100,
                    group: 0x000,
                    mask: 0x000,
                },
                render: {
                    fillStyle: '#cc4444',
                    strokeStyle: '#00ff00',
                    lineWidth: 0
                },
            }
        );
        Body.rotate(rect, Vector.angle(p2, p1));
        Composite.add(this.system.engine.world, rect);
        return rect;
    }

    static move(body, delta, options) {
        if (options?.absolute) {
            Body.setPosition(body, delta);
        } else {
            Body.setPosition(body, Vector.add(body.position, delta));
        }
    }

    static percentageToHsl(percentage, hue0, hue1, saturation=100, lightness=50) {
        var hue = (percentage * (hue1 - hue0)) + hue0;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
}