import { Bodies } from 'matter-js'
import Genes from './Genes';

export default class Food {

    static MAX_FOOD = 30;
    static MAX_FOOD_EARLY = 75;

    static STARVATION_RATE = 0.000003;
    static STARVATION_RATE_EARLY = 0.000001;

    constructor(x, y) {
        const [w, h] = [window.innerWidth, window.innerHeight]
        this.body = Bodies.circle(x, y, 3, {
            collisionFilter: {
                category: 0x010,
                group: 0,
                mask: 0x001,
            },
            render: {
                fillStyle: 'green',
                strokeStyle: 'darkgreen',
                lineWidth: 0
           }
        });
        this.body.collisionFilter = {
            category: 0x010,
            group: 0,
            mask: 0x001,
        }
    }

    static currentMaxFoodCount(frame) {
        return (Food.MAX_FOOD_EARLY - Food.MAX_FOOD) / (frame / 250_000 + 1) + Food.MAX_FOOD;
    }

    static currentFramesPerFoodAdded(frame) {
        return frame < 1_000 ? 1 : 25;
    }

    static starvationTickAmount(frame) {
        return (Food.STARVATION_RATE_EARLY - Food.STARVATION_RATE) / (frame / 250_000 + 1) + Food.STARVATION_RATE;
    }
}