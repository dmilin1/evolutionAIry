import Matter, { Engine, Render, Runner, Events, Composite, Composites, MouseConstraint, Mouse, Bodies } from "matter-js"
import Updater from "./Updater";

export default function App() {

    // create engine
    let engine = Engine.create({
        framerate: 30,
        gravity: {
            x: 0,
            y: 0,
            scale: 0.001,
        }
    });
    engine.timing.timeScale = 1;
    let world = engine.world;

    // create renderer
    let render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: window.innerWidth,
            height: window.innerHeight,
            wireframes: false,
            showPerformance: true,
        }
    });

    Render.run(render);

    let runner = {
        frameRequestId: 0,
    }

    // add mouse control
    let mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.02,
                render: {
                    visible: true
                }
            }
        });

    Composite.add(world, mouseConstraint);

    // keep the mouse in sync with rendering
    render.mouse = mouse;

    let system = {
        engine: engine,
        runner: runner,
        render: render,
        canvas: render.canvas,
        mouseConstraint: mouseConstraint,
    };

    let updater = new Updater(system);

    setInterval(() => {
        Engine.update(engine, 1000 / 60);
        runner.frameRequestId += 1;
        updater.tick();
    }, 1000 / 240);

    Events.on(runner, 'tick', () => updater.tick())
};