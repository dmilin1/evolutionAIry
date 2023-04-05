import { Body, Vector } from 'matter-js'
import StringSimilarity from 'string-similarity';
import Drawer from '../Drawer/Drawer';
import Calc from '../Utils/Calc';
import Creature from './Creature';

export default class Genes {

    static MAX_LENGTH = 60;
    static MIN_LENGTH = 15;
    static DEFAULT_LENGTH = 20;
    static GENE_SIMILARITY_CACHE = { count: 0 };

    constructor(creature, parent) {
        this.creature = creature
        this.length = this.parent?.length ?? Genes.DEFAULT_LENGTH;
        this.dna = parent ? this.evolveGenes(parent) : [...Array(this.length)].map(_ =>
            this.buildGene(undefined, true)
        );
        this.length = this.dna.length;
        // this.dna = [
        //     this.buildGene(0),
        //     this.buildGene(3),
        // ];
        this.geneticString = this.dna.reduce((t, cur) => t += cur.codeAsStr, '');
        this.currentStep = 0;
        this.forceNextIndex = null;
    }

    runGenes(args) {
        const { creature } = args;
        if (creature.delayUntilNextMove > 0) {
            creature.delayUntilNextMove -= 1;
            return;
        }
        let geneData = {
            operations: 0,
        }
        while (creature.delayUntilNextMove === 0 && geneData.operations < 50) {
            geneData.operations += 1;
            if (this.currentStep >= this.dna.length) {
                this.currentStep = 0;
            }
            let nextGene = this.dna[this.currentStep];
            creature.delayUntilNextMove = nextGene.time;
            nextGene?.run({ ...geneData, ...args, memory: nextGene.memory });
            if (this.forceNextIndex != null) {
                this.currentStep = this.forceNextIndex;
                this.forceNextIndex = null;
            } else {
                this.currentStep += 1;
            }
        }
    }

    static RULES = [{
        name: 'move',
        time: 100,
        buildMemory: () => ({ power: Calc.randRange(0.0005, 0.005) }),
        run: ({ creature, memory }) => {
            Body.applyForce(
                creature.body,
                creature.body.position,
                Vector.rotate(Vector.create(memory.power, 0), creature.direction)
            );
            creature.hunger -= memory.power * 5;
        },
    }, {
        name: 'change direction to new random',
        time: 5,
        run: ({ creature }) => {
            creature.direction = Math.random() * 2 * Math.PI;
        },
    }, {
        name: 'change direction to same random',
        time: 5,
        buildMemory: () => ({ direction: Math.random() * 2 * Math.PI }),
        run: ({ creature, memory }) => {
            creature.direction = memory.direction;
        },
    }, {
        name: 'change direction to food in sight',
        time: 50,
        run: ({ creature, food }) => {
            const foodBodies = Object.values(food).map(f => f.body);
            const pellet = creature.getNearestBodyInSight(foodBodies);
            if (pellet) {
                creature.direction = Vector.angle(creature.body.position, pellet.position);
            }
        },
    }, {
        name: 'change direction to family in sight',
        time: 10,
        notInFirstGeneration: true,
        run: ({ creatures, creature, logging }) => {
            const familyBodies = Object.values(creatures)
                .filter(c => c.id !== creature.id && creature.isFamily(c))
                .map(f => f.body);
            const family = creature.getNearestBodyInSight(familyBodies);
            if (family) {
                creature.direction = Vector.angle(creature.body.position, family.position);
            }
        },
    }, {
        name: 'change direction away from family in sight',
        time: 10,
        notInFirstGeneration: true,
        run: ({ creatures, creature }) => {
            const familyBodies = Object.values(creatures)
                .filter(c => c.id !== creature.id && creature.isFamily(c))
                .map(f => f.body);
            const family = creature.getNearestBodyInSight(familyBodies);
            if (family) {
                creature.direction = Vector.angle(creature.body.position, family.position) - Math.PI;
            }
        },
    }, {
        name: 'change direction to enemy in sight',
        time: 10,
        notInFirstGeneration: true,
        run: ({ creatures, creature, logging }) => {
            const enemyBodies = Object.values(creatures)
                .filter(c => c.id !== creature.id && !creature.isFamily(c))
                .map(f => f.body);
            const enemy = creature.getNearestBodyInSight(enemyBodies);
            if (enemy) {
                creature.direction = Vector.angle(creature.body.position, enemy.position);
            }
        },
    }, {
        name: 'change direction away from enemy in sight',
        time: 10,
        notInFirstGeneration: true,
        run: ({ creatures, creature }) => {
            const enemyBodies = Object.values(creatures)
                .filter(c => c.id !== creature.id && !creature.isFamily(c))
                .map(f => f.body);
            const enemy = creature.getNearestBodyInSight(enemyBodies);
            if (enemy) {
                creature.direction = Vector.angle(creature.body.position, enemy.position) - Math.PI;
            }
        },
    }, {
        name: 'jump if family in sight',
        time: 5,
        notInFirstGeneration: true,
        buildMemory: ({ length }) => ({
            jumpTo: Calc.randInt(0, length),
        }),
        run: ({ creatures, creature, memory }) => {
            const familyBodies = Object.values(creatures)
                .filter(c => c.id !== creature.id && creature.isFamily(c))
                .map(f => f.body);
            const family = creature.getNearestBodyInSight(familyBodies);
            if (family) {
                creature.genes.forceNextIndex = memory.jumpTo;
            }
        },
    }, {
        name: 'jump if enemy in sight',
        time: 5,
        notInFirstGeneration: true,
        buildMemory: ({ length }) => ({
            jumpTo: Calc.randInt(0, length),
        }),
        run: ({ creatures, creature, memory }) => {
            const enemyBodies = Object.values(creatures)
                .filter(c => c.id !== creature.id && !creature.isFamily(c))
                .map(f => f.body);
            const enemy = creature.getNearestBodyInSight(enemyBodies);
            if (enemy) {
                creature.genes.forceNextIndex = memory.jumpTo;
            }
        },
    }, {
        name: 'jump if food in sight',
        time: 5,
        buildMemory: ({ length }) => ({
            jumpTo: Calc.randInt(0, length),
        }),
        run: ({ creature, food, memory }) => {
            const foodBodies = Object.values(food).map(f => f.body);
            const pellet = creature.getNearestBodyInSight(foodBodies);
            if (pellet) {
                creature.genes.forceNextIndex = memory.jumpTo;
            }
        },
    }, {
        name: 'jump if hungry',
        time: 5,
        notInFirstGeneration: true,
        buildMemory: ({ length }) => ({
            hungerThreshold: Math.random(),
            jumpTo: Calc.randInt(0, length),
        }),
        run: ({ creature, memory }) => {
            if (creature.hunger < memory.hungerThreshold) {
                creature.genes.forceNextIndex = memory.jumpTo
            }
        },
    }, {
        name: 'jump if large',
        time: 5,
        notInFirstGeneration: true,
        buildMemory: ({ length }) => ({
            sizeThreshold: Calc.randInt(100, 500),
            jumpTo: Calc.randInt(0, length),
        }),
        run: ({ creature, memory }) => {
            if (creature.mass > memory.sizeThreshold) {
                creature.genes.forceNextIndex = memory.jumpTo
            }
        },
    }, {
        name: 'attack nearest',
        time: 50,
        run: ({ creatures, creature }) => {
            const enemyBodies = Object.values(creatures)
                .filter(c => c.id !== creature.id && !creature.isFamily(c))
                .map(f => f.body);
            const enemyBody = creature.getNearestBodyInAttackRange(enemyBodies);
            if (enemyBody) {
                const enemy = creatures[enemyBody.id];
                creature.laser = {
                    laserBody: Drawer.drawRectangle(creature.body.position, enemyBody.position, 2),
                    enemy: enemy,
                    timer: 25,
                };
                creature.hunger = Math.min(1, creature.hunger + 0.2);
                creature.setMass(creature.mass + 20);
                enemy.hunger -= 0.25;
                enemy.setMass(Math.max(100, enemy.mass - 20));
            } else {
                creature.delayUntilNextMove = 5;
            }
        },
    }, {
        name: 'replicate',
        time: 5,
        buildMemory: ({ length }) => ({
            jumpTo: Calc.randInt(0, length),
        }),
        run: ({ creatures, creature, createCreature, logging }) => {
            if (creature.mass >= 200 && Object.values(creatures).length < Creature.MAX_COUNT) {
                const child = createCreature({ parent: creature });
                if (logging) {
                    const details = (creature.genes.geneticString !== child.genes.geneticString
                        ? `${creature.genes.geneticString} => ${child.genes.geneticString}`
                        : ''
                    );
                    console.log('babies!!!', details);
                };
            }
        },
    }, {
        name: 'wait',
        time: 100,
        notInFirstGeneration: true,
        run: ({ creature }) => {
            // no operation
        },
    }, ].map((g, i) => ({
        index: i,
        codeAsStr: String.fromCharCode(65+i),
        ...g
    }));

    buildGene(index = null, firstGeneration = false) {
        // deep copy gene from template
        if (index === null) {
            if (firstGeneration) {
                const firstGenRules = Genes.RULES.filter(r => !r.notInFirstGeneration);
                index = firstGenRules[Calc.randInt(0, firstGenRules.length)].index;
            } else {
                index = Calc.randInt(0, Genes.RULES.length);
            }
        }
        const gene = Object.assign({ id: Calc.generateId() }, Genes.RULES[index]);
        gene.memory = gene.buildMemory?.({...this, ...this.creature});
        return gene;
    }

   duplicateGene(gene) {
        let newGene = {
            ...this.buildGene(gene.index),
            id: gene.id,
            memory: { ...gene?.memory},
        };
        return newGene;
    }

    genomeSimilarity(otherGenes) {
        const key = [this.geneticString, otherGenes.geneticString].sort().join(' ');
        if (key in Genes.GENE_SIMILARITY_CACHE) {
            return Genes.GENE_SIMILARITY_CACHE[key].value;
        }
        const similarity = StringSimilarity.compareTwoStrings(this.geneticString, otherGenes.geneticString);
        Genes.GENE_SIMILARITY_CACHE.count += 1
        Genes.GENE_SIMILARITY_CACHE[key] = {
            num: Genes.GENE_SIMILARITY_CACHE.count,
            value: similarity
        }
        if (Object.values(Genes.GENE_SIMILARITY_CACHE) === 1000) {
            Object.keys(Genes.GENE_SIMILARITY_CACHE).forEach(key => {
                if (Genes.GENE_SIMILARITY_CACHE[key].num <= 500) {
                    delete Genes.GENE_SIMILARITY_CACHE[key];
                }
                Genes.GENE_SIMILARITY_CACHE[key].num -= 500
            });
            Genes.GENE_SIMILARITY_CACHE.count = 500;
        }
        return similarity;
    }

    evolveGenes(parent) {
        let genes = parent.genes.dna.map(gene => this.duplicateGene(gene))
        if (Math.random() > this.creature.traits.mutationRate) {
            // change nothing
            return genes;
        }
        this.creature.mutations += 1;
        for (let gene of genes) {
            // record all jumps
            if (gene.memory?.jumpTo != null) {
                gene.memory.jumpToId = genes[gene.memory.jumpTo].id;
            }
        }
        const mutationTypes = [{
            name: 'duplicate gene segment',
            weight: 1, 
            requirement: () => genes.length < Genes.MAX_LENGTH,
            runMutation: () => {
                let segmentSize = Calc.randInt(1, 10);
                let segmentLocation = Calc.randInt(0, genes.length);
                let insertionLocation = Calc.randInt(0, genes.length);
                let segment = genes.slice(segmentLocation, segmentLocation + segmentSize);
                let copiedSegment = segment.map(gene => this.duplicateGene(gene));
                genes.splice(insertionLocation, 0, ...copiedSegment);
            }
        }, {
            name: 'random gene segment insertion',
            weight: 5, 
            requirement: () => genes.length < Genes.MAX_LENGTH,
            runMutation: () => {
                const insertionLocation = Calc.randInt(0, genes.length);
                let randomSegment = [this.buildGene()];
                while (Math.random() < 0.75) {
                    randomSegment.push(this.buildGene());
                }
                genes.splice(insertionLocation, 0, ...randomSegment);
            }
        }, {
            name: 'random gene segment deletion',
            weight: 5, 
            requirement: () => genes.length > Genes.MIN_LENGTH + 10,
            runMutation: () => {
                const deletionLocation = Calc.randInt(0, genes.length);
                const deletionLength = Calc.randInt(1, 10);
                genes.splice(deletionLocation, deletionLength);
            }
        }, {
            name: 'random gene memory mutation',
            weight: 5, 
            requirement: () => true,
            runMutation: () => {
                while (Math.random() < 0.75) {
                    const randomLocation = Calc.randInt(0, genes.length);
                    const gene = genes[randomLocation];
                    genes[randomLocation] = this.buildGene(gene.index);
                }
            }
        }, {
            name: 'random trait modification',
            weight: 5, 
            requirement: () => true,
            runMutation: () => {
                let newTraits = {...this.creature.traits};
                const traitMutations = [() => {
                    const attackRangePoints = Calc.randInt(0, 175);
                    newTraits.vision = 350 - attackRangePoints;
                    newTraits.attackRange = attackRangePoints;
                }, () => {
                    const rand = Math.random();
                    newTraits.familyThreshold = rand;
                    newTraits.mutationRate = rand;
                }];
                traitMutations[Calc.randInt(0, traitMutations.length)]();
                this.creature.traits = newTraits;
            }
        }];
        const validMutationTypes = mutationTypes.filter(m => m.requirement());
        const weightTotal = validMutationTypes.reduce((t, c) => t + c.weight, 0);
        const randValue = Math.random() * weightTotal;
        let sum = 0;
        for (let mutation of validMutationTypes) {
            sum += mutation.weight;
            if (sum > randValue) {
                mutation.runMutation();
                break;
            }
        }
        for (let gene of genes) {
            // repair all jumps
            if (gene.memory?.jumpTo != null) {
                let newIndex = genes.findIndex(g => g.id === gene.memory.jumpToId);
                if (newIndex === -1) {
                    newIndex = Calc.randInt(0, genes.length);
                }
                gene.memory.jumpTo = newIndex;
            }
        }
        return genes;
    }
}