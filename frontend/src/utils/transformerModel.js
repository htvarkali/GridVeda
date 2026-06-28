import * as THREE from 'three';

// ============================================================
// Component Categories
// ============================================================
export const componentCategories = [
    { name: 'Main Tank Body', key: 'tankBody', color: '#3a3a3a' },
    { name: 'Tank Lid Assembly', key: 'tankLid', color: '#4a4a4a' },
    { name: 'Tank Reinforcements', key: 'tankReinforcements', color: '#5a5a5a' },
    { name: 'Radiator Bank A', key: 'radiatorBankA', color: '#505050' },
    { name: 'Radiator Bank B', key: 'radiatorBankB', color: '#555555' },
    { name: 'Radiator Cooling Fins', key: 'radiatorFins', color: '#606060' },
    { name: 'Radiator Headers', key: 'radiatorHeaders', color: '#707070' },
    { name: 'Radiator Flanges', key: 'radiatorFlanges', color: '#b5a642' },
    { name: 'Radiator Valves', key: 'radiatorValves', color: '#c0a040' },
    { name: 'Oil Circulation Pipes', key: 'oilPipes', color: '#aaaaaa' },
    { name: 'Oil Pumps', key: 'oilPumps', color: '#808080' },
    { name: 'Cooling Fans', key: 'coolingFans', color: '#888888' },
    { name: 'Fan Motors', key: 'fanMotors', color: '#707070' },
    { name: 'Fan Mounting Brackets', key: 'fanBrackets', color: '#606060' },
    { name: 'HV Bushings', key: 'hvBushings', color: '#8B6F47' },
    { name: 'Bushing Porcelain', key: 'bushingPorcelain', color: '#9B7F57' },
    { name: 'Bushing Terminals', key: 'bushingTerminals', color: '#cccccc' },
    { name: 'LV Bushings', key: 'lvBushings', color: '#7a5f3f' },
    { name: 'Core Laminations', key: 'coreLaminations', color: '#787878' },
    { name: 'Core Yokes', key: 'coreYokes', color: '#888888' },
    { name: 'Core Clamping', key: 'coreClamps', color: '#909090' },
    { name: 'Primary Windings', key: 'primaryWindings', color: '#d4a574' },
    { name: 'Secondary Windings', key: 'secondaryWindings', color: '#c49464' },
    { name: 'Winding Insulation', key: 'windingInsulation', color: '#daa520' },
    { name: 'Conservator Tank', key: 'conservator', color: '#404040' },
    { name: 'Conservator Fittings', key: 'conservatorFittings', color: '#505050' },
    { name: 'Buchholz Relay', key: 'buchholzRelay', color: '#606060' },
    { name: 'Pressure Relief Device', key: 'pressureRelief', color: '#707070' },
    { name: 'Breather Assembly', key: 'breather', color: '#808080' },
    { name: 'Silica Gel Container', key: 'silicaGel', color: '#88ccff' },
    { name: 'Oil Level Gauge', key: 'oilGauge', color: '#909090' },
    { name: 'Temperature Gauge', key: 'tempGauge', color: '#a0a0a0' },
    { name: 'Winding Temperature Indicator', key: 'wti', color: '#b0b0b0' },
    { name: 'Tap Changer', key: 'tapChanger', color: '#555555' },
    { name: 'Tap Changer Handle', key: 'tapHandle', color: '#b5a642' },
    { name: 'Terminal Boxes HV', key: 'terminalBoxHV', color: '#454545' },
    { name: 'Terminal Boxes LV', key: 'terminalBoxLV', color: '#3a3a3a' },
    { name: 'Cable Glands', key: 'cableGlands', color: '#606060' },
    { name: 'Nameplate', key: 'nameplate', color: '#dddddd' },
    { name: 'Lifting Lugs', key: 'liftingLugs', color: '#909090' },
    { name: 'Grounding Terminals', key: 'groundingTerminals', color: '#b5a642' },
    { name: 'Drain Valve', key: 'drainValve', color: '#707070' },
    { name: 'Filter Valve', key: 'filterValve', color: '#808080' },
    { name: 'Mounting Base', key: 'mountingBase', color: '#2a2a2a' },
    { name: 'Skid Rails', key: 'skidRails', color: '#333333' },
    { name: 'Wheels & Jacking Points', key: 'wheels', color: '#404040' }
];

// ============================================================
// Create Industrial Transformer
// ============================================================
export function createIndustrialTransformer(transformerGroup, components) {
    // Shared materials
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7, roughness: 0.4 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, metalness: 0.8, roughness: 0.3 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.9, roughness: 0.2 });
    const copperMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, metalness: 0.9, roughness: 0.2 });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x787878, metalness: 0.6, roughness: 0.5 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xb5a642, metalness: 0.8, roughness: 0.3 });
    const radiatorMat = new THREE.MeshStandardMaterial({ color: 0x505050, metalness: 0.7, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.4 });

    // --------------------------------------------------------
    // Main Tank Assembly
    // --------------------------------------------------------

    // Main tank body
    const tankBodyGroup = new THREE.Group();
    const tankGeo = new THREE.BoxGeometry(2.6, 2.4, 1.7);
    const tankMesh = new THREE.Mesh(tankGeo, tankMat);
    tankMesh.position.set(0, 1.2, 0);
    tankBodyGroup.add(tankMesh);
    transformerGroup.add(tankBodyGroup);
    components.tankBody = tankBodyGroup;

    // Tank reinforcement corners
    const tankReinforcementsGroup = new THREE.Group();
    const cornerPositions = [
        [-1.3, 1.2, -0.85],
        [1.3, 1.2, -0.85],
        [-1.3, 1.2, 0.85],
        [1.3, 1.2, 0.85]
    ];
    cornerPositions.forEach(pos => {
        const cornerGeo = new THREE.BoxGeometry(0.09, 2.5, 0.09);
        const corner = new THREE.Mesh(cornerGeo, metalMat);
        corner.position.set(pos[0], pos[1], pos[2]);
        tankReinforcementsGroup.add(corner);
    });

    // Horizontal bands (7 front + 7 back)
    for (let i = 0; i < 7; i++) {
        const bandGeoFront = new THREE.BoxGeometry(2.7, 0.06, 0.07);
        const bandFront = new THREE.Mesh(bandGeoFront, metalMat);
        bandFront.position.set(0, 0.35 + i * 0.35, 0.85);
        tankReinforcementsGroup.add(bandFront);

        const bandGeoBack = new THREE.BoxGeometry(2.7, 0.06, 0.07);
        const bandBack = new THREE.Mesh(bandGeoBack, metalMat);
        bandBack.position.set(0, 0.35 + i * 0.35, -0.85);
        tankReinforcementsGroup.add(bandBack);
    }
    transformerGroup.add(tankReinforcementsGroup);
    components.tankReinforcements = tankReinforcementsGroup;

    // Tank lid
    const tankLidGroup = new THREE.Group();
    const lidGeo = new THREE.BoxGeometry(2.7, 0.18, 1.8);
    const lid = new THREE.Mesh(lidGeo, tankMat);
    lid.position.set(0, 2.49, 0);
    tankLidGroup.add(lid);

    // Lid rim
    const rimGeo = new THREE.BoxGeometry(2.75, 0.08, 1.85);
    const rim = new THREE.Mesh(rimGeo, metalMat);
    rim.position.set(0, 2.44, 0);
    tankLidGroup.add(rim);

    // Lid bolts grid
    for (let x = -1.2; x <= 1.2; x += 0.3) {
        for (let z = -0.8; z <= 0.8; z += 0.32) {
            const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.06, 6);
            const bolt = new THREE.Mesh(boltGeo, metalMat);
            bolt.position.set(x, 2.58, z);
            tankLidGroup.add(bolt);
        }
    }
    transformerGroup.add(tankLidGroup);
    components.tankLid = tankLidGroup;

    // --------------------------------------------------------
    // Core & Windings
    // --------------------------------------------------------

    const coreLaminationsGroup = new THREE.Group();
    const coreYokesGroup = new THREE.Group();
    const coreClampsGroup = new THREE.Group();
    const primaryWindingsGroup = new THREE.Group();
    const secondaryWindingsGroup = new THREE.Group();
    const windingInsulationGroup = new THREE.Group();

    for (let leg = -1; leg <= 1; leg++) {
        // Core laminations - 30 per leg
        for (let lam = 0; lam < 30; lam++) {
            const lamGeo = new THREE.BoxGeometry(0.20, 0.06, 0.20);
            const lamMesh = new THREE.Mesh(lamGeo, coreMat);
            lamMesh.position.set(leg * 0.55, 0.25 + lam * 0.065, 0);
            coreLaminationsGroup.add(lamMesh);
        }

        // Top yokes
        if (leg < 1) {
            for (let y = 0; y < 4; y++) {
                const yokeGeo = new THREE.BoxGeometry(0.55, 0.09, 0.20);
                const yoke = new THREE.Mesh(yokeGeo, coreMat);
                yoke.position.set((leg + 0.5) * 0.55, 2.0 + y * 0.04, 0);
                coreYokesGroup.add(yoke);
            }
        }

        // Bottom yokes
        if (leg < 1) {
            for (let y = 0; y < 4; y++) {
                const yokeGeo = new THREE.BoxGeometry(0.55, 0.09, 0.20);
                const yoke = new THREE.Mesh(yokeGeo, coreMat);
                yoke.position.set((leg + 0.5) * 0.55, 0.20 - y * 0.04, 0);
                coreYokesGroup.add(yoke);
            }
        }

        // Core clamps
        for (let clamp = 0; clamp < 3; clamp++) {
            const clampGeo = new THREE.BoxGeometry(0.25, 0.05, 0.25);
            const clampMesh = new THREE.Mesh(clampGeo, metalMat);
            clampMesh.position.set(leg * 0.55, 0.3 + clamp * 0.75, 0);
            coreClampsGroup.add(clampMesh);
        }

        // Primary windings - 10 per leg
        for (let layer = 0; layer < 10; layer++) {
            const priGeo = new THREE.TorusGeometry(0.32 - layer * 0.012, 0.022, 8, 32);
            const priMesh = new THREE.Mesh(priGeo, copperMat);
            priMesh.position.set(leg * 0.55, 0.65 + layer * 0.15, 0);
            priMesh.rotation.x = Math.PI / 2;
            primaryWindingsGroup.add(priMesh);
        }

        // Secondary windings - 10 per leg
        for (let layer = 0; layer < 10; layer++) {
            const secMat = new THREE.MeshStandardMaterial({ color: 0xa86f3f, metalness: 0.9, roughness: 0.2 });
            const secGeo = new THREE.TorusGeometry(0.22 - layer * 0.010, 0.020, 8, 32);
            const secMesh = new THREE.Mesh(secGeo, secMat);
            secMesh.position.set(leg * 0.55, 0.65 + layer * 0.15, 0);
            secMesh.rotation.x = Math.PI / 2;
            secondaryWindingsGroup.add(secMesh);
        }

        // Insulation layers - 18 per leg
        for (let ins = 0; ins < 18; ins++) {
            const insGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.012, 32);
            const insMat = new THREE.MeshStandardMaterial({ color: 0xdaa520, metalness: 0.3, roughness: 0.6 });
            const insMesh = new THREE.Mesh(insGeo, insMat);
            insMesh.position.set(leg * 0.55, 0.35 + ins * 0.10, 0);
            windingInsulationGroup.add(insMesh);
        }
    }

    transformerGroup.add(coreLaminationsGroup);
    components.coreLaminations = coreLaminationsGroup;
    transformerGroup.add(coreYokesGroup);
    components.coreYokes = coreYokesGroup;
    transformerGroup.add(coreClampsGroup);
    components.coreClamps = coreClampsGroup;
    transformerGroup.add(primaryWindingsGroup);
    components.primaryWindings = primaryWindingsGroup;
    transformerGroup.add(secondaryWindingsGroup);
    components.secondaryWindings = secondaryWindingsGroup;
    transformerGroup.add(windingInsulationGroup);
    components.windingInsulation = windingInsulationGroup;

    // --------------------------------------------------------
    // Radiator Banks
    // --------------------------------------------------------

    const radiatorBankAGroup = new THREE.Group();
    const radiatorBankBGroup = new THREE.Group();
    const radiatorFinsGroup = new THREE.Group();
    const radiatorHeadersGroup = new THREE.Group();
    const radiatorFlangesGroup = new THREE.Group();
    const radiatorValvesGroup = new THREE.Group();
    const oilPipesGroup = new THREE.Group();
    const coolingFansGroup = new THREE.Group();
    const fanMotorsGroup = new THREE.Group();
    const fanBracketsGroup = new THREE.Group();

    for (let side = -1; side <= 1; side += 2) {
        for (let bank = 0; bank < 5; bank++) {
            const bankGroup = new THREE.Group();

            // 50 vertical fins
            for (let fin = 0; fin < 50; fin++) {
                const finGeo = new THREE.BoxGeometry(0.10, 2.0, 0.004);
                const finMesh = new THREE.Mesh(finGeo, radiatorMat);
                finMesh.position.set(0, 0, -0.30 + fin * 0.012);
                bankGroup.add(finMesh);
                radiatorFinsGroup.add(finMesh.clone());
            }

            // Top and bottom end caps
            const topCapGeo = new THREE.BoxGeometry(0.10, 0.08, 0.62);
            const topCap = new THREE.Mesh(topCapGeo, metalMat);
            topCap.position.set(0, 1.04, 0);
            bankGroup.add(topCap);
            radiatorHeadersGroup.add(topCap.clone());

            const bottomCapGeo = new THREE.BoxGeometry(0.10, 0.08, 0.62);
            const bottomCap = new THREE.Mesh(bottomCapGeo, metalMat);
            bottomCap.position.set(0, -1.04, 0);
            bankGroup.add(bottomCap);
            radiatorHeadersGroup.add(bottomCap.clone());

            // Side panels
            const sidePanelGeo1 = new THREE.BoxGeometry(0.10, 2.0, 0.015);
            const sidePanel1 = new THREE.Mesh(sidePanelGeo1, radiatorMat);
            sidePanel1.position.set(0, 0, -0.31);
            bankGroup.add(sidePanel1);

            const sidePanelGeo2 = new THREE.BoxGeometry(0.10, 2.0, 0.015);
            const sidePanel2 = new THREE.Mesh(sidePanelGeo2, radiatorMat);
            sidePanel2.position.set(0, 0, 0.31);
            bankGroup.add(sidePanel2);

            // Back panel
            const backPanelGeo = new THREE.BoxGeometry(0.01, 2.16, 0.64);
            const backPanel = new THREE.Mesh(backPanelGeo, radiatorMat);
            backPanel.position.set(-0.05 * side, 0, 0);
            bankGroup.add(backPanel);

            // Top mounting flange
            const topFlangeGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8);
            const topFlange = new THREE.Mesh(topFlangeGeo, brassMat);
            topFlange.position.set(0, 1.10, 0);
            bankGroup.add(topFlange);
            radiatorFlangesGroup.add(topFlange.clone());

            // Bottom mounting flange
            const bottomFlangeGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8);
            const bottomFlange = new THREE.Mesh(bottomFlangeGeo, brassMat);
            bottomFlange.position.set(0, -1.10, 0);
            bankGroup.add(bottomFlange);
            radiatorFlangesGroup.add(bottomFlange.clone());

            // 8 flange bolts per flange (top)
            for (let b = 0; b < 8; b++) {
                const angle = (b / 8) * Math.PI * 2;
                const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8);
                const bolt = new THREE.Mesh(boltGeo, metalMat);
                bolt.position.set(Math.cos(angle) * 0.07, 1.10, Math.sin(angle) * 0.07);
                bankGroup.add(bolt);
            }

            // 8 flange bolts per flange (bottom)
            for (let b = 0; b < 8; b++) {
                const angle = (b / 8) * Math.PI * 2;
                const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8);
                const bolt = new THREE.Mesh(boltGeo, metalMat);
                bolt.position.set(Math.cos(angle) * 0.07, -1.10, Math.sin(angle) * 0.07);
                bankGroup.add(bolt);
            }

            bankGroup.position.set(side * 1.40, 1.2, -0.55 + bank * 0.27);

            if (side === -1) {
                radiatorBankAGroup.add(bankGroup);
            } else {
                radiatorBankBGroup.add(bankGroup);
            }

            // Oil pipes (top and bottom)
            const topPipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.10, 16);
            const topPipe = new THREE.Mesh(topPipeGeo, metalMat);
            topPipe.position.set(side * 1.35, 2.2, -0.55 + bank * 0.27);
            topPipe.rotation.z = Math.PI / 2;
            oilPipesGroup.add(topPipe);

            const bottomPipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.10, 16);
            const bottomPipe = new THREE.Mesh(bottomPipeGeo, metalMat);
            bottomPipe.position.set(side * 1.35, 0.2, -0.55 + bank * 0.27);
            bottomPipe.rotation.z = Math.PI / 2;
            oilPipesGroup.add(bottomPipe);

            // Isolation valve
            const valveGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.10, 16);
            const valve = new THREE.Mesh(valveGeo, brassMat);
            valve.position.set(side * 1.50, 2.2, -0.55 + bank * 0.27);
            valve.rotation.z = Math.PI / 2;
            radiatorValvesGroup.add(valve);

            // Valve handle
            const handleGeo = new THREE.BoxGeometry(0.14, 0.025, 0.025);
            const handle = new THREE.Mesh(handleGeo, brassMat);
            handle.position.set(side * 1.56, 2.2, -0.55 + bank * 0.27);
            radiatorValvesGroup.add(handle);

            // Cooling fans on alternating banks
            if (bank % 2 === 0) {
                // Fan housing
                const housingGeo = new THREE.CylinderGeometry(0.20, 0.22, 0.12, 32);
                const housing = new THREE.Mesh(housingGeo, metalMat);
                housing.position.set(side * 1.65, 1.2, -0.55 + bank * 0.27);
                housing.rotation.z = Math.PI / 2;
                coolingFansGroup.add(housing);

                // 8 grille bars
                for (let g = 0; g < 8; g++) {
                    const barGeo = new THREE.BoxGeometry(0.005, 0.40, 0.02);
                    const bar = new THREE.Mesh(barGeo, metalMat);
                    const barAngle = (g / 8) * Math.PI;
                    bar.position.set(
                        side * 1.72,
                        1.2 + Math.cos(barAngle) * 0.18,
                        -0.55 + bank * 0.27 + Math.sin(barAngle) * 0.18
                    );
                    bar.rotation.x = barAngle;
                    coolingFansGroup.add(bar);
                }

                // 6 fan blades
                for (let bl = 0; bl < 6; bl++) {
                    const bladeGeo = new THREE.BoxGeometry(0.005, 0.15, 0.04);
                    const blade = new THREE.Mesh(bladeGeo, metalMat);
                    const bladeAngle = (bl / 6) * Math.PI * 2;
                    blade.position.set(
                        side * 1.65,
                        1.2 + Math.cos(bladeAngle) * 0.10,
                        -0.55 + bank * 0.27 + Math.sin(bladeAngle) * 0.10
                    );
                    blade.rotation.x = bladeAngle;
                    coolingFansGroup.add(blade);
                }

                // Fan motor
                const motorGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.18, 16);
                const motor = new THREE.Mesh(motorGeo, darkMetalMat);
                motor.position.set(side * 1.78, 1.2, -0.55 + bank * 0.27);
                motor.rotation.z = Math.PI / 2;
                fanMotorsGroup.add(motor);

                // Mounting bracket
                const bracketGeo = new THREE.BoxGeometry(0.04, 0.30, 0.30);
                const bracket = new THREE.Mesh(bracketGeo, metalMat);
                bracket.position.set(side * 1.55, 1.2, -0.55 + bank * 0.27);
                fanBracketsGroup.add(bracket);
            }
        }
    }

    transformerGroup.add(radiatorBankAGroup);
    components.radiatorBankA = radiatorBankAGroup;
    transformerGroup.add(radiatorBankBGroup);
    components.radiatorBankB = radiatorBankBGroup;
    transformerGroup.add(radiatorFinsGroup);
    components.radiatorFins = radiatorFinsGroup;
    transformerGroup.add(radiatorHeadersGroup);
    components.radiatorHeaders = radiatorHeadersGroup;
    transformerGroup.add(radiatorFlangesGroup);
    components.radiatorFlanges = radiatorFlangesGroup;
    transformerGroup.add(radiatorValvesGroup);
    components.radiatorValves = radiatorValvesGroup;
    transformerGroup.add(oilPipesGroup);
    components.oilPipes = oilPipesGroup;
    transformerGroup.add(coolingFansGroup);
    components.coolingFans = coolingFansGroup;
    transformerGroup.add(fanMotorsGroup);
    components.fanMotors = fanMotorsGroup;
    transformerGroup.add(fanBracketsGroup);
    components.fanBrackets = fanBracketsGroup;

    // --------------------------------------------------------
    // Oil Pumps
    // --------------------------------------------------------

    const oilPumpsGroup = new THREE.Group();
    for (let idx = 0; idx < 2; idx++) {
        const pumpX = -0.5 + idx * 1.0;

        // Pump body
        const pumpGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.25, 16);
        const pumpMesh = new THREE.Mesh(pumpGeo, darkMetalMat);
        pumpMesh.position.set(pumpX, 0.35, -0.95);
        oilPumpsGroup.add(pumpMesh);

        // Motor
        const pumpMotorGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.30, 16);
        const pumpMotor = new THREE.Mesh(pumpMotorGeo, metalMat);
        pumpMotor.position.set(pumpX, 0.35, -1.15);
        pumpMotor.rotation.x = Math.PI / 2;
        oilPumpsGroup.add(pumpMotor);

        // Inlet
        const inletGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 16);
        const inlet = new THREE.Mesh(inletGeo, brassMat);
        inlet.position.set(pumpX - 0.10, 0.35, -0.95);
        inlet.rotation.z = Math.PI / 2;
        oilPumpsGroup.add(inlet);

        // Outlet
        const outletGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 16);
        const outlet = new THREE.Mesh(outletGeo, brassMat);
        outlet.position.set(pumpX + 0.10, 0.35, -0.95);
        outlet.rotation.z = Math.PI / 2;
        oilPumpsGroup.add(outlet);
    }
    transformerGroup.add(oilPumpsGroup);
    components.oilPumps = oilPumpsGroup;

    // --------------------------------------------------------
    // HV Bushings
    // --------------------------------------------------------

    const hvBushingsGroup = new THREE.Group();
    const bushingPorcelainGroup = new THREE.Group();
    const bushingTerminalsGroup = new THREE.Group();

    for (let i = -1; i <= 1; i++) {
        const bx = i * 0.60;
        const by = 2.58;
        const bz = 0.55;

        // Base flange
        const flangeGeo = new THREE.CylinderGeometry(0.24, 0.27, 0.14, 32);
        const flange = new THREE.Mesh(flangeGeo, metalMat);
        flange.position.set(bx, by, bz);
        hvBushingsGroup.add(flange);

        // 14 mounting bolts
        for (let b = 0; b < 14; b++) {
            const angle = (b / 14) * Math.PI * 2;
            const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8);
            const bolt = new THREE.Mesh(boltGeo, metalMat);
            bolt.position.set(bx + Math.cos(angle) * 0.22, by, bz + Math.sin(angle) * 0.22);
            hvBushingsGroup.add(bolt);
        }

        // 18 porcelain discs, skirts, and rings
        const porcelainMat = new THREE.MeshStandardMaterial({ color: 0x8B6F47, metalness: 0.3, roughness: 0.6 });
        for (let d = 0; d < 18; d++) {
            // Disc
            const discGeo = new THREE.CylinderGeometry(0.14 - d * 0.003, 0.14 - d * 0.003, 0.04, 32);
            const disc = new THREE.Mesh(discGeo, porcelainMat);
            disc.position.set(bx, by + 0.10 + d * 0.05, bz);
            bushingPorcelainGroup.add(disc);

            // Skirt
            const skirtGeo = new THREE.CylinderGeometry(0.16 - d * 0.003, 0.12 - d * 0.003, 0.02, 32);
            const skirt = new THREE.Mesh(skirtGeo, porcelainMat);
            skirt.position.set(bx, by + 0.08 + d * 0.05, bz);
            bushingPorcelainGroup.add(skirt);

            // Ring
            const ringGeo = new THREE.TorusGeometry(0.14 - d * 0.003, 0.005, 8, 32);
            const ring = new THREE.Mesh(ringGeo, metalMat);
            ring.position.set(bx, by + 0.12 + d * 0.05, bz);
            bushingPorcelainGroup.add(ring);
        }

        // Terminal
        const termGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.60, 16);
        const term = new THREE.Mesh(termGeo, metalMat);
        term.position.set(bx, 3.4, bz);
        bushingTerminalsGroup.add(term);

        // Ball
        const ballGeo = new THREE.SphereGeometry(0.12, 24, 24);
        const ball = new THREE.Mesh(ballGeo, metalMat);
        ball.position.set(bx, 3.8, bz);
        bushingTerminalsGroup.add(ball);

        // Clamp
        const clampGeo = new THREE.TorusGeometry(0.10, 0.028, 12, 24);
        const clampMesh = new THREE.Mesh(clampGeo, metalMat);
        clampMesh.position.set(bx, 3.6, bz);
        bushingTerminalsGroup.add(clampMesh);
    }

    transformerGroup.add(hvBushingsGroup);
    components.hvBushings = hvBushingsGroup;
    transformerGroup.add(bushingPorcelainGroup);
    components.bushingPorcelain = bushingPorcelainGroup;
    transformerGroup.add(bushingTerminalsGroup);
    components.bushingTerminals = bushingTerminalsGroup;

    // --------------------------------------------------------
    // LV Bushings
    // --------------------------------------------------------

    const lvBushingsGroup = new THREE.Group();
    const lvPorcelainMat = new THREE.MeshStandardMaterial({ color: 0x7a5f3f, metalness: 0.3, roughness: 0.6 });

    for (let i = -1; i <= 1; i += 2) {
        const bx = i * 0.85;
        const by = 2.58;
        const bz = -0.55;

        // Base
        const baseGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.10, 32);
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.set(bx, by, bz);
        lvBushingsGroup.add(base);

        // 6 porcelain discs and skirts
        for (let d = 0; d < 6; d++) {
            const discGeo = new THREE.CylinderGeometry(0.10 - d * 0.003, 0.10 - d * 0.003, 0.04, 32);
            const disc = new THREE.Mesh(discGeo, lvPorcelainMat);
            disc.position.set(bx, by + 0.08 + d * 0.06, bz);
            lvBushingsGroup.add(disc);

            const skirtGeo = new THREE.CylinderGeometry(0.12 - d * 0.003, 0.08 - d * 0.003, 0.02, 32);
            const skirt = new THREE.Mesh(skirtGeo, lvPorcelainMat);
            skirt.position.set(bx, by + 0.06 + d * 0.06, bz);
            lvBushingsGroup.add(skirt);
        }

        // Terminal
        const termGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 16);
        const term = new THREE.Mesh(termGeo, metalMat);
        term.position.set(bx, by + 1.1, bz);
        lvBushingsGroup.add(term);
    }

    transformerGroup.add(lvBushingsGroup);
    components.lvBushings = lvBushingsGroup;

    // --------------------------------------------------------
    // Conservator System
    // --------------------------------------------------------

    const conservatorGroup = new THREE.Group();
    const conservatorFittingsGroup = new THREE.Group();

    // Main conservator tank
    const consTankGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.6, 32);
    const consTank = new THREE.Mesh(consTankGeo, tankMat);
    consTank.position.set(-1.0, 3.1, -0.75);
    consTank.rotation.z = Math.PI / 2;
    conservatorGroup.add(consTank);

    // 2 end caps
    const endCapGeo = new THREE.SphereGeometry(0.38);
    const endCap1 = new THREE.Mesh(endCapGeo, tankMat);
    endCap1.position.set(-1.8, 3.1, -0.75);
    endCap1.scale.set(1, 1, 0.5);
    conservatorGroup.add(endCap1);

    const endCap2 = new THREE.Mesh(endCapGeo.clone(), tankMat);
    endCap2.position.set(-0.2, 3.1, -0.75);
    endCap2.scale.set(1, 1, 0.5);
    conservatorGroup.add(endCap2);

    // 4 support brackets
    const bracketPositions = [
        [-1.5, 2.85, -0.75],
        [-0.5, 2.85, -0.75],
        [-1.5, 2.85, -0.55],
        [-0.5, 2.85, -0.55]
    ];
    bracketPositions.forEach(pos => {
        const bracketGeo = new THREE.BoxGeometry(0.10, 0.06, 0.06);
        const bracket = new THREE.Mesh(bracketGeo, metalMat);
        bracket.position.set(pos[0], pos[1], pos[2]);
        conservatorFittingsGroup.add(bracket);
    });

    // Connecting pipe
    const connPipeGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.7, 16);
    const connPipe = new THREE.Mesh(connPipeGeo, metalMat);
    connPipe.position.set(-1.0, 2.75, -0.75);
    conservatorFittingsGroup.add(connPipe);

    transformerGroup.add(conservatorGroup);
    components.conservator = conservatorGroup;
    transformerGroup.add(conservatorFittingsGroup);
    components.conservatorFittings = conservatorFittingsGroup;

    // --------------------------------------------------------
    // Buchholz Relay
    // --------------------------------------------------------

    const buchholzGroup = new THREE.Group();

    // Relay body
    const relayGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.35, 16);
    const relay = new THREE.Mesh(relayGeo, metalMat);
    relay.position.set(-0.6, 2.85, -0.75);
    relay.rotation.z = Math.PI / 2;
    buchholzGroup.add(relay);

    // Glass window
    const glassGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 16);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(-0.6, 2.85, -0.58);
    buchholzGroup.add(glass);

    // 2 connection flanges
    const flange1Geo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16);
    const flange1 = new THREE.Mesh(flange1Geo, metalMat);
    flange1.position.set(-0.42, 2.85, -0.75);
    flange1.rotation.z = Math.PI / 2;
    buchholzGroup.add(flange1);

    const flange2Geo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16);
    const flange2 = new THREE.Mesh(flange2Geo, metalMat);
    flange2.position.set(-0.78, 2.85, -0.75);
    flange2.rotation.z = Math.PI / 2;
    buchholzGroup.add(flange2);

    transformerGroup.add(buchholzGroup);
    components.buchholzRelay = buchholzGroup;

    // --------------------------------------------------------
    // Pressure Relief Device
    // --------------------------------------------------------

    const pressureReliefGroup = new THREE.Group();

    // Body
    const prBodyGeo = new THREE.CylinderGeometry(0.10, 0.12, 0.18, 16);
    const prBody = new THREE.Mesh(prBodyGeo, metalMat);
    prBody.position.set(0.7, 2.67, 0.88);
    pressureReliefGroup.add(prBody);

    // Top
    const prTopGeo = new THREE.CylinderGeometry(0.08, 0.10, 0.12, 16);
    const prTop = new THREE.Mesh(prTopGeo, brassMat);
    prTop.position.set(0.7, 2.80, 0.88);
    pressureReliefGroup.add(prTop);

    // Spring
    const springGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.10, 16);
    const spring = new THREE.Mesh(springGeo, metalMat);
    spring.position.set(0.7, 2.90, 0.88);
    pressureReliefGroup.add(spring);

    transformerGroup.add(pressureReliefGroup);
    components.pressureRelief = pressureReliefGroup;

    // --------------------------------------------------------
    // Breather & Silica Gel
    // --------------------------------------------------------

    const breatherGroup = new THREE.Group();
    const silicaGelGroup = new THREE.Group();

    // Breather body
    const breathGeo = new THREE.CylinderGeometry(0.12, 0.10, 0.30, 16);
    const breathMesh = new THREE.Mesh(breathGeo, metalMat);
    breathMesh.position.set(-1.75, 3.50, -0.75);
    breatherGroup.add(breathMesh);

    // Glass container
    const glassContGeo = new THREE.SphereGeometry(0.16);
    const glassCont = new THREE.Mesh(glassContGeo, glassMat);
    glassCont.position.set(-1.75, 3.30, -0.75);
    breatherGroup.add(glassCont);

    // Silica granules
    const silicaGeo = new THREE.SphereGeometry(0.12);
    const silicaMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, metalness: 0.1, roughness: 0.8 });
    const silica = new THREE.Mesh(silicaGeo, silicaMat);
    silica.position.set(-1.75, 3.26, -0.75);
    silicaGelGroup.add(silica);

    transformerGroup.add(breatherGroup);
    components.breather = breatherGroup;
    transformerGroup.add(silicaGelGroup);
    components.silicaGel = silicaGelGroup;

    // --------------------------------------------------------
    // Gauges
    // --------------------------------------------------------

    const oilGaugeGroup = new THREE.Group();
    const tempGaugeGroup = new THREE.Group();
    const wtiGroup = new THREE.Group();

    // Oil level gauge body
    const oilGaugeBodyGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.50, 16);
    const oilGaugeBody = new THREE.Mesh(oilGaugeBodyGeo, metalMat);
    oilGaugeBody.position.set(1.25, 1.9, 0.88);
    oilGaugeGroup.add(oilGaugeBody);

    // Oil gauge glass
    const oilGaugeGlassGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.45, 16);
    const oilGaugeGlass = new THREE.Mesh(oilGaugeGlassGeo, glassMat);
    oilGaugeGlass.position.set(1.25, 1.9, 0.88);
    oilGaugeGroup.add(oilGaugeGlass);

    // Float
    const floatGeo = new THREE.SphereGeometry(0.06);
    const floatMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const floatMesh = new THREE.Mesh(floatGeo, floatMat);
    floatMesh.position.set(1.25, 1.9, 0.88);
    oilGaugeGroup.add(floatMesh);

    transformerGroup.add(oilGaugeGroup);
    components.oilGauge = oilGaugeGroup;

    // Temperature gauge
    const tempGaugeBodyGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.08, 32);
    const tempGaugeBody = new THREE.Mesh(tempGaugeBodyGeo, metalMat);
    tempGaugeBody.position.set(-0.7, 2.62, 0.88);
    tempGaugeGroup.add(tempGaugeBody);

    // Dial
    const dialGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 32);
    const dialMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const dial = new THREE.Mesh(dialGeo, dialMat);
    dial.position.set(-0.7, 2.66, 0.88);
    tempGaugeGroup.add(dial);

    transformerGroup.add(tempGaugeGroup);
    components.tempGauge = tempGaugeGroup;

    // Winding Temperature Indicator (WTI)
    const wtiBodyGeo = new THREE.BoxGeometry(0.22, 0.28, 0.12);
    const wtiBody = new THREE.Mesh(wtiBodyGeo, metalMat);
    wtiBody.position.set(0, 2.62, 0.90);
    wtiGroup.add(wtiBody);

    // WTI display
    const wtiDisplayGeo = new THREE.BoxGeometry(0.18, 0.22, 0.02);
    const wtiDisplayMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const wtiDisplay = new THREE.Mesh(wtiDisplayGeo, wtiDisplayMat);
    wtiDisplay.position.set(0, 2.62, 0.97);
    wtiGroup.add(wtiDisplay);

    transformerGroup.add(wtiGroup);
    components.wti = wtiGroup;

    // --------------------------------------------------------
    // Tap Changer
    // --------------------------------------------------------

    const tapChangerGroup = new THREE.Group();
    const tapHandleGroup = new THREE.Group();

    // Body
    const tapBodyGeo = new THREE.BoxGeometry(0.40, 0.60, 0.35);
    const tapBody = new THREE.Mesh(tapBodyGeo, tankMat);
    tapBody.position.set(1.43, 1.4, -0.15);
    tapChangerGroup.add(tapBody);

    // 4 cover bolts
    const tapBoltPositions = [
        [1.25, 1.65, -0.15],
        [1.61, 1.65, -0.15],
        [1.25, 1.15, -0.15],
        [1.61, 1.15, -0.15]
    ];
    tapBoltPositions.forEach(pos => {
        const boltGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.04, 8);
        const bolt = new THREE.Mesh(boltGeo, metalMat);
        bolt.position.set(pos[0], pos[1], pos[2]);
        tapChangerGroup.add(bolt);
    });

    transformerGroup.add(tapChangerGroup);
    components.tapChanger = tapChangerGroup;

    // Tap changer handle
    const handleCylGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.10, 16);
    const handleCyl = new THREE.Mesh(handleCylGeo, brassMat);
    handleCyl.position.set(1.68, 1.4, -0.15);
    handleCyl.rotation.z = Math.PI / 2;
    tapHandleGroup.add(handleCyl);

    // Lever
    const leverGeo = new THREE.BoxGeometry(0.15, 0.04, 0.04);
    const lever = new THREE.Mesh(leverGeo, brassMat);
    lever.position.set(1.75, 1.4, -0.15);
    lever.rotation.z = Math.PI / 6;
    tapHandleGroup.add(lever);

    transformerGroup.add(tapHandleGroup);
    components.tapHandle = tapHandleGroup;

    // --------------------------------------------------------
    // Terminal Boxes
    // --------------------------------------------------------

    const terminalBoxHVGroup = new THREE.Group();
    const terminalBoxLVGroup = new THREE.Group();
    const cableGlandsGroup = new THREE.Group();

    // HV terminal box
    const hvBoxGeo = new THREE.BoxGeometry(0.50, 0.40, 0.32);
    const hvBox = new THREE.Mesh(hvBoxGeo, tankMat);
    hvBox.position.set(1.0, 0.7, 0.91);
    terminalBoxHVGroup.add(hvBox);

    // HV box bolts
    const hvBoltPositions = [
        [0.78, 0.88, 1.08],
        [1.22, 0.88, 1.08],
        [0.78, 0.52, 1.08],
        [1.22, 0.52, 1.08]
    ];
    hvBoltPositions.forEach(pos => {
        const boltGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.04, 8);
        const bolt = new THREE.Mesh(boltGeo, metalMat);
        bolt.position.set(pos[0], pos[1], pos[2]);
        terminalBoxHVGroup.add(bolt);
    });

    transformerGroup.add(terminalBoxHVGroup);
    components.terminalBoxHV = terminalBoxHVGroup;

    // LV terminal box
    const lvBoxGeo = new THREE.BoxGeometry(0.55, 0.45, 0.35);
    const lvBox = new THREE.Mesh(lvBoxGeo, tankMat);
    lvBox.position.set(-1.0, 0.7, 0.93);
    terminalBoxLVGroup.add(lvBox);

    // LV box bolts
    const lvBoltPositions = [
        [-1.25, 0.90, 1.11],
        [-0.75, 0.90, 1.11],
        [-1.25, 0.50, 1.11],
        [-0.75, 0.50, 1.11]
    ];
    lvBoltPositions.forEach(pos => {
        const boltGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.04, 8);
        const bolt = new THREE.Mesh(boltGeo, metalMat);
        bolt.position.set(pos[0], pos[1], pos[2]);
        terminalBoxLVGroup.add(bolt);
    });

    transformerGroup.add(terminalBoxLVGroup);
    components.terminalBoxLV = terminalBoxLVGroup;

    // 6 cable glands (3 per terminal box)
    const glandPositions = [
        [0.85, 0.55, 1.08],
        [1.00, 0.55, 1.08],
        [1.15, 0.55, 1.08],
        [-1.15, 0.55, 1.11],
        [-1.00, 0.55, 1.11],
        [-0.85, 0.55, 1.11]
    ];
    glandPositions.forEach(pos => {
        const glandGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.10, 16);
        const gland = new THREE.Mesh(glandGeo, brassMat);
        gland.position.set(pos[0], pos[1], pos[2]);
        cableGlandsGroup.add(gland);
    });

    transformerGroup.add(cableGlandsGroup);
    components.cableGlands = cableGlandsGroup;

    // --------------------------------------------------------
    // Nameplate
    // --------------------------------------------------------

    const nameplateGroup = new THREE.Group();

    // Plate
    const plateGeo = new THREE.BoxGeometry(0.65, 0.50, 0.025);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.3 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 1.5, 0.88);
    nameplateGroup.add(plate);

    // 4 rivets
    const rivetPositions = [
        [-0.28, 1.72, 0.90],
        [0.28, 1.72, 0.90],
        [-0.28, 1.28, 0.90],
        [0.28, 1.28, 0.90]
    ];
    rivetPositions.forEach(pos => {
        const rivetGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.030, 8);
        const rivet = new THREE.Mesh(rivetGeo, metalMat);
        rivet.position.set(pos[0], pos[1], pos[2]);
        nameplateGroup.add(rivet);
    });

    transformerGroup.add(nameplateGroup);
    components.nameplate = nameplateGroup;

    // --------------------------------------------------------
    // Lifting Lugs
    // --------------------------------------------------------

    const liftingLugsGroup = new THREE.Group();

    const lugCorners = [
        [-1.2, 2.58, -0.75],
        [1.2, 2.58, -0.75],
        [-1.2, 2.58, 0.75],
        [1.2, 2.58, 0.75]
    ];
    lugCorners.forEach(pos => {
        // Lug ring
        const ringGeo = new THREE.TorusGeometry(0.16, 0.050, 16, 32);
        const ring = new THREE.Mesh(ringGeo, metalMat);
        ring.position.set(pos[0], pos[1], pos[2]);
        ring.rotation.x = Math.PI / 2;
        liftingLugsGroup.add(ring);

        // Backing plate
        const backPlateGeo = new THREE.BoxGeometry(0.18, 0.10, 0.18);
        const backPlate = new THREE.Mesh(backPlateGeo, metalMat);
        backPlate.position.set(pos[0], pos[1] - 0.10, pos[2]);
        liftingLugsGroup.add(backPlate);

        // 4 bolts per lug
        const boltOffsets = [
            [-0.06, -0.06],
            [0.06, -0.06],
            [-0.06, 0.06],
            [0.06, 0.06]
        ];
        boltOffsets.forEach(off => {
            const boltGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8);
            const bolt = new THREE.Mesh(boltGeo, metalMat);
            bolt.position.set(pos[0] + off[0], pos[1] - 0.10, pos[2] + off[1]);
            liftingLugsGroup.add(bolt);
        });
    });

    transformerGroup.add(liftingLugsGroup);
    components.liftingLugs = liftingLugsGroup;

    // --------------------------------------------------------
    // Grounding Terminals
    // --------------------------------------------------------

    const groundingTerminalsGroup = new THREE.Group();

    const groundPositions = [
        [-1.30, 0.5, 0.88],
        [0, 0.5, 0.88],
        [1.30, 0.5, 0.88]
    ];
    groundPositions.forEach(pos => {
        // Terminal body
        const termBodyGeo = new THREE.BoxGeometry(0.10, 0.14, 0.05);
        const termBody = new THREE.Mesh(termBodyGeo, brassMat);
        termBody.position.set(pos[0], pos[1], pos[2]);
        groundingTerminalsGroup.add(termBody);

        // Ground symbol
        const symbolGeo = new THREE.BoxGeometry(0.12, 0.02, 0.02);
        const symbol = new THREE.Mesh(symbolGeo, brassMat);
        symbol.position.set(pos[0], pos[1] - 0.10, pos[2]);
        groundingTerminalsGroup.add(symbol);
    });

    transformerGroup.add(groundingTerminalsGroup);
    components.groundingTerminals = groundingTerminalsGroup;

    // --------------------------------------------------------
    // Drain & Filter Valves
    // --------------------------------------------------------

    const drainValveGroup = new THREE.Group();
    const filterValveGroup = new THREE.Group();

    // Drain valve
    const drainGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16);
    const drainMesh = new THREE.Mesh(drainGeo, metalMat);
    drainMesh.position.set(0.6, 0.15, -0.88);
    drainValveGroup.add(drainMesh);

    transformerGroup.add(drainValveGroup);
    components.drainValve = drainValveGroup;

    // Filter valve
    const filterGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.14, 16);
    const filterMesh = new THREE.Mesh(filterGeo, metalMat);
    filterMesh.position.set(-0.6, 0.15, -0.88);
    filterValveGroup.add(filterMesh);

    transformerGroup.add(filterValveGroup);
    components.filterValve = filterValveGroup;

    // --------------------------------------------------------
    // Base & Skid
    // --------------------------------------------------------

    const mountingBaseGroup = new THREE.Group();
    const skidRailsGroup = new THREE.Group();
    const wheelsGroup = new THREE.Group();

    // Base plate
    const baseGeo = new THREE.BoxGeometry(3.0, 0.30, 1.9);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.3 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, 0.15, 0);
    mountingBaseGroup.add(baseMesh);

    // 5 ribs
    for (let r = 0; r < 5; r++) {
        const ribGeo = new THREE.BoxGeometry(0.08, 0.28, 1.9);
        const rib = new THREE.Mesh(ribGeo, baseMat);
        rib.position.set(-1.2 + r * 0.6, 0.15, 0);
        mountingBaseGroup.add(rib);
    }

    transformerGroup.add(mountingBaseGroup);
    components.mountingBase = mountingBaseGroup;

    // 2 skid rails
    const skidRail1Geo = new THREE.BoxGeometry(3.2, 0.20, 0.20);
    const skidRail1 = new THREE.Mesh(skidRail1Geo, darkMetalMat);
    skidRail1.position.set(0, -0.05, 0.75);
    skidRailsGroup.add(skidRail1);

    const skidRail2Geo = new THREE.BoxGeometry(3.2, 0.20, 0.20);
    const skidRail2 = new THREE.Mesh(skidRail2Geo, darkMetalMat);
    skidRail2.position.set(0, -0.05, -0.75);
    skidRailsGroup.add(skidRail2);

    // 3 cross braces
    for (let cb = 0; cb < 3; cb++) {
        const braceGeo = new THREE.BoxGeometry(0.15, 0.15, 1.6);
        const brace = new THREE.Mesh(braceGeo, darkMetalMat);
        brace.position.set(-1.2 + cb * 1.2, -0.05, 0);
        skidRailsGroup.add(brace);
    }

    transformerGroup.add(skidRailsGroup);
    components.skidRails = skidRailsGroup;

    // 4 wheels with hubs and jacking points
    const wheelPositions = [
        [-1.4, -0.15, 0.75],
        [1.4, -0.15, 0.75],
        [-1.4, -0.15, -0.75],
        [1.4, -0.15, -0.75]
    ];
    wheelPositions.forEach(pos => {
        // Wheel
        const wheelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.10, 32);
        const wheel = new THREE.Mesh(wheelGeo, darkMetalMat);
        wheel.position.set(pos[0], pos[1], pos[2]);
        wheel.rotation.x = Math.PI / 2;
        wheelsGroup.add(wheel);

        // Hub
        const hubGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16);
        const hub = new THREE.Mesh(hubGeo, metalMat);
        hub.position.set(pos[0], pos[1], pos[2]);
        hub.rotation.x = Math.PI / 2;
        wheelsGroup.add(hub);

        // Jacking point
        const jackGeo = new THREE.BoxGeometry(0.15, 0.08, 0.15);
        const jack = new THREE.Mesh(jackGeo, metalMat);
        jack.position.set(pos[0], pos[1] + 0.08, pos[2]);
        wheelsGroup.add(jack);
    });

    transformerGroup.add(wheelsGroup);
    components.wheels = wheelsGroup;
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Highlight a specific component by key.
 * Uses teal (0x0cc0a0) for normal highlight, red (0xff0000) for failed.
 */
export function highlightComponent(components, key, failedComponents) {
    if (!components[key]) return;

    const color = failedComponents.has(key) ? 0xff0000 : 0x0cc0a0;
    const intensity = failedComponents.has(key) ? 1.0 : 0.8;

    components[key].traverse((child) => {
        if (child.isMesh) {
            if (!child.material._emissiveCloned) {
                child.material = child.material.clone();
                child.material._emissiveCloned = true;
            }
            child.material.emissive = new THREE.Color(color);
            child.material.emissiveIntensity = intensity;
        }
    });
}

/**
 * Reset all highlights on the transformer, preserving red for failed components.
 */
export function resetAllHighlights(transformerGroup, components, failedComponents) {
    transformerGroup.traverse((child) => {
        if (child.isMesh) {
            // Clone material on first highlight pass so shared materials don't conflict
            if (!child.material._emissiveCloned) {
                child.material = child.material.clone();
                child.material._emissiveCloned = true;
            }

            let isFailed = false;
            for (const key of failedComponents) {
                if (components[key] && isChildOfGroup(child, components[key])) {
                    isFailed = true;
                    break;
                }
            }
            if (isFailed) {
                child.material.emissive = new THREE.Color(0xff0000);
                child.material.emissiveIntensity = 1.0;
            } else {
                child.material.emissive = new THREE.Color(0x000000);
                child.material.emissiveIntensity = 0;
            }
        }
    });
}

/**
 * Check if a child object is a descendant of a given group.
 */
export function isChildOfGroup(child, group) {
    let current = child.parent;
    while (current) {
        if (current === group) return true;
        current = current.parent;
    }
    return false;
}

/**
 * Set view mode: 'wireframe' or 'solid'.
 */
export function setViewMode(transformerGroup, mode) {
    const isWireframe = (mode === 'wireframe');
    transformerGroup.traverse((child) => {
        if (child.isMesh) {
            child.material.wireframe = isWireframe;
        }
    });
}

/**
 * Toggle X-ray mode on/off.
 * Returns the new x-ray state (boolean).
 */
export function toggleXRay(transformerGroup) {
    let xrayState = false;
    transformerGroup.traverse((child) => {
        if (child.isMesh) {
            if (!child.material.transparent) {
                child.material.transparent = true;
                child.material.opacity = 0.3;
                child.material.side = THREE.DoubleSide;
                xrayState = true;
            } else {
                child.material.transparent = false;
                child.material.opacity = 1.0;
                child.material.side = THREE.FrontSide;
                xrayState = false;
            }
        }
    });
    return xrayState;
}

/**
 * Setup mouse/touch controls for the transformer viewer.
 * Returns a cleanup function to remove event listeners.
 */
export function setupControls(canvas, transformerGroup, camera) {
    const initialDistance = camera.position.length();
    let isDragging = false;
    let isPanning = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => {
        if (e.button === 0) {
            isDragging = true;
        } else if (e.button === 2) {
            isPanning = true;
        }
        previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        if (isDragging) {
            transformerGroup.rotation.y += deltaX * 0.01;
            transformerGroup.rotation.x += deltaY * 0.01;
        }

        if (isPanning) {
            camera.position.x -= deltaX * 0.02;
            camera.position.y += deltaY * 0.02;
        }

        previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
        isDragging = false;
        isPanning = false;
    };

    const onWheel = (e) => {
        e.preventDefault();
        const direction = e.deltaY > 0 ? 1 : -1;
        const distance = camera.position.length();
        const newDistance = Math.max(5, Math.min(initialDistance, distance + direction * 1.0));
        camera.position.normalize().multiplyScalar(newDistance);
    };

    const onContextMenu = (e) => {
        e.preventDefault();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    // Return cleanup function
    return () => {
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('contextmenu', onContextMenu);
    };
}

/**
 * Reset camera to default position and clear transformer rotation.
 */
export function resetCamera(camera, transformerGroup) {
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 1.5, 0);
    transformerGroup.rotation.set(0, 0, 0);
}
