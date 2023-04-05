import { Bodies, Body, Events, Vector } from 'matter-js'
import Drawer from '../Drawer/Drawer';
import Calc from '../Utils/Calc';
import Food from './Food';
import Genes from './Genes';

export default class Creature {

    static MAX_COUNT = 75;

    constructor({ parent = null } = {}) {
        this.parent = parent;
        this.generations = 1 + (this.parent?.generations ?? 1);
        this.mutations = this.parent?.generations ?? 0;
        this.direction = Math.random() * 2 * Math.PI;
        this.hunger = 1;
        this.mass = 100;
        this.traits = parent?.traits ?? {
            vision: 275,
            attackRange: 75,
            familyThreshold: 0.75,
            mutationRate: 0.75,
        };
        const [x, y] = ( parent
            ? [parent.body.position.x + 5, parent.body.position.y]
            : [window.innerWidth*Math.random(), window.innerHeight*Math.random()]
        );
        this.body = Bodies.circle(x, y, this.mass ** 0.5, {
            collisionFilter: {
                category: 0x010,
                group: 0,
                mask: 0x001,
            },
        });
        this.laser = null;
        this.id = this.body.id;
        this.genes = new Genes(this, parent);
        this.color = Calc.stringToHue(this.genes.geneticString);
        this.body.render.lineWidth = 5;
        this.delayUntilNextMove = 0;
        if (parent) {
            parent.setMass(parent.mass - this.mass);
        }
    }

    takeTurn(data) {
        if (this.laser) {
            if (this.laser.timer <= 0 || this.laser.enemy?.health <= 0) {
                Drawer.delete(this.laser.laserBody);
                this.laser = null;
            } else {
                this.laser.timer -= 1;
                this.laser.laserBody = Drawer.drawRectangle(this.body.position, this.laser.enemy.body.position, 2, this.laser.laserBody);
            }
        }
        this.genes.runGenes({ creature: this, ...data });
        this.hunger -= Food.starvationTickAmount(data.system.runner.frameRequestId) * this.mass;
        const saturation = 100 * this.hunger
        const lightness = 50 * this.hunger
        this.body.render.fillStyle = Drawer.percentageToHsl(0, this.color, 120, saturation, lightness);
        this.body.render.strokeStyle = Drawer.percentageToHsl(0, this.color, 120, 100, 50);
    }

    setMass(newMass) {
        const scale = newMass ** 0.5 / this.mass ** 0.5;
        this.mass = newMass;
        Body.scale(this.body, scale, scale, this.body.position);
    }

    getNearestBodyInRange(bodies, range) {
        const bodiesWithDistance = Object.values(bodies).map(body => {
            return ({
                distance: Vector.magnitude(Vector.sub(this.body.position, body.position)),
                body,
            })
        });
        return bodiesWithDistance.reduce((closest, curr) => {
            if (curr.distance < (closest?.distance ?? Number.MAX_VALUE) && curr.distance <= range) {
                return curr
            } else {
                return closest
            }
        }, null)?.body;
    }

    getNearestBodyInSight(bodies) {
        return this.getNearestBodyInRange(bodies, this.traits.vision);
    }

    getNearestBodyInAttackRange(bodies) {
        return this.getNearestBodyInRange(bodies, this.traits.attackRange);
    }

    isFamily(otherCreature) {
        const absDiff = Math.abs(this.color - otherCreature.color);
        const circularDistance = Math.min(absDiff, 360 - absDiff) / 360;
        return circularDistance <= 1 - this.traits.familyThreshold;
        // return this.genes.genomeSimilarity(otherCreature.genes) >= this.traits.familyThreshold;
    }
}