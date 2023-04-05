import { Composite, Bodies, Events, Query } from 'matter-js';
import Creature from './Creature/Creature';
import Food from './Creature/Food';
import Drawer from './Drawer/Drawer';

export default class Updater {

    constructor(system) {
        Drawer.init(system);
        this.system = system;
        this.dimensions = [window.innerWidth, window.innerHeight];
        this.creatures = {};
        this.food = {};
        this.logging = false;
        this.init();
    }

    init() {
        const { engine } = this.system;
        const [w, h] = this.dimensions;
        const collisionFilter = {
            category: 0x001,
            group: 0,
            mask: 0x010,
        }
        Composite.add(engine.world, [
            Bodies.rectangle(w / 2, -25, w, 50, {isStatic: true, collisionFilter }),
            Bodies.rectangle(w / 2, h+25, w, 50, { isStatic: true, collisionFilter }),
            Bodies.rectangle(-25, h / 2, 50, h, { isStatic: true, collisionFilter }),
            Bodies.rectangle(w+25, h / 2, 50, h, { isStatic: true, collisionFilter }),
        ]);
        Events.on(this.system.mouseConstraint, 'mousedown', (data) => {
            Query.point(Object.values(this.creatures).map(c => c.body), data.mouse.position)
                .forEach(b => console.log(this.creatures[b.id]));
        });
    }
    
    tick() {
        const { runner } = this.system;
        const [w, h] = this.dimensions;
        if (
            runner.frameRequestId % Food.currentFramesPerFoodAdded(runner.frameRequestId) === 0
            && Object.values(this.food).length < Food.currentMaxFoodCount(runner.frameRequestId)
        ) {
            this.createFood(w * Math.random(), h * Math.random());
        }
        for (let i = 0; i < Object.values(this.creatures).length; i++) {
            const c = Object.values(this.creatures)[i];
            const collisions = Query.collides(c.body, Object.values(this.food).map(f => f.body));
            if (collisions.length > 0) {
                let food = [collisions[0].bodyA, collisions[0].bodyB].find(b => this.food[b.id]);
                this.deleteFood(food);
                c.hunger = Math.min(c.hunger + 0.5, 1);
                c.setMass(c.mass + 20);
                this.logging && console.log('nyomp');
            }
            c.takeTurn({
                ...this,
                createCreature: (...params) => this.createCreature(...params),
            });
            if (c.hunger <= 0) {
                this.deleteCreature(c);
                i -= 1;
                return;
            }
        }
        while (Object.values(this.creatures).length < 20 && runner.frameRequestId < 50_000) { 
            const c = this.createCreature();
            c.setMass(120);
        }
    }

    createCreature(params) {
        const creature = new Creature(params);
        this.creatures[creature.body.id] = creature;
        Composite.add(this.system.engine.world, creature.body);
        return creature;
    }

    deleteCreature(creature) {
        if (creature.laser) {
            Drawer.delete(creature.laser.laserBody);
        }
        delete this.creatures[creature.body.id];
        Composite.remove(this.system.engine.world, creature.body);
    }

    createFood(x, y) {
        const food = new Food(x, y);
        this.food[food.body.id] = food;
        Composite.add(this.system.engine.world, [food.body]);
        return food;
    }

    deleteFood(food) {
        delete this.food[food.id];
        Composite.remove(this.system.engine.world, food);
    }
}